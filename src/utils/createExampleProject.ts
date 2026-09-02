import { generateArpeggio, generateBassline } from '../melody/arpeggiator'
import { COMMON_PROGRESSIONS } from '../music-theory'
import { createProject } from '../storage/projectStorage'
import type { Project } from '../types/project'
import { createChordTrackItem } from './createChordTrackItem'
import { createId } from './id'

/** A ready-to-play demo project for first-time testers — a well-known
 * 4-chord/4-bar pop progression with an arpeggiated melody and bassline
 * auto-filled from it, so playback and the UI can be verified within
 * seconds of opening the app instead of starting from a blank project. */
export function createExampleProject(): Project {
  const preset = COMMON_PROGRESSIONS.find((p) => p.id === 'axis')!
  const base = createProject('Example: Axis Progression')
  const chords = preset.pattern.map((degree) => createChordTrackItem(degree))
  const melody = generateArpeggio(chords, base.key, 'up')
  const bassline = generateBassline(chords, base.key, 'up')
  // Opposite contour from the lead ('down' vs 'up') so it reads as a
  // countermelody rather than doubling the melody line note-for-note.
  const harmonyMelody = generateArpeggio(chords, base.key, 'down')

  return {
    ...base,
    melodyInstrument: 'warm',
    sections: [{ id: createId('section'), name: 'Section 1', chords, melody, bassline, harmonyMelody }],
  }
}
