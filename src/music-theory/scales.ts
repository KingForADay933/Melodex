import type { ScaleType } from './types'

/** Interval patterns in semitones from the tonic. Adding another 7-note mode
 * (dorian, mixolydian, ...) later is just another entry here — every function
 * in this module derives its behavior from this table. */
export const SCALES: Record<ScaleType, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10], // natural minor
}

/** Returns the scale's pitch classes (0-11) for a given tonic. */
export function getScaleNotes(tonic: number, scale: ScaleType): number[] {
  return SCALES[scale].map((interval) => (tonic + interval) % 12)
}

/** Whether a pitch class belongs to the given key's scale. */
export function isInScale(pitchClass: number, tonic: number, scale: ScaleType): boolean {
  const normalized = ((pitchClass % 12) + 12) % 12
  return getScaleNotes(tonic, scale).includes(normalized)
}
