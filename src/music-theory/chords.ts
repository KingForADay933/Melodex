import { noteName } from './notes'
import { SCALES } from './scales'
import type { ChordQuality, DiatonicChord, ScaleType } from './types'

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

/**
 * Semitones from the tonic to the note `stepsFromRoot` scale-steps above a
 * given scale degree, handling wraparound past the top of the scale (and
 * past the octave above that, needed for 9th chords). Shared by the plain
 * diatonic triads here and the extended chords in extendedChords.ts.
 */
export function intervalFromTonic(intervals: number[], degreeIndex: number, stepsFromRoot: number): number {
  const n = intervals.length
  const target = degreeIndex + stepsFromRoot
  const wrapped = ((target % n) + n) % n
  const octaveShift = Math.floor(target / n)
  return intervals[wrapped] + octaveShift * 12
}

export function classifyTriad(thirdSemitones: number, fifthSemitones: number): ChordQuality {
  if (thirdSemitones === 4 && fifthSemitones === 7) return 'major'
  if (thirdSemitones === 3 && fifthSemitones === 7) return 'minor'
  if (thirdSemitones === 3 && fifthSemitones === 6) return 'diminished'
  if (thirdSemitones === 4 && fifthSemitones === 8) return 'augmented'
  // Every triad in the major and natural minor scales matches one of the
  // cases above, so this only matters if SCALES grows a non-standard mode.
  return 'major'
}

function toRomanNumeral(degree: number, quality: ChordQuality): string {
  const base = ROMAN_NUMERALS[degree - 1]
  switch (quality) {
    case 'minor':
      return base.toLowerCase()
    case 'diminished':
      return `${base.toLowerCase()}°`
    case 'augmented':
      return `${base}+`
    default:
      return base
  }
}

/**
 * Builds the seven diatonic triads for a key by stacking thirds within its
 * scale (root, +2 scale steps, +4 scale steps). This works for any 7-note
 * scale, not just major/minor, so future modes need no changes here.
 */
export function getDiatonicChords(tonic: number, scale: ScaleType): DiatonicChord[] {
  const intervals = SCALES[scale]

  return intervals.map((_, i) => {
    const rootInterval = intervalFromTonic(intervals, i, 0)
    const thirdInterval = intervalFromTonic(intervals, i, 2)
    const fifthInterval = intervalFromTonic(intervals, i, 4)
    const quality = classifyTriad(thirdInterval - rootInterval, fifthInterval - rootInterval)

    const root = (tonic + rootInterval) % 12
    const notes = [root, (tonic + thirdInterval) % 12, (tonic + fifthInterval) % 12]

    return {
      degree: i + 1,
      roman: toRomanNumeral(i + 1, quality),
      quality,
      root,
      rootName: noteName(root, tonic, scale),
      notes,
      noteNames: notes.map((pc) => noteName(pc, tonic, scale)),
    }
  })
}

/** Looks up a single diatonic chord by scale degree (1-7). */
export function getDiatonicChord(tonic: number, scale: ScaleType, degree: number): DiatonicChord {
  const chord = getDiatonicChords(tonic, scale)[degree - 1]
  if (!chord) {
    throw new Error(`Scale degree ${degree} is out of range for a 7-note scale`)
  }
  return chord
}
