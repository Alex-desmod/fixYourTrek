const API = {
    async uploadTrack(file) {
        const fd = new FormData();
        fd.append("file", file);

        const resp = await fetch("/api/track/upload", { method: "POST", body: fd });
        return resp.json();
    },

    async addPoint(req) {
        const resp = await fetch("/api/track/add_point", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(req)
        });
        return resp.json();
    },

    async updatePointTime(session_id, segment_idx, point_idx, time) {
        const resp = await fetch("/api/track/update_time", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id,
                segment_idx,
                point_idx,
                time
            })
        });

        const data = await resp.json();

        if (!resp.ok) {
            throw new Error(data.detail || "Update time failed");
        }

        return data;
    }
};

export default API;
