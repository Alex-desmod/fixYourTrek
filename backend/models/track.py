from dataclasses import dataclass


@dataclass
class TrackSegment:
    points: list

@dataclass()
class Track:
    segment: list[TrackSegment]
    metadata: dict
