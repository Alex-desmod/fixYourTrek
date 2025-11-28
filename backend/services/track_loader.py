from typing import Literal

from fastapi import UploadFile

from backend.models.track import Track
from backend.services.gpx import load_gpx, to_gpx
from backend.services.fit import load_fit
from backend.services.tcx import load_tcx

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

async def export_track(track: Track, format: Literal["gpx", "fit", "tcx"]) -> dict:
    if format == "gpx":
        return to_gpx(track)

