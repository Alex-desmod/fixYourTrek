import { defineStore } from 'pinia'

export const useTrackStore = defineStore('track', {
  state: () => ({
    sessionId: null as string | null,
    track: null as any,
    insertMode: false,
    selectedPoint: null as any
  }),

  actions: {
    setSession(sessionId: string, track: any) {
      this.sessionId = sessionId
      this.track = track
    },

    clear() {
      this.sessionId = null
      this.track = null
    },

    setInsertMode(val: boolean) {
      this.insertMode = val
    },
    selectPoint(p: any) {
      this.selectedPoint = p
    }
  }
})