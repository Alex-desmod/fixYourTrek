import fitdecode

from backend.models.track import Track, TrackSegment, TrackPoint, TrackMetadata

def load_fit(content: bytes) -> Track:
    metadata: TrackMetadata = {
        "format": "fit"
    }
    seg_points: list[TrackPoint] = []

    with fitdecode.FitReader(content) as fit:
        for frame in fit:
            if not isinstance(frame, fitdecode.FitDataMessage):
                continue
            # ---- FILE_ID ----
            if frame.name == "file_id":
                for f in frame.fields:
                    if f.name == "manufacturer":
                        metadata["manufacturer"] = f.value
                    elif f.name == "product":
                        metadata["product"] = f.value
            # ---- SPORT ----
            elif frame.name == "sport":
                for f in frame.fields:
                    if f.name == "sport":
                        metadata["sport"] = f.value
            # ---- SESSION ----
            elif frame.name == "session":
                for f in frame.fields:
                    if f.name == "start_time":
                        metadata["start_time"] = f.value
                    elif f.name == "total_elapsed_time":
                        metadata["duration"] = float(f.value)
                    elif f.name == "total_distance":
                        metadata["distance"] = float(f.value)
            # ---- RECORD (GPS points) ----
            elif frame.name == "record":
                d = {f.name: f.value for f in frame.fields}

                lat_raw = d.get("position_lat")
                lon_raw = d.get("position_long")
                # FIT stores coords as semicircles → convert to degrees
                if lat_raw is not None and lon_raw is not None:
                    lat = lat_raw * 180 / 2 ** 31
                    lon = lon_raw * 180 / 2 ** 31

                    seg_points.append(
                        TrackPoint(
                            lat=lat,
                            lon=lon,
                            ele=d.get("altitude"),
                            time=d.get("timestamp") if d.get("timestamp") else None,
                            hr=d.get("heart_rate"),
                            cadence=d.get("cadence"),
                            power=d.get("power"),
                        )
                    )

    return Track(
        segments=[TrackSegment(points=seg_points)],
        metadata=metadata
    )