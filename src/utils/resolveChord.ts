import {
  getBorrowedRomanNumeral,
  getDiatonicChord,
  getSecondaryDominantChord,
  getVoicedChord,
  parallelScale,
} from '../music-theory'
import type { MusicKey, VoicedChord } from '../music-theory'
import type { ChordTrackItem } from '../types/project'

export interface ResolvedChord extends VoicedChord {
  /** Roman-numeral label, e.g. "I", "iv" (borrowed), "V/vi" (secondary dominant). */
  roman: string
}

/** Resolves a chord-track item to its pitches/symbol/roman-numeral label for
 * the given key — the single place every consumer (playback, export, the
 * piano roll, the chord track UI) goes to turn a `ChordTrackItem` into
 * sound/display, regardless of whether it's diatonic, borrowed, or a
 * secondary dominant. */
export function resolveChord(key: MusicKey, item: ChordTrackItem): ResolvedChord {
  const { degree, extension, inversion, source } = item

  if (!source) {
    const voiced = getVoicedChord(key.tonic, key.scale, degree, extension, inversion)
    return { ...voiced, roman: getDiatonicChord(key.tonic, key.scale, degree).roman }
  }

  if (source.kind === 'borrowed') {
    const voiced = getVoicedChord(key.tonic, parallelScale(key.scale), degree, extension, inversion)
    return { ...voiced, roman: getBorrowedRomanNumeral(key.tonic, key.scale, degree) }
  }

  const voiced = getSecondaryDominantChord(key.tonic, key.scale, degree, extension, inversion)
  return { ...voiced, roman: `V/${getDiatonicChord(key.tonic, key.scale, degree).roman}` }
}
