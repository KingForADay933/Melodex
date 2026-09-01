import { getBorrowedRomanNumeral, getDiatonicChord, parallelScale } from '../music-theory'
import type { MusicKey } from '../music-theory'
import type { ChordSource, ChordTrackItem } from '../types/project'

export interface Substitution {
  label: string
  degree: number
  source?: ChordSource
}

// Tonic-function (I/iii/vi), subdominant-function (ii/IV), and dominant-
// function (V/vii°) groups — each degree maps to the other members of its
// group, a classic "swap for the same harmonic role" substitution.
const FUNCTION_GROUPS: Record<number, number[]> = {
  1: [3, 6],
  2: [4],
  3: [1, 6],
  4: [2],
  5: [7],
  6: [1, 3],
  7: [5],
}

/**
 * Suggests chords that could stand in for `item` in its current slot.
 * Deliberately scoped to two rules: functional-group swaps (diatonic chords
 * only) and the borrowed alternate at the same degree. Secondary dominants
 * are left out — they're naturally an insertion *before* a chord, not a
 * substitute *for* one, so mixing them in here risks fuzzy suggestions.
 */
export function suggestSubstitutions(key: MusicKey, item: ChordTrackItem): Substitution[] {
  const suggestions: Substitution[] = []

  if (!item.source) {
    for (const degree of FUNCTION_GROUPS[item.degree] ?? []) {
      suggestions.push({ label: getDiatonicChord(key.tonic, key.scale, degree).roman, degree })
    }
  }

  if (!item.source || item.source.kind === 'borrowed') {
    const home = getDiatonicChord(key.tonic, key.scale, item.degree)
    const borrowed = getDiatonicChord(key.tonic, parallelScale(key.scale), item.degree)
    if (borrowed.root !== home.root || borrowed.quality !== home.quality) {
      suggestions.push(
        item.source?.kind === 'borrowed'
          ? { label: home.roman, degree: item.degree }
          : {
              label: getBorrowedRomanNumeral(key.tonic, key.scale, item.degree),
              degree: item.degree,
              source: { kind: 'borrowed' },
            },
      )
    }
  }

  return suggestions
}
