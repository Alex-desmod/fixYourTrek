import { defineStore } from 'pinia'

export type TrackUpdateReason =
  | 'upload'
  | 'add_point'
  | 'move_point'
  | 'undo'
  | 'redo'
  | 'reset'

export const useTrackStore = defineStore('track', {
  state: () => ({
    sessionId: null as string | null,
    track: null as any,
    insertMode: false,
    selectedPoint: null as any,
    lastUpdate: null as TrackUpdateReason | null
  }),

  actions: {
    setSession(sessionId: string, track: any, reason: TrackUpdateReason) {
      this.sessionId = sessionId
      this.track = track,
      this.lastUpdate = reason
    },

    setTrack(track: any, reason: TrackUpdateReason) {
      this.track = track
      this.lastUpdate = reason
    },

    clear() {
      this.sessionId = null
      this.track = null,
      this.lastUpdate = null
    },

    setInsertMode(val: boolean) {
      this.insertMode = val
    },
    selectPoint(p: any) {
      this.selectedPoint = p
    }
  }
})