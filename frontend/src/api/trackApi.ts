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