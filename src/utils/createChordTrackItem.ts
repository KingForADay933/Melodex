import type { ChordTrackItem } from '../types/project'
import { createId } from './id'

/** A new chord track slot for a scale degree, defaulting to a plain root-position triad. */
export function createChordTrackItem(degree: number): ChordTrackItem {
  return { id: createId('chord'), degree, extension: 'triad', inversion: 0 }
}
