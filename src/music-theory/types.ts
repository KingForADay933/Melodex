// Shared types for the music-theory core. Kept dependency-free (no React,
// no Tone.js) so this module stays reusable and independently testable.

/** Scales available in Phase 0. More modes can be added to SCALES later
 * without touching any of the functions that consume it. */
export type ScaleType = 'major' | 'minor'

export type ChordQuality = 'major' | 'minor' | 'diminished' | 'augmented'

/** A key is a tonic pitch class (0 = C, 1 = C#, ... 11 = B) plus a scale. */
export interface MusicKey {
  tonic: number
  scale: ScaleType
}

/** One of the seven triads built from stacking thirds within a scale. */
export interface DiatonicChord {
  /** Scale degree, 1-indexed (1 = tonic). */
  degree: number
  /** Roman numeral label, e.g. "I", "vi", "vii°". */
  roman: string
  quality: ChordQuality
  /** Root pitch class, 0-11. */
  root: number
  /** Root note spelled correctly for the key (e.g. "Bb" not "A#" in F major). */
  rootName: string
  /** Pitch classes of the triad in root position: [root, third, fifth]. */
  notes: number[]
  /** Note names matching `notes`, spelled correctly for the key. */
  noteNames: string[]
}

/** A named scale-degree pattern, e.g. "I – V – vi – IV" -> [1, 5, 6, 4]. */
export interface ProgressionPreset {
  id: string
  name: string
  pattern: number[]
}
