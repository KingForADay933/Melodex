import type { ScaleType } from './types'

/** All 12 pitch names, chromatic order starting at C, spelled with sharps. */
export const SHARP_NAMES = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const

/** Same 12 pitches, spelled with flats. */
export const FLAT_NAMES = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
] as const

// Major-key tonics that are conventionally notated with flats (Db, Eb, F, Ab, Bb
// major). Every other major tonic defaults to sharps, matching standard key
// signature convention. A minor key borrows its relative major's spelling.
const FLAT_KEY_TONICS = new Set([1, 3, 5, 8, 10])

function normalizePitchClass(pitchClass: number): number {
  return ((pitchClass % 12) + 12) % 12
}

/** Whether a key is conventionally notated with flats rather than sharps. */
export function usesFlats(tonic: number, scale: ScaleType): boolean {
  const relativeMajorTonic = scale === 'minor' ? normalizePitchClass(tonic + 3) : normalizePitchClass(tonic)
  return FLAT_KEY_TONICS.has(relativeMajorTonic)
}

/** Spells a pitch class as a note name appropriate for the given key. */
export function noteName(pitchClass: number, tonic: number, scale: ScaleType): string {
  const pc = normalizePitchClass(pitchClass)
  return usesFlats(tonic, scale) ? FLAT_NAMES[pc] : SHARP_NAMES[pc]
}

/** Converts a pitch class + octave into a MIDI note number (C4 = 60). */
export function pitchClassToMidi(pitchClass: number, octave: number): number {
  return (octave + 1) * 12 + normalizePitchClass(pitchClass)
}
