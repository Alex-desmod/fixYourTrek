import gpxpy
import fitdecode
import xmltodict

from fastapi import UploadFile
from backend.models.track import Track, TrackSegment

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
            seg_points = []

            for p in seg.points:
                seg_points.append({
                    "lat": p.latitude,
                    "lon": p.longitude,
                    "ele": p.elevation,
                    "time": p.time.isoformat() if p.time else None,
                    "hr": p.extensions and _extract_gpx_extension(p.extensions, "hr"),
                    "cad": p.extensions and _extract_gpx_extension(p.extensions, "cad"),
                    "power": p.extensions and _extract_gpx_extension(p.extensions, "power"),
                })

            segments.append(TrackSegment(points=seg_points))

    return Track(segments=segments, metadata={"format": "gpx"})

def _extract_gpx_extension(ext, name: str):
    """Extracts extensions from GPX (cadence, heart rate, power)."""
    try:
        for child in ext:
            if child.tag.endswith(name):
                return child.text
    except:
        pass
    return None


# FIT (fitdecode)
def load_fit(content: bytes) -> Track:
    seg_points = []

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

            seg_points.append({
                "lat": lat,
                "lon": lon,
                "ele": data.get("altitude"),
                "time": data.get("timestamp").isoformat() if data.get("timestamp") else None,
                "power": data.get("power"),
                "cad": data.get("cadence"),
                "hr": data.get("heart_rate"),
            })

    return Track(segments=[TrackSegment(points=seg_points)], metadata={"format": "fit"})


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

        seg_points = []

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