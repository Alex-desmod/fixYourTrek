from fastapi import UploadFile, APIRouter, File, HTTPException
from fastapi.responses import Response

from backend.schemas.track_requests import RerouteRequest, TrimRequest
from backend.services.track_loader import load_track, export_track
from backend.services.track_session import TrackSessionManager

router = APIRouter(prefix="/api/track", tags=["track"])
session_manager = TrackSessionManager()

@router.post("/upload")
async def upload_track(file: UploadFile = File(...)):
    track = await load_track(file)
    if track is None:
        raise HTTPException(status_code=400, detail="Unsupported file format")
    session_id = session_manager.create_session(track)
    return {"session_id": session_id, "track": track.to_dict()}

@router.post("/reroute")
async def reroute_track(req: RerouteRequest):
    session = session_manager.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.reroute(
        segment_idx=req.segment_idx,
        point_idx=req.point_idx,
        new_lat=req.new_lat,
        new_lon=req.new_lon,
        mode=req.mode
    )
    return {"track": session.current_track.to_dict()}

@router.post("/undo")
async def undo(session_id: str):
    session = session_manager.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.undo()
    return {"track": session.current_track.to_dict()}

@router.post("/trim")
async def trim_track(req: TrimRequest):
    session = session_manager.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.trim(start_idx=req.start_idx, end_idx=req.end_idx)
    return {"track": session.current_track.to_dict()}

@router.post("/merge")
async def merge_track(session_id: str, file: UploadFile = File(...)):
    session = session_manager.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    second_track = await load_track(file)
    session.merge_with(second_track)
    return {"track": session.current_track.to_dict()}

@router.get("/export")
async def export_track(session_id: str, fmt: str, name: str):
    """
    export the current session track
    :param fmt: 'gpx', 'tcx', 'fit' name: name of the file
    :return:
    """
    session = session_manager.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    track = session.current_track

    content = export_track(track, fmt)
    data = content["data"]
    filename = f"{name}.{fmt}"
    media_type = content["media_type"]

    return Response(
        content=data,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename=\"{filename}\"'}
    )


