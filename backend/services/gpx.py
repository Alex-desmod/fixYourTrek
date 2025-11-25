import gpxpy

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