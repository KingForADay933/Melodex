import type { InstrumentId } from '../audio/instruments'
import type { ChordExtension, MusicKey } from '../music-theory'

/**
 * Where a chord's degree resolves against. Absent means plain diatonic (the
 * degree resolves against the project's own key/scale, as every chord did
 * before this existed — old saved projects have no `source` and keep behaving
 * exactly as before). 'borrowed' resolves the same degree against the
 * parallel scale (modal interchange, e.g. iv in a major key). For
 * 'secondaryDominant', `degree` is repurposed as the *target* degree being
 * tonicized (degree=2 + secondaryDominant means "V/ii").
 */
export type ChordSource = { kind: 'borrowed' } | { kind: 'secondaryDominant' }

/**
 * A chord slot on the chord track. We store the scale degree rather than a
 * fully-resolved chord so that changing the project's key re-voices every
 * chord automatically — there's a single source of truth (music-theory)
 * instead of two copies of chord data that can drift out of sync.
 *
 * `extension` and `inversion` let a chord go beyond the plain diatonic triad
 * (7ths/9ths/sus, and which chord tone sits in the bass) while the degree
 * still ties it to the key.
 */
export interface ChordTrackItem {
  id: string
  degree: number
  extension: ChordExtension
  /** 0 = root position, 1 = first inversion, etc. Clamped to the chord's tone count elsewhere. */
  inversion: number
  source?: ChordSource
}

/** One note placed on the piano roll. Position/length are in 16th-note steps. */
export interface MelodyNote {
  id: string
  /** MIDI note number, e.g. 60 = C4. */
  pitch: number
  startStep: number
  lengthSteps: number
}

/**
 * A chunk of the song (verse/chorus/bridge/etc.) with its own chord
 * progression and melody — a song is these chained together in order.
 */
export interface Section {
  id: string
  name: string
  chords: ChordTrackItem[]
  melody: MelodyNote[]
}

export interface Project {
  id: string
  name: string
  key: MusicKey
  /** Always at least one section — a project is never "sectionless". */
  sections: Section[]
  /** Beats per minute. */
  tempo: number
  chordInstrument: InstrumentId
  melodyInstrument: InstrumentId
  createdAt: number
  updatedAt: number
}
