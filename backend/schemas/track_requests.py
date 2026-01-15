from datetime import datetime
from pydantic import BaseModel

class SessionRequest(BaseModel):
    session_id: str

class PreviewNormalizeRequest(BaseModel):
    session_id: str
    max_speed: float
    min_points: int

class ApplyNormalizeRequest(BaseModel):
    session_id: str
    stucks: list

class InsertPointRequest(BaseModel):
    session_id: str
    segment_idx: int
    prev_point_idx: int
    lat: float
    lon: float

class UpdateTimeRequest(BaseModel):
    session_id: str
    segment_idx: int
    point_idx: int
    new_time: datetime

class RerouteRequest(BaseModel):
    session_id: str
    segment_idx: int
    point_idx: int
    new_lat: float
    new_lon: float
    mode: str = "straight"
    radius_m: float

class TrimRequest(BaseModel):
    session_id: str
    start_idx: int
    end_idx: int