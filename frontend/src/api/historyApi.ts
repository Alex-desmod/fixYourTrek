export async function undo(session_id: string) {
  const res = await fetch('/api/track/undo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ session_id })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`undo failed: ${res.status} ${text}`)
  }

  return await res.json()
}

export async function redo(session_id: string) {
  const res = await fetch('/api/track/redo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ session_id })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`redo failed: ${res.status} ${text}`)
  }

  return await res.json()
}

export async function reset(session_id: string) {
  const res = await fetch('/api/track/reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ session_id })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`reset failed: ${res.status} ${text}`)
  }

  return await res.json()
}
