import uuid
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
    # editor-only
    id: str = field(default_factory=lambda: uuid.uuid4().hex, repr=False)

    def to_dict(self):
        return {
            "id": self.id,
            "lat": self.lat,
            "lon": self.lon,
            "ele": self.ele,
            "time": self.time.isoformat() if self.time else None,
            "hr": self.hr,
            "cadence": self.cadence,
            "power": self.power,
        }

@dataclass
class TrackSegment:
    points: list[TrackPoint]

    def to_dict(self):
        return {
            "points": [p.to_dict() for p in self.points]
        }

class TrackMetadata(TypedDict, total=False):
    format: Literal["gpx", "fit", "tcx"]
    name: str | None
    sport: str | None
    description: str | None
    start_time: datetime | None
    duration: float | None #seconds
    distance: float | None #meters
    manufacturer: str | None
    product: str | None

@dataclass()
class Track:
    segments: list[TrackSegment]
    metadata: TrackMetadata = field(default_factory=dict)

    def to_dict(self):
        return {
            "segments": [s.to_dict() for s in self.segments],
            "metadata": dict(self.metadata)
        }


