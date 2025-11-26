from pydantic import BaseModel

class RerouteRequest(BaseModel):
    session_id: str
    segment_idx: int
    point_idx: int
    new_lat: float
    new_lon: float
    mode: str = "snap"
