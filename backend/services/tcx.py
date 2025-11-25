import xmltodict

from datetime import datetime

from backend.models.track import Track, TrackSegment, TrackPoint, TrackMetadata

def load_tcx(content: bytes) -> Track:
    data = xmltodict.parse(content)
    segments = []

    # TCX structure:
    # TrainingCenterDatabase > Activities > Activity > Lap > Track > Trackpoint
    try:
        activity = data["TrainingCenterDatabase"]["Activities"]["Activity"]
    except KeyError:
        raise ValueError("Invalid TCX format")

    sport = activity["@Sport"]
    start_time = None

    if "Id" in activity:
        # Garmin writes ISO 8601 but without timezone
        id_val = activity["Id"]
        start_time = datetime.fromisoformat(id_val.replace("Z", "+00:00"))

    metadata: TrackMetadata = {
        "format": "tcx",
        "sport": sport.lower(),
    }
    if start_time:
        metadata["start_time"] = start_time

    for lap in activity.get("Lap", []):
        if "Track" not in lap:
            continue

        pts = []
        for tp in lap["Track"]["Trackpoint"]:
            lat = tp.get("Position", {}).get("LatitudeDegrees")
            lon = tp.get("Position", {}).get("LongitudeDegrees")
            ele = tp.get("AltitudeMeters")
            time = tp.get("Time")

            hr = None
            cad = None
            power = None

            # HR
            if "HeartRateBpm" in tp and "Value" in tp["HeartRateBpm"]:
                hr = int(tp["HeartRateBpm"]["Value"])

            # Cadence
            if "Cadence" in tp:
                cad = int(tp["Cadence"])

            # Power (Garmin TPX extension)
            ext = tp.get("Extensions", {})
            if "TPX" in ext and "Watts" in ext["TPX"]:
                power = int(ext["TPX"]["Watts"])

            pts.append(
                TrackPoint(
                    lat=float(lat) if lat else None,
                    lon=float(lon) if lon else None,
                    ele=float(ele) if ele else None,
                    time=datetime.fromisoformat(time.replace("Z", "+00:00")) if time else None,
                    hr=hr,
                    cadence=cad,
                    power=power,
                )
            )

        segments.append(TrackSegment(points=pts))


    return Track(segments=segments, metadata=metadata)