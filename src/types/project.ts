import type { MusicKey } from '../music-theory'

/**
 * A chord slot on the chord track. We store the scale degree rather than a
 * fully-resolved chord so that changing the project's key re-voices every
 * chord automatically — there's a single source of truth (music-theory)
 * instead of two copies of chord data that can drift out of sync.
 */
export interface ChordTrackItem {
  id: string
  degree: number
}

/** One note placed on the piano roll. Position/length are in 16th-note steps. */
export interface MelodyNote {
  id: string
  /** MIDI note number, e.g. 60 = C4. */
  pitch: number
  startStep: number
  lengthSteps: number
}

export interface Project {
  key: MusicKey
  chords: ChordTrackItem[]
  melody: MelodyNote[]
}
