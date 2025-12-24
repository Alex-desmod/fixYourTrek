function distancePointToSegment(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
) {
  const dx = x2 - x1
  const dy = y2 - y1

  if (dx === 0 && dy === 0) {
    return Math.hypot(px - x1, py - y1)
  }

  const t =
    ((px - x1) * dx + (py - y1) * dy) /
    (dx * dx + dy * dy)

  if (t < 0) return Math.hypot(px - x1, py - y1)
  if (t > 1) return Math.hypot(px - x2, py - y2)

  const projX = x1 + t * dx
  const projY = y1 + t * dy

  return Math.hypot(px - projX, py - projY)
}

export function findExistingPoint(
  track: any,
  lat: number,
  lon: number
) {
  const threshold = 5e-5 // ~5m

  for (let sIdx = 0; sIdx < track.segments.length; sIdx++) {
    const seg = track.segments[sIdx]
    for (let pIdx = 0; pIdx < seg.points.length; pIdx++) {
      const p = seg.points[pIdx]
      const d = Math.hypot(p.lat - lat, p.lon - lon)
      if (d < threshold) {
        return {
          segmentIdx: sIdx,
          pointIdx: pIdx,
          point: p
        }
      }
    }
  }

  return null
}

export function findClosestSegment(track: any, lat: number, lon: number) {
  let best = {
    dist: Infinity,
    segmentIdx: 0,
    prevPointIdx: 0
  }

  track.segments.forEach((seg: any, sIdx: number) => {
    const pts = seg.points
    for (let i = 0; i < pts.length - 1; i++) {
      const d = distancePointToSegment(
        lat, lon,
        pts[i].lat, pts[i].lon,
        pts[i + 1].lat, pts[i + 1].lon
      )
      if (d < best.dist) {
        best = { dist: d, segmentIdx: sIdx, prevPointIdx: i }
      }
    }
  })

  return best
}

export function resolveInsertAction(track: any, lat: number, lon: number) {
  // an existing point
  const hit = findExistingPoint(track, lat, lon)
  if (hit) {
    return {
      type: 'select-existing',
      ...hit
    }
  }

  // close to polyline
  const closest = findClosestSegment(track, lat, lon)
  const lineThreshold = 5e-5

  if (closest.dist < lineThreshold) {
    return {
      type: 'insert-between',
      segmentIdx: closest.segmentIdx,
      prevPointIdx: closest.prevPointIdx
    }
  }

  // out of the track
  const first = track.segments[0].points[0]
  const lastSeg = track.segments[track.segments.length - 1]
  const last = lastSeg.points[lastSeg.points.length - 1]

  const dStart = Math.hypot(first.lat - lat, first.lon - lon)
  const dEnd = Math.hypot(last.lat - lat, last.lon - lon)

  if (dStart <= dEnd) {
    return {
      type: 'extend-start',
      segmentIdx: 0,
      prevPointIdx: -1
    }
  }

  return {
    type: 'extend-end',
    segmentIdx: track.segments.length - 1,
    prevPointIdx: lastSeg.points.length - 1
  }
}
