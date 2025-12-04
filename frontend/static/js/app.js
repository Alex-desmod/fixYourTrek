document.addEventListener("DOMContentLoaded", () => {
  // ----- map init -----
  let map = L.map("map").setView([0, 0], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

  // ----- state -----
  let currentTrack = null;
  let sessionId = null;
  let polylineLayer = null;
  let markersLayer = L.layerGroup().addTo(map);
  let editMode = false;
  let tempDragMarker = null; // draggable marker used for new/edited point

  // ----- helpers: flatten points, map global <-> local indices -----
  function flattenTrackPoints(track) {
    // returns array of {lat, lon, segIndex, pointIndex}
    const out = [];
    track.segments.forEach((seg, sIdx) => {
      seg.points.forEach((p, pIdx) => {
        out.push({ lat: p.lat, lon: p.lon, segIndex: sIdx, pointIndex: pIdx });
      });
    });
    return out;
  }

  function getSegmentPointCount(track, segIndex) {
    return (track.segments[segIndex] && track.segments[segIndex].points.length) || 0;
  }

  function localIndexToGlobal(track, segIndex, pointIndex) {
    let idx = 0;
    for (let s = 0; s < segIndex; s++) idx += getSegmentPointCount(track, s);
    return idx + pointIndex;
  }

  function globalToLocal(track, globalIndex) {
    let running = 0;
    for (let s = 0; s < track.segments.length; s++) {
      const cnt = getSegmentPointCount(track, s);
      if (globalIndex < running + cnt) {
        return { segIndex: s, pointIndex: globalIndex - running };
      }
      running += cnt;
    }
    // fallback -> last
    const lastSeg = Math.max(0, track.segments.length - 1);
    const lastIdx = Math.max(0, getSegmentPointCount(track, lastSeg) - 1);
    return { segIndex: lastSeg, pointIndex: lastIdx };
  }

  // ----- distance from latlng to segment [i,i+1] measured in pixels -----
  function distanceToSegment(latlng, aLatLng, bLatLng) {
    const p = map.latLngToLayerPoint(latlng);
    const a = map.latLngToLayerPoint(aLatLng);
    const b = map.latLngToLayerPoint(bLatLng);

    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const wx = p.x - a.x;
    const wy = p.y - a.y;

    const c1 = vx * wx + vy * wy;
    const c2 = vx * vx + vy * vy;
    let t = 0;
    if (c2 > 0) t = c1 / c2;
    t = Math.max(0, Math.min(1, t));

    const projX = a.x + t * vx;
    const projY = a.y + t * vy;
    const dx = p.x - projX;
    const dy = p.y - projY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ----- find best insertion location on polyline for given latlng -----
  // returns { segIndex, insertAfterIndex (index in that segment after which to insert), latlngExact }
  function findInsertLocation(track, latlng) {
    if (!track || !track.segments || track.segments.length === 0) return null;

    let best = { segIndex: 0, insertAt: 0, dist: Infinity, proj: latlng };

    for (let s = 0; s < track.segments.length; s++) {
      const pts = track.segments[s].points;
      if (!pts || pts.length === 0) continue;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = L.latLng(pts[i].lat, pts[i].lon);
        const b = L.latLng(pts[i + 1].lat, pts[i + 1].lon);
        const d = distanceToSegment(latlng, a, b);
        if (d < best.dist) {
          best.dist = d;
          best.segIndex = s;
          best.insertAt = i + 1; // insert before pts[i+1]
          // compute projected point coordinates (closest point on segment)
          // reuse projection code from distanceToSegment but returning proj point
          const p = map.latLngToLayerPoint(latlng);
          const A = map.latLngToLayerPoint(a);
          const B = map.latLngToLayerPoint(b);
          const vx = B.x - A.x;
          const vy = B.y - A.y;
          const wx = p.x - A.x;
          const wy = p.y - A.y;
          const c1 = vx * wx + vy * wy;
          const c2 = vx * vx + vy * vy;
          let t = 0;
          if (c2 > 0) t = c1 / c2;
          t = Math.max(0, Math.min(1, t));
          const projX = A.x + t * vx;
          const projY = A.y + t * vy;
          const projPoint = map.layerPointToLatLng(L.point(projX, projY));
          best.proj = projPoint;
        }
      }
      // if a segment has only one point, we can consider distance to that point too
      if (pts.length === 1) {
        const a = L.latLng(pts[0].lat, pts[0].lon);
        const d = map.latLngToLayerPoint(latlng).distanceTo(map.latLngToLayerPoint(a));
        if (d < best.dist) {
          best.dist = d;
          best.segIndex = s;
          best.insertAt = 1;
          best.proj = a;
        }
      }
    }

    return best;
  }

  // ----- insert point into currentTrack (local seg indexes) -----
  function insertPoint(track, segIndex, insertAt, lat, lon) {
    // ensure segment exists
    while (segIndex >= track.segments.length) {
      track.segments.push({ points: [] });
    }
    const seg = track.segments[segIndex];
    seg.points.splice(insertAt, 0, {
      lat: lat,
      lon: lon,
      ele: null,
      time: null,
      hr: null,
      cadence: null,
      power: null,
    });
    return { segIndex: segIndex, pointIndex: insertAt };
  }

  // ----- drawTrack: rebuild polyline and markers -----
  function drawTrack(track) {
    if (!track || !track.segments) return;

    if (polylineLayer) {
      map.removeLayer(polylineLayer);
      polylineLayer = null;
    }
    markersLayer.clearLayers();

    const latlngs = [];
    // We'll keep list of latlng arrays per segment so polyline respects segmentation if needed
    track.segments.forEach((seg, segIndex) => {
      seg.points.forEach((p, pointIndex) => {
        latlngs.push([p.lat, p.lon]);

        // draw small circle markers for editing/visualization
        const marker = L.circleMarker([p.lat, p.lon], {
          radius: 4,
          color: editMode ? "red" : "gray",
          opacity: editMode ? 1 : 0.6,
        }).addTo(markersLayer);

        // attach indices so we can reference this point later
        marker._segIndex = segIndex;
        marker._pointIndex = pointIndex;

        // clicking marker in edit mode starts dragging (we create a draggable marker)
        marker.on("click", (ev) => {
          if (!editMode) return;
          // remove previous tempDragMarker
          if (tempDragMarker) {
            map.removeLayer(tempDragMarker);
            tempDragMarker = null;
          }
          const lat = ev.target.getLatLng().lat;
          const lon = ev.target.getLatLng().lng;
          tempDragMarker = L.marker([lat, lon], { draggable: true }).addTo(map);
          tempDragMarker._segIndex = segIndex;
          tempDragMarker._pointIndex = pointIndex;

          tempDragMarker.on("dragend", async (e) => {
            const newLL = e.target.getLatLng();
            await applyReroute(e.target._segIndex, e.target._pointIndex, newLL.lat, newLL.lng);
            // temp marker will be recreated by drawTrack on response
          });
        });
      });
    });

    // create polyline from flattened latlngs
    if (latlngs.length > 0) {
      polylineLayer = L.polyline(latlngs, { color: "blue" }).addTo(map);
      try {
        map.fitBounds(polylineLayer.getBounds());
      } catch (err) {
        // ignore fitBounds errors
      }
    }
  }

  // ----- insert new editable point on click (anywhere on polyline) -----
  async function onMapClickAddPoint(e) {
    if (!editMode) return;
    if (!currentTrack) return;
    if (!polylineLayer) return;

    const latlng = e.latlng;
    const ins = findInsertLocation(currentTrack, latlng);
    if (!ins) return;

    // Insert at projected point (proj) so marker lies exactly on polyline
    const proj = ins.proj || latlng;
    const inserted = insertPoint(currentTrack, ins.segIndex, ins.insertAt, proj.lat, proj.lng);

    // redraw track and create a draggable marker for the newly inserted point
    drawTrack(currentTrack);

    // create draggable marker at that newly inserted location
    if (tempDragMarker) {
      map.removeLayer(tempDragMarker);
      tempDragMarker = null;
    }

    // create draggable marker using the inserted indices
    tempDragMarker = L.marker([proj.lat, proj.lng], { draggable: true }).addTo(map);
    tempDragMarker._segIndex = inserted.segIndex;
    tempDragMarker._pointIndex = inserted.pointIndex;

    tempDragMarker.on("dragend", async (ev) => {
      const newLL = ev.target.getLatLng();
      await applyReroute(ev.target._segIndex, ev.target._pointIndex, newLL.lat, newLL.lng);
    });
  }

  // ----- apply reroute (API call) -----
  async function applyReroute(segmentIdx, pointIdx, newLat, newLon) {
    if (!sessionId) {
      alert("No session — upload a track first.");
      return;
    }

    const body = {
      session_id: sessionId,
      segment_idx: segmentIdx,
      point_idx: pointIdx,
      new_lat: newLat,
      new_lon: newLon,
      mode: "snap",
    };

    const res = await fetch("/api/track/reroute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      console.error("Reroute failed", err);
      alert("Reroute failed");
      return;
    }

    const data = await res.json();
    // assume server returns full updated track
    currentTrack = data.track;
    // redraw
    drawTrack(currentTrack);
  }

  // ----- UI handlers -----
  const btnEdit = document.getElementById("btn-edit");
  if (btnEdit) {
    btnEdit.addEventListener("click", () => {
      editMode = !editMode;
      btnEdit.classList.toggle("active", editMode);

      // remove any temporary marker when leaving edit mode
      if (!editMode && tempDragMarker) {
        map.removeLayer(tempDragMarker);
        tempDragMarker = null;
      }
    });
  }

  // upload file handler
  const fileInput = document.getElementById("file-input");
  if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      let formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/track/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert("Upload failed: " + (err?.detail || res.statusText));
        return;
      }

      const data = await res.json();
      sessionId = data.session_id;
      currentTrack = data.track;
      drawTrack(currentTrack);
    });
  }

  // undo
  const undoBtn = document.getElementById("undo-btn");
  if (undoBtn) {
    undoBtn.addEventListener("click", async () => {
      if (!sessionId) return;
      const res = await fetch(`/api/track/undo?session_id=${sessionId}`, {
        method: "POST",
      });
      if (!res.ok) {
        console.error("Undo failed");
        return;
      }
      const data = await res.json();
      currentTrack = data.track;
      drawTrack(currentTrack);
    });
  }

  // export
  const exportGpxBtn = document.getElementById("export-gpx-btn");
  if (exportGpxBtn) {
    exportGpxBtn.addEventListener("click", () => {
      if (!sessionId) return;
      window.location.href = `/api/track/export?session_id=${sessionId}&fmt=gpx`;
    });
  }
  const exportFitBtn = document.getElementById("export-fit-btn");
  if (exportFitBtn) {
    exportFitBtn.addEventListener("click", () => {
      if (!sessionId) return;
      window.location.href = `/api/track/export?session_id=${sessionId}&fmt=fit`;
    });
  }

  // clicking on map in edit mode inserts a new control point on the line
  map.on("click", onMapClickAddPoint);

  // clean up when unloading
  window.addEventListener("beforeunload", () => {
    if (polylineLayer) {
      try {
        map.removeLayer(polylineLayer);
      } catch (e) {}
    }
  });
});

