import type { ChordSource, ChordTrackItem } from '../types/project'
import { createId } from './id'

/** A new chord track slot for a scale degree, defaulting to a plain root-position triad.
 * `source` selects borrowed/secondary-dominant resolution; omit it for a plain diatonic chord. */
export function createChordTrackItem(degree: number, source?: ChordSource): ChordTrackItem {
  return { id: createId('chord'), degree, extension: 'triad', inversion: 0, ...(source ? { source } : {}) }
}
