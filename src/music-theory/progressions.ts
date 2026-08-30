import { getDiatonicChords } from './chords'
import type { DiatonicChord, ProgressionPreset, ScaleType } from './types'

// Presets are expressed as scale-degree patterns (1-7) rather than fixed
// chords, so the same pattern produces sensible, correctly-spelled chords in
// any key and in both major and minor.
export const COMMON_PROGRESSIONS: ProgressionPreset[] = [
  { id: 'I-V-vi-IV', name: 'I – V – vi – IV', pattern: [1, 5, 6, 4] },
  { id: 'vi-IV-I-V', name: 'vi – IV – I – V', pattern: [6, 4, 1, 5] },
  { id: 'I-IV-V-I', name: 'I – IV – V – I', pattern: [1, 4, 5, 1] },
  { id: 'ii-V-I', name: 'ii – V – I', pattern: [2, 5, 1] },
  { id: 'I-vi-IV-V', name: 'I – vi – IV – V', pattern: [1, 6, 4, 5] },
  { id: 'I-IV-vi-V', name: 'I – IV – vi – V', pattern: [1, 4, 6, 5] },
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
