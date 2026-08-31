export type Screen = 'home' | 'key' | 'chords' | 'melody' | 'export'

/** Undo/redo controls, threaded from useProjectManager down to each editing screen's header. */
export interface HistoryControls {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}
