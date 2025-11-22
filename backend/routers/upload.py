from fastapi import APIRouter, UploadFile, File
from backend.services.track_loader import load_track

router = APIRouter(prefix="/upload", tags=["upload"])

@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    track = await load_track(file)
    return {"points": track.points, "meta": track.metadata}