from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal, TypedDict, Optional


@dataclass
class TrackPoint:
    lat: float
    lon: float
    ele: float | None
    time: datetime | None
    cadence: int | None = None
    hr: int | None = None
    power: int | None = None

@dataclass
class TrackSegment:
    points: list[TrackPoint]

class TrackMetadata(TypedDict, total=False):
    format: Literal["gpx", "fit", "tcx"]
    name: Optional[str] = None
    description: Optional[str] = None
    sport: Optional[str] = None
    start_time: Optional[datetime] = None
    duration: Optional[float] = None #seconds
    distance: Optional[float] = None #meters
    avg_hr: Optional[int] = None
    max_hr: Optional[int] = None
    avg_power: Optional[int] = None
    max_power: Optional[int] = None
    manufacturer: Optional[str] = None
    product: Optional[str] = None


@dataclass()
class Track:
    segments: list[TrackSegment]
    metadata: TrackMetadata = field(default_factory=dict)


