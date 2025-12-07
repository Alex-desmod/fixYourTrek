import copy
import uuid
from datetime import timedelta
from typing import List
from haversine import haversine
from backend.models.track import Track, TrackSegment, TrackPoint


class TrackSession:
    """
    Manages track editing and stores the change history for undo().
    """
    def __init__(self, track: Track):
        # The original track (not to be changed)
        self.original_track = copy.deepcopy(track)

        # Current state
        self.current_track = copy.deepcopy(track)

        # Previous states
        self._history: List[Track] = []

    MAX_HISTORY = 10 # Maximum saved states in history

    # Auxiliary methods
    def _save_state(self):
        """Saves the current state for undo()."""
        self._history.append(copy.deepcopy(self.current_track))
        if len(self._history) > self.MAX_HISTORY:
            self._history.pop(0)

    def undo(self) -> bool:
        """Cancels the latest action."""
        if not self._history:
            return False
        self.current_track = self._history.pop()
        return True

    def _route_via_osrm(self, start_point, new_lat, new_lon, end_point) -> List[TrackPoint]:
        pass

    def _route_straight(self, start_point, new_lat, new_lon, end_point) -> List[TrackPoint]:
        pass

    def _recalculate_times(self, segment):
        pass

    # Editing methods
    def insert_point(self, segment_idx: int, before_point_idx: int, lat: float, lon: float):
        """Adds a new point to the track"""
        self._save_state()
        segment = self.current_track.segments[segment_idx]
        # average speed of the track
        if self.current_track.metadata["distance"] and self.current_track.metadata["duration"]:
            speed = self.current_track.metadata["distance"] / self.current_track.metadata["duration"]
        else:
            speed = 5.0

        # ========== CASE 1 — prepend ==========
        if before_point_idx == -1:
            # distance to the first point
            d = haversine((lat, lon), (segment.points[0].lat, segment.points[0].lon))

            dt = d / speed
            new_time = segment.points[0].time - timedelta(seconds=dt)
            new_point = TrackPoint(
                lat=lat,
                lon=lon,
                time=new_time,
                ele=segment.points[0].ele,
                cadence=segment.points[0].cadence,
                hr=segment.points[0].hr,
                power=segment.points[0].power
            )

            segment.points.insert(0, new_point)

        # ========== CASE 2 — append ===========
        elif before_point_idx == len(segment.points)-1:
            # distance from the last point
            d = haversine((segment.points[-1].lat, segment.points[-1].lon), (lat, lon))
            dt = d / speed
            new_time = segment.points[-1].time + timedelta(seconds=dt)
            new_point = TrackPoint(
                lat=lat,
                lon=lon,
                time=new_time,
                ele=segment.points[-1].ele,
                cadence=segment.points[-1].cadence,
                hr=segment.points[-1].hr,
                power=segment.points[-1].power
            )

            segment.points.append(new_point)

        # ==== CASE 3 — inside (interpolate) ====
        else:
            d0 = haversine((segment.points[before_point_idx].lat, segment.points[before_point_idx].lon),
                           (lat,lon))
            d1 = haversine((lat, lon),
                           (segment.points[before_point_idx+1].lat, segment.points[before_point_idx+1].lon))

            # interpolation
            t = d0 / (d0 + d1)
            def interp(a, b):
                return a + t * (b - a) if a is not None and b is not None else a or b

            dt = (segment.points[before_point_idx+1].time - segment.points[before_point_idx].time).total_seconds() * t

            new_point = TrackPoint(
                lat=lat,
                lon=lon,
                time=segment.points[before_point_idx].time + timedelta(seconds=dt),
                ele=interp(segment.points[before_point_idx].ele, segment.points[before_point_idx+1].ele),
                cadence=interp(segment.points[before_point_idx].cadence, segment.points[before_point_idx+1].cadence),
                hr=interp(segment.points[before_point_idx].hr, segment.points[before_point_idx+1].hr),
                power=interp(segment.points[before_point_idx].power, segment.points[before_point_idx+1].power)
            )

            segment.points.insert(before_point_idx+1, new_point)


    def reroute(self, segment_idx: int, point_idx: int, new_lat: float, new_lon: float,
                mode: str = "snap"):
        """Reroutes a section of the track when a user moves a point."""
        self._save_state()
        segment = self.current_track.segments[segment_idx]

        # Finding borders of the section to be rerouted. 10 points before the point_idx and 10 points after
        left = max(0, point_idx - 10)
        right = min(len(segment.points) - 1, point_idx + 10)

        start_point = segment.points[left]
        end_point = segment.points[right]

        # Getting a new way (via OSRM or the shortest way)
        if mode == "snap":
            new_points = self._route_via_osrm(start_point, new_lat, new_lon, end_point)
        else:
            new_points = self._route_straight(start_point, new_lat, new_lon, end_point)

        # Changing the section
        segment.points = segment.points[:left] + new_points + segment.points[right + 1:]

        # Recalculating the timestamps
        self._recalculate_times(segment)

    def update_time(self, segment_idx: int, point_idx: int, new_time):
        """Updating the timestamp of a point."""
        self._save_state()

        segment = self.current_track.segments[segment_idx]
        point = segment.points[point_idx]

        point.time = new_time

    def trim(self, start_idx: int, end_idx: int):
        """
        Trimming the track:
        removes the points before the start_idx and after the end_idx.
        """

        self._save_state()

        new_segments: List[TrackSegment] = []
        global_idx = 0

        for segment in self.current_track.segments:
            new_points = []
            for p in segment.points:
                if start_idx <= global_idx <= end_idx:
                    new_points.append(p)
                global_idx += 1

            if new_points:
                new_segments.append(TrackSegment(points=new_points))

        self.current_track.segments = new_segments

    def merge_with(self, other: Track):
        """
        Merging tracks.
        """
        self._save_state()

        # Just concatenation of the segments
        self.current_track.segments.extend(
            copy.deepcopy(other.segments)
        )

    # Utilities
    def get_track(self) -> Track:
        """Returns the current state of the track."""
        return self.current_track

    def reset(self):
        """Resets to the original track."""
        self.current_track = copy.deepcopy(self.original_track)
        self._history = []


class TrackSessionManager:
    """
    Manages the track sessions. We may have several users, every track uploading is a session.
    """
    def __init__(self):
        self.sessions = {}

    def create_session(self, track):
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = TrackSession(track)
        return session_id

    def get(self,session_id):
        return self.sessions.get(session_id)

    def delete(self, session_id):
        return self.sessions.pop(session_id, None)