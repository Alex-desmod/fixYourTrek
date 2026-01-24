import { defineStore } from 'pinia'
import { normalizeApply } from '@/api/trackApi'

export type TrackUpdateReason =
    | 'upload'
    | 'add_point'
    | 'reroute'
    | 'undo'
    | 'redo'
    | 'reset'
    | 'normalize'

export type EditorMode = 'insert' | 'normalize' | 'trim' | null

export const useTrackStore = defineStore('track', {
    state: () => ({
        sessionId: null as string | null,
        track: null as any,
        editorMode: null as EditorMode,

        hoverPoint: null as any | null,

        /* ---------- NORMALIZE ---------- */
        normalizeOpen: false,
        normalizeParams: {
            maxSpeed: 5,
            minPoints: 10
        },
        normalizePreview: null as any | null,

        /* ---------- TRIM ---------- */
        trim: {
            startId: null as number | null,
            endId: null as number | null
        }

        /* ---------- UI ---------- */
        selectedPoint: null as any,

        lastUpdate: null as TrackUpdateReason | null
    }),

    actions: {
        /* ---------- TRACK ---------- */

        setSession(sessionId: string, track: any, reason: TrackUpdateReason) {
            this.sessionId = sessionId
            this.track = track
            this.lastUpdate = reason
            this.editorMode = null
            this.syncNormalizeDefaults()
        },

        setTrack(track: any, reason: TrackUpdateReason) {
            this.track = track
            this.lastUpdate = reason
            this.editorMode = null
            this.syncNormalizeDefaults()
        },

        clear() {
            this.sessionId = null
            this.track = null
            this.lastUpdate = null
            this.editorMode = null
            this.normalizePreview = null
        },

        /* ---------- MODES ---------- */

        setEditorMode(mode: EditorMode) {
            if (!this.track) return
            this.editorMode = this.editorMode === mode ? null : mode
            if (mode === 'trim' && this.track) {
                const pts = this.track.segments.flatMap(s => s.points)
                this.trim.startId = pts[0]?.id ?? null
                this.trim.endId = pts.at(-1)?.id ?? null
            }
        },

        disableEditorMode() {
            this.editorMode = null
        },

        /* ---------- NORMALIZE ---------- */

        syncNormalizeDefaults() {
            if (!this.track?.metadata?.sport) return

            this.normalizeParams.maxSpeed =
            this.track.metadata.sport === 'cycling' ? 15 : 5
        },

        setNormalizeOpen(val: boolean) {
            this.normalizeOpen = val
        },

        setNormalizeParams(patch: Partial<typeof this.normalizeParams>) {
            this.normalizeParams = {
                ...this.normalizeParams,
                ...patch
            }
        },

        setNormalizePreview(preview: any | null) {
            this.normalizePreview = preview
        },

        async applyNormalize() {
            if (!this.sessionId || !this.normalizePreview) return

            const res = await normalizeApply({
                session_id: this.sessionId,
                stucks: this.normalizePreview.stucks
            })

            this.track = res.track
            this.normalizePreview = null
            this.lastUpdate = 'normalize'
        },

        /* ---------- UI ---------- */

        selectPoint(p: any) {
            this.selectedPoint = p
        },

        setHoverPoint(p: any | null) {
            this.hoverPoint = p
        }
    }
})
