from typing import Literal

from fastapi import UploadFile, APIRouter, File, HTTPException
from fastapi.responses import Response

from backend.models.track import GpsStuck
from backend.schemas.track_requests import (SessionRequest, RerouteRequest, TrimRequest,
                                            InsertPointRequest, UpdateTimeRequest, PreviewNormalizeRequest,
                                            ApplyNormalizeRequest)
from backend.services.track_loader import load_track, export_track
from backend.services.track_session import TrackSessionManager

router = APIRouter(prefix="/api/track", tags=["track"])
session_manager = TrackSessionManager()

@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    track = await load_track(file)
    if track is None:
        raise HTTPException(status_code=400, detail="Unsupported file format")
    session_id = session_manager.create_session(track)
    return {"session_id": session_id, "track": track.to_dict()}

@router.post("/undo")
async def undo(req: SessionRequest):
    session = session_manager.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.undo()
    return {"track": session.current_track.to_dict()}

@router.post("/redo")
async def redo(req: SessionRequest):
    session = session_manager.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.redo()
    return {"track": session.current_track.to_dict()}

@router.post("/reset")
async def reset(req: SessionRequest):
    session = session_manager.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.reset()
    return {"track": session.current_track.to_dict()}

@router.post("/normalize/preview")
async def normalize_preview(req: PreviewNormalizeRequest):
    session = session_manager.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    stucks = session.detect_gps_stucks(max_speed=req.max_speed, min_points=req.min_points)
    return {
        "stucks": [s.__dict__ for s in stucks]
    }

@router.post("/normalize/apply")
async def normalize_apply(req: ApplyNormalizeRequest):
    session = session_manager.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    print(req.stucks)
    stucks = [
        GpsStuck(
            segment_idx=s.segment_idx,
            start_idx=s.start_idx,
            end_idx=s.end_idx,
            stuck_indices=s.stuck_indices
        )
        for s in req.stucks["stucks"]
    ]
    session.normalize_gps_stucks(stucks=stucks)
    return {"track": session.current_track.to_dict()}

@router.post("/add_point")
async def add_point(req: InsertPointRequest):
    session = session_manager.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.insert_point(
        segment_idx=req.segment_idx,
        prev_point_idx=req.prev_point_idx,
        lat=req.lat,
        lon=req.lon
    )
    return {"track": session.current_track.to_dict()}

@router.post("/update_time")
async def update_time(req: UpdateTimeRequest):
    session = session_manager.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    try:
        session.update_time(
            segment_idx=req.segment_idx,
            point_idx=req.point_idx,
            new_time=req.new_time
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"track": session.current_track.to_dict()}

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
        mode=req.mode,
        radius_m=req.radius_m
    )
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
async def export(session_id: str, name: str, fmt: Literal["gpx", "fit", "tcx"]="gpx"):
    """
    exports the current session track
    """
    session = session_manager.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    track = session.current_track

    content = await export_track(track, fmt)
    data = content["data"]
    filename = f"{name}.{fmt}"
    media_type = content["media_type"]
    return Response(
        content=data,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename=\"{filename}\"'}
    )


