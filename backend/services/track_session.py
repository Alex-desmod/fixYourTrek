import copy
import uuid

from datetime import timedelta, datetime
from typing import List
from haversine import haversine, Unit
from backend.models.track import Track, TrackSegment, TrackPoint, GpsStuck


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

        # Current index of the history list
        self._history_idx: int = -1
        self._save_state()

    MAX_HISTORY = 10 # Maximum saved states in history

    # Auxiliary methods
    def _save_state(self):
        """Saves the current state."""
        # If we are not at the end of history — cut redo states
        if self._history_idx < len(self._history) - 1:
            self._history = self._history[: self._history_idx + 1]

        # Save current state
        self._history.append(copy.deepcopy(self.current_track))
        self._history_idx += 1

        # Enforce history size limit
        if len(self._history) > self.MAX_HISTORY:
            self._history.pop(0)
            self._history_idx -= 1

    def undo(self) -> bool:
        if self._history_idx <= 0:
            return False

        self._history_idx -= 1
        self.current_track = copy.deepcopy(self._history[self._history_idx])
        return True

    def redo(self) -> bool:
        if self._history_idx >= len(self._history) - 1:
            return False

        self._history_idx += 1
        self.current_track = copy.deepcopy(self._history[self._history_idx])
        return True

    def _route_via_osrm(self, start_point, new_lat, new_lon, end_point) -> List[TrackPoint]:
        pass

    # Editing methods
    def detect_gps_stucks(self, max_speed: float, min_points: int = 10) -> List[GpsStuck]:
        """Detects GPS stucks."""
        stucks = []
        for seg_idx, segment in enumerate(self.current_track.segments):
            pts = segment.points
            i = 1
            while i < len(pts) - 1:
                start = i - 1
                stuck_indices = []

                while (
                    i < len(pts)
                    and haversine(
                        (pts[start].lat, pts[start].lon),
                        (pts[i].lat, pts[i].lon),
                        unit=Unit.METERS
                    ) <= 1
                ):
                    stuck_indices.append(i)
                    i += 1

                if (len(stuck_indices) >= min_points and i < len(pts)):
                    jump_m = haversine(
                        (pts[i-1].lat, pts[i-1].lon),
                        (pts[i].lat, pts[i].lon),
                        unit=Unit.METERS
                    )
                    dt = (pts[i].time - pts[i-1].time).total_seconds()
                    speed = jump_m / dt
                    if speed > max_speed:
                        stucks.append(
                            GpsStuck(
                                segment_idx=seg_idx,
                                start_idx=start,
                                end_idx=i,
                                stuck_indices=stuck_indices
                            )
                        )
                else:
                    i += 1
        return stucks

    def normalize_gps_stucks(self, stucks: list[GpsStuck]):
        """Normalizes the detected GPS stucks by allocating points steadily on a problem part of the track."""
        self._save_state()
        for s in stucks:
            segment = self.current_track.segments[s.segment_idx]
            pts = segment.points
            p0 = pts[s.start_idx]
            p1 = pts[s.end_idx]
            n = len(s.stuck_indices) + 1

            for j, idx in enumerate(s.stuck_indices, start=1):
                t = j / n
                pts[idx].lat = _interp(p0.lat, p1.lat, t)
                pts[idx].lon = _interp(p0.lon, p1.lon, t)

    def insert_point(self, segment_idx: int, prev_point_idx: int, lat: float, lon: float):
        """Adds a new point to the track"""
        self._save_state()
        segment = self.current_track.segments[segment_idx]
        # average speed of the track
        dist = self.current_track.metadata.get("distance")
        dur = self.current_track.metadata.get("duration")

        if dist is not None and dur is not None:
            speed = dist / dur
        else:
            speed = 4.0

        # ========== CASE 1 — prepend ==========
        if prev_point_idx == -1:
            # distance to the first point
            d = haversine((lat, lon), (segment.points[0].lat, segment.points[0].lon), unit=Unit.METERS)

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
        elif prev_point_idx == len(segment.points)-1:
            # distance from the last point
            d = haversine((segment.points[-1].lat, segment.points[-1].lon), (lat, lon), unit=Unit.METERS)
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
            d0 = haversine((segment.points[prev_point_idx].lat, segment.points[prev_point_idx].lon),
                           (lat,lon))
            d1 = haversine((lat, lon),
                           (segment.points[prev_point_idx+1].lat, segment.points[prev_point_idx+1].lon))

            t = d0 / (d0 + d1)
            dt = (segment.points[prev_point_idx+1].time - segment.points[prev_point_idx].time).total_seconds() * t

            new_point = TrackPoint(
                lat=lat,
                lon=lon,
                time=segment.points[prev_point_idx].time + timedelta(seconds=dt),
                ele=_interp(segment.points[prev_point_idx].ele, segment.points[prev_point_idx+1].ele, t),
                cadence=_interp(segment.points[prev_point_idx].cadence, segment.points[prev_point_idx+1].cadence, t),
                hr=_interp(segment.points[prev_point_idx].hr, segment.points[prev_point_idx+1].hr, t),
                power=_interp(segment.points[prev_point_idx].power, segment.points[prev_point_idx+1].power, t)
            )

            segment.points.insert(prev_point_idx+1, new_point)

    def update_time(self, segment_idx: int, point_idx: int, new_time: datetime):
        """Updating the timestamp of a point."""
        segment = self.current_track.segments[segment_idx]
        pts = segment.points
        prev_point = pts[point_idx-1] if point_idx > 0 else None
        next_point = pts[point_idx+1] if point_idx < len(pts) - 1 else None

        if prev_point and new_time < prev_point.time:
            raise ValueError(
                f"New time {new_time} is earlier than previous point time {prev_point.time}"
            )
        if next_point and new_time > next_point.time:
            raise ValueError(
                f"New time {new_time} is later than next point time {next_point.time}"
            )
        self._save_state()
        pts[point_idx].time = new_time

    def reroute(
            self,
            segment_idx: int,
            point_idx: int,
            new_lat: float,
            new_lon: float,
            mode: str = "straight",
            radius_m: float = 50.0,  # influence radius in meters
        ):
        """
        Smooth reroute using distance-based influence (meters).
        Points within radius_m are moved proportionally.
        """
        self._save_state()
        segment = self.current_track.segments[segment_idx]
        points = segment.points

        center = points[point_idx]
        old_lat, old_lon = center.lat, center.lon

        # index bounds (+/- 100 indices)
        start = max(0, point_idx - 100)
        end = min(len(points), point_idx + 100)

        if mode == "straight":
            for i in range(start, end):
                p = points[i]
                # distance to the dragged point (meters)
                d = haversine((old_lat, old_lon),(p.lat, p.lon), unit=Unit.METERS)
                if d > radius_m:
                    continue  # outside the influence

                weight = 1.0 - (d / radius_m)
                # smooth shift
                p.lat += weight * (new_lat - old_lat)
                p.lon += weight * (new_lon - old_lon)

        # placement of the cental point
        center.lat = new_lat
        center.lon = new_lon

    def recalculate_times(
            self,
            start_point_id: str,
            end_point_id: str,
            max_deviation: float = 0.10,  # 10%
    ):
        """
        Smoothes time distribution between two points so that
        local speed does not deviate too much from the average.
        """

        self._save_state()

        # ---------- 1. Flatten points ----------
        flat = []
        for seg_idx, seg in enumerate(self.current_track.segments):
            for pt_idx, p in enumerate(seg.points):
                flat.append((seg_idx, pt_idx, p))

        # ---------- 2. Locate indices ----------
        def find_idx(pid):
            for i, (_, _, p) in enumerate(flat):
                if p.id == pid:
                    return i
            raise ValueError(f"Point id not found: {pid}")

        start_idx = find_idx(start_point_id)
        end_idx = find_idx(end_point_id)

        if start_idx >= end_idx:
            raise ValueError("start_point must be before end_point")

        points = [p for _, _, p in flat[start_idx:end_idx+1]]

        # ---------- 3. Distances ----------
        dists = [0.0]
        for i in range(1, len(points)):
            d = haversine(
                (points[i - 1].lat, points[i - 1].lon),
                (points[i].lat, points[i].lon),
                unit=Unit.METERS
            )
            dists.append(d)

        total_dist = sum(dists)
        if total_dist == 0:
            return  # nothing to normalize

        # ---------- 4. Timing ----------
        t0 = points[0].time
        t1 = points[-1].time
        total_time = (t1 - t0).total_seconds()

        avg_speed = total_dist / total_time

        # cumulative distance
        cum_dist = 0.0
        new_times = [t0]

        for i in range(1, len(points) - 1):
            cum_dist += dists[i]
            frac = cum_dist / total_dist
            new_t = t0 + timedelta(seconds=total_time * frac)
            new_times.append(new_t)

        new_times.append(t1)

        # ---------- 5. Clamp speed ----------
        for i in range(1, len(points)):
            dt = (new_times[i] - new_times[i - 1]).total_seconds()
            if dt <= 0:
                dt = 1e-3

            speed = dists[i] / dt
            max_s = avg_speed * (1 + max_deviation)
            min_s = avg_speed * (1 - max_deviation)

            if speed > max_s:
                dt = dists[i] / max_s
            elif speed < min_s:
                dt = dists[i] / min_s

            new_times[i] = new_times[i - 1] + timedelta(seconds=dt)

        # ---------- 6. Apply ----------
        for p, t in zip(points, new_times):
            p.time = t

    def trim(self, start_point_id: str, end_point_id: str):
        """
        Trim track between two point IDs (inclusive).
        Works correctly with multiple segments.
        """
        self._save_state()
        new_segments: list[TrackSegment] = []

        collecting = False
        finished = False

        for segment in self.current_track.segments:
            new_points = []

            for p in segment.points:
                if p.id == start_point_id:
                    collecting = True

                if collecting and not finished:
                    new_points.append(p)

                if p.id == end_point_id:
                    finished = True
                    collecting = False

            if new_points:
                new_segments.append(TrackSegment(points=new_points))

            if finished:
                break

        if not new_segments:
            raise ValueError("Invalid trim range: no points selected")

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
        self._history_idx = 0
        self._history = self._history[:1]
        self.current_track = copy.deepcopy(self._history[self._history_idx])


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

# Linear interpolation
def _interp(a, b, t):
    return a + t * (b - a) if a is not None and b is not None else a or b