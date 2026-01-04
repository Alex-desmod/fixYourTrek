export interface UploadResponse {
    session_id: string
    track: any
}

export async function uploadTrack(file: File): Promise<UploadResponse> {
    const form = new FormData()
    form.append('file', file)

    const res = await fetch('/api/track/upload', {
        method: 'POST',
        body: form
    })

    if (!res.ok) {
        throw new Error('Upload failed')
    }

    return await res.json()
}

export async function addPoint(payload: {
    session_id: string
    segment_idx: number
    prev_point_idx: number
    lat: number
    lon: number
}) {
    const res = await fetch('/api/track/add_point', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`add_point failed: ${res.status} ${text}`)
    }

    return await res.json()
}

export async function updateTime(payload: {
    session_id: string
    segment_idx: number
    point_idx: number
    new_time
}) {
    const res = await fetch('/api/track/update_time', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`update_time failed: ${res.status} ${text}`)
    }

    return await res.json()
}