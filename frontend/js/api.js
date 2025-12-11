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
    }
};

export default API;
