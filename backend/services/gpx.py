import gpxpy
from xml.etree.ElementTree import Element, SubElement

from backend.models.track import Track, TrackSegment, TrackPoint

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

def to_gpx(track: Track) -> str:
    gpx = gpxpy.gpx.GPX()
    md = track.metadata

    # ----- GPX metadata -----
    if md.get("name"):
        gpx.name = md["name"]
    if md.get("description"):
        gpx.description = md["description"]
    if md.get("start_time"):
        gpx.time = md["start_time"]

    # ----- Track + Segments + Points -----
    gpx_track = gpxpy.gpx.GPXTrack()
    gpx.tracks.append(gpx_track)

    for seg in track.segments:
        gpx_segment = gpxpy.gpx.GPXTrackSegment()
        gpx_track.segments.append(gpx_segment)

        for p in seg.points:
            point = gpxpy.gpx.GPXTrackPoint(
                latitude=p.lat,
                longitude=p.lon,
                elevation=p.ele,
                time=p.time
            )
            # ----- Extensions (hr, cad, power) -----
            if p.hr is not None or p.cadence is not None or p.power is not None:
                ext_root = Element("gpxtpx:TrackPointExtension")

                if p.hr is not None:
                    SubElement(ext_root, "gpxtpx:hr").text = str(p.hr)

                if p.cadence is not None:
                    SubElement(ext_root, "gpxtpx:cad").text = str(p.cadence)

                if p.power is not None:
                    SubElement(ext_root, "gpxtpx:power").text = str(p.power)

                # gpxpy requires a list of the XML elements
                point.extensions.append(ext_root)

            gpx_segment.points.append(point)

    # GPX → string
    return gpx.to_xml()
