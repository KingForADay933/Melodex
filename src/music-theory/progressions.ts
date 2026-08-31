import { getDiatonicChords } from './chords'
import type { DiatonicChord, ProgressionPreset, ScaleType } from './types'

// Presets are expressed as scale-degree patterns (1-7) rather than fixed
// chords, so the same pattern produces sensible, correctly-spelled chords in
// any key and in both major and minor. Genre tags are a loose, practical
// grouping for browsing — not a claim that a pattern is exclusive to that
// genre — since most of these patterns show up across many styles.
export const COMMON_PROGRESSIONS: ProgressionPreset[] = [
  // Pop
  { id: 'axis', name: 'Axis Progression', genre: 'pop', pattern: [1, 5, 6, 4] },
  { id: 'sensitive-pop', name: 'Sensitive Pop', genre: 'pop', pattern: [6, 4, 1, 5] },
  { id: 'fifties', name: '50s Progression', genre: 'pop', pattern: [1, 6, 4, 5] },
  { id: 'anthem-climb', name: 'Anthem Climb', genre: 'pop', pattern: [1, 4, 6, 5] },

  // Rock
  { id: 'three-chord-rock', name: 'Three-Chord Rock', genre: 'rock', pattern: [1, 4, 5, 1] },
  { id: 'minor-anthem', name: 'Minor Anthem', genre: 'rock', pattern: [1, 6, 3, 7] },
  { id: 'power-vamp', name: 'Power Vamp', genre: 'rock', pattern: [1, 5, 4, 1] },

  // Jazz
  { id: 'jazz-cadence', name: 'Jazz Cadence', genre: 'jazz', pattern: [2, 5, 1] },
  { id: 'rhythm-changes', name: 'Rhythm Changes', genre: 'jazz', pattern: [1, 6, 2, 5] },
  { id: 'extended-turnaround', name: 'Extended Turnaround', genre: 'jazz', pattern: [3, 6, 2, 5] },

  // Lo-fi / chill
  { id: 'jazzy-loop', name: 'Jazzy Loop', genre: 'lofi', pattern: [6, 2, 5, 1] },
  { id: 'neo-soul-loop', name: 'Neo-Soul Loop', genre: 'lofi', pattern: [1, 4, 2, 5] },
  { id: 'chill-cadence', name: 'Chill Cadence', genre: 'lofi', pattern: [2, 5, 6, 1] },

  // Emotional / ballad
  { id: 'rising-ballad', name: 'Rising Ballad', genre: 'emotional', pattern: [1, 3, 6, 4] },
  { id: 'worship-climb', name: 'Worship Climb', genre: 'emotional', pattern: [4, 1, 5, 6] },
  { id: 'melancholy-descent', name: 'Melancholy Descent', genre: 'emotional', pattern: [6, 4, 2, 5] },
]

/** Resolves a scale-degree pattern (e.g. [1, 5, 6, 4]) into actual chords for a key. */
export function getProgressionChords(
  tonic: number,
  scale: ScaleType,
  pattern: number[],
): DiatonicChord[] {
  const diatonicChords = getDiatonicChords(tonic, scale)
  return pattern.map((degree) => {
    const chord = diatonicChords[degree - 1]
    if (!chord) {
      throw new Error(`Scale degree ${degree} is out of range for a 7-note scale`)
    }
    return chord
  })
}
