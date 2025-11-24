import gpxpy
import fitdecode
import xmltodict

from fastapi import UploadFile
from backend.models.track import Track, TrackSegment, TrackPoint


# Main dispatcher
async def load_track(file: UploadFile) -> Track:
    """
    Detects a file type and parses it: GPX / FIT / TCX.
    Returns a Track object.
    """
    content = await file.read()
    filename = file.filename.lower()

    if filename.endswith(".gpx"):
        return load_gpx(content)
    elif filename.endswith(".fit"):
        return load_fit(content)
    elif filename.endswith(".tcx"):
        return load_tcx(content)
    else:
        raise ValueError("Unsupported format: " + filename)


# GPX
def load_gpx(content: bytes) -> Track:
    gpx = gpxpy.parse(content.decode("utf-8"))
    segments = []

    for trk in gpx.tracks:
        for seg in trk.segments:
            seg_points: list[TrackPoint] = []

            for p in seg.points:
                t = p.time
                hr = _extract_gpx_extension(p.extensions, "hr")
                cad = _extract_gpx_extension(p.extensions, "cad")
                power = _extract_gpx_extension(p.extensions, "power")

                seg_points.append(
                    TrackPoint(
                        lat=p.latitude,
                        lon=p.longitude,
                        ele=p.elevation,
                        time=t,
                        hr=hr,
                        cadence=cad,
                        power=power
                    )
                )

            segments.append(TrackSegment(points=seg_points))

    return Track(
        segments=segments,
        metadata={
            "format": "gpx",
            "name": gpx.name,
            "description": gpx.description,
            "start_time": gpx.time
        })

def _extract_gpx_extension(ext, key: str):
    """Extracts extensions from GPX (cadence, heart rate, power)."""
    if not ext:
        return None
    for item in ext:
        if item.tag.lower().endswith(key):
            try:
                return int(item.text)
            except (ValueError, TypeError):
                return None

    return None


# FIT (fitdecode)
def load_fit(content: bytes) -> Track:
    seg_points: list[TrackPoint] = []

    with fitdecode.FitReader(content) as fit:
        for frame in fit:
            if not isinstance(frame, fitdecode.FitDataMessage):
                continue
            if frame.name != "record":
                continue

            data = {f.name: f.value for f in frame.fields}

            lat, lon = data.get("position_lat"), data.get("position_long")

            # FIT stores coords as semicircles → convert to degrees
            if lat is not None and lon is not None:
                lat = lat * 180 / 2 ** 31
                lon = lon * 180 / 2 ** 31

            seg_points.append(
                TrackPoint(
                    lat=lat,
                    lon=lon,
                    ele=data.get("altitude"),
                    time=data.get("timestamp") if data.get("timestamp") else None,
                    power=data.get("power"),
                    cadence=data.get("cadence"),
                    hr=data.get("heart_rate")
                )
            )

    return Track(
        segments=[TrackSegment(points=seg_points)],
        metadata={
            "format": "fit",
            "sport":

        })


# TCX (xmltodict)
def load_tcx(content: bytes) -> Track:
    data = xmltodict.parse(content)
    segments = []

    # TCX structure:
    # TrainingCenterDatabase > Activities > Activity > Lap > Track > Trackpoint
    try:
        activities = data["TrainingCenterDatabase"]["Activities"]["Activity"]
    except KeyError:
        raise ValueError("Invalid TCX format")

    # Some TCX files contain multiple laps
    laps = activities.get("Lap")
    if isinstance(laps, dict):
        laps = [laps]

    for lap in laps:
        track = lap.get("Track")
        if not track:
            continue

        trackpoints = track.get("Trackpoint")
        if not trackpoints:
            continue

        if isinstance(trackpoints, dict):
            trackpoints = [trackpoints]

        seg_points: list[TrackPoint] = []

        for tp in trackpoints:

            pos = tp.get("Position", {})
            hr = tp.get("HeartRateBpm", {}).get("Value")

            seg_points.append({
                "lat": float(pos.get("LatitudeDegrees")) if pos.get("LatitudeDegrees") else None,
                "lon": float(pos.get("LongitudeDegrees")) if pos.get("LongitudeDegrees") else None,
                "ele": float(tp.get("AltitudeMeters")) if tp.get("AltitudeMeters") else None,
                "time": tp.get("Time"),
                "hr": int(hr) if hr else None,
            })

        segments.append(TrackSegment(points=seg_points))

    return Track(segments=segments, metadata={"format": "tcx"})