import { STEPS_PER_BAR } from '../constants'
import { getVoicedChord, pitchClassToMidi } from '../music-theory'
import type { MelodyNote, Project } from '../types/project'
import { createId } from '../utils/id'

export type ArpeggioPattern = 'up' | 'down' | 'upDown' | 'random'

export const ARPEGGIO_PATTERNS: { id: ArpeggioPattern; label: string }[] = [
  { id: 'up', label: 'Up' },
  { id: 'down', label: 'Down' },
  { id: 'upDown', label: 'Up-Down' },
  { id: 'random', label: 'Random' },
]

/** Melody sits an octave above the chord track by default, so an
 * arpeggio reads as a lead line over the harmony rather than doubling it. */
const ARPEGGIO_OCTAVE_OFFSET = 1
const CHORD_TRACK_BASE_OCTAVE = 4
const NOTE_LENGTH_STEPS = 2

/** Index order into a chord's tones for one pass of a pattern, e.g. for a
 * 3-tone chord: up = [0,1,2], upDown = [0,1,2,1]. Cycled to fill a bar. */
function buildPatternIndices(toneCount: number, pattern: ArpeggioPattern): number[] {
  const ascending = Array.from({ length: toneCount }, (_, i) => i)
  if (pattern === 'down') return [...ascending].reverse()
  if (pattern === 'upDown') {
    const descendingMiddle = [...ascending].reverse().slice(1, -1)
    return [...ascending, ...descendingMiddle]
  }
  return ascending // 'up' and 'random' (random ignores this and rolls per-slot)
}

/**
 * Generates a full melody by arpeggiating each bar's chord in the given
 * pattern, replacing whatever melody notes were there before. Used by the
 * "auto-fill melody" buttons on the Melody screen — a lead-melody starting
 * point the user can then hand-edit.
 */
export function generateArpeggio(project: Project, pattern: ArpeggioPattern): MelodyNote[] {
  const octave = CHORD_TRACK_BASE_OCTAVE + ARPEGGIO_OCTAVE_OFFSET
  const slotsPerBar = STEPS_PER_BAR / NOTE_LENGTH_STEPS
  const notes: MelodyNote[] = []

  project.chords.forEach((chordItem, barIndex) => {
    const voiced = getVoicedChord(project.key.tonic, project.key.scale, chordItem.degree, chordItem.extension, chordItem.inversion)
    const toneCount = voiced.pitchClasses.length
    const patternIndices = buildPatternIndices(toneCount, pattern)

    for (let slot = 0; slot < slotsPerBar; slot += 1) {
      const toneIndex =
        pattern === 'random' ? Math.floor(Math.random() * toneCount) : patternIndices[slot % patternIndices.length]
      const pitch = pitchClassToMidi(voiced.pitchClasses[toneIndex], octave)
      const startStep = barIndex * STEPS_PER_BAR + slot * NOTE_LENGTH_STEPS

      notes.push({ id: createId('note'), pitch, startStep, lengthSteps: NOTE_LENGTH_STEPS })
    }
  })

  return notes
}
