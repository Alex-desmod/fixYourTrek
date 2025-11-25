from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal, TypedDict


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
    name: str | None
    description: str | None
    sport: str | None
    start_time: datetime | None
    duration: float | None #seconds
    distance: float | None #meters
    manufacturer: str | None
    product: str | None


@dataclass()
class Track:
    segments: list[TrackSegment]
    metadata: TrackMetadata = field(default_factory=dict)


