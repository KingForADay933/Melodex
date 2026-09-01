import { STEPS_PER_BAR } from '../constants'
import { pitchClassToMidi } from '../music-theory'
import type { MelodyNote, Project } from '../types/project'
import { createId } from '../utils/id'
import { resolveChord } from '../utils/resolveChord'

export type ArpeggioPattern = 'up' | 'down' | 'upDown' | 'random'

export const ARPEGGIO_PATTERNS: { id: ArpeggioPattern; label: string }[] = [
  { id: 'up', label: 'Up' },
  { id: 'down', label: 'Down' },
  { id: 'upDown', label: 'Up-Down' },
  { id: 'random', label: 'Random' },
]

/** One note's place within a bar — repeated for every bar in the chord
 * track. `offsetSteps` + `lengthSteps` pairs across a template must sum to
 * `STEPS_PER_BAR` so bars tile with no gaps or overlap. */
export interface RhythmSlot {
  offsetSteps: number
  lengthSteps: number
}

export interface RhythmTemplate {
  id: string
  label: string
  slots: RhythmSlot[]
}

function evenSlots(count: number): RhythmSlot[] {
  const lengthSteps = STEPS_PER_BAR / count
  return Array.from({ length: count }, (_, i) => ({ offsetSteps: i * lengthSteps, lengthSteps }))
}

// The first template reproduces the arpeggiator's original fixed rhythm
// (8 equal 8th-note slots per bar) exactly — it's the default so existing
// behavior is unchanged unless a different rhythm is explicitly picked.
export const RHYTHM_TEMPLATES: RhythmTemplate[] = [
  { id: 'eighths', label: 'Steady 8ths', slots: evenSlots(8) },
  { id: 'sixteenths', label: 'Straight 16ths', slots: evenSlots(16) },
  {
    id: 'syncopated',
    label: 'Syncopated',
    slots: [
      { offsetSteps: 0, lengthSteps: 3 },
      { offsetSteps: 3, lengthSteps: 3 },
      { offsetSteps: 6, lengthSteps: 2 },
      { offsetSteps: 8, lengthSteps: 3 },
      { offsetSteps: 11, lengthSteps: 3 },
      { offsetSteps: 14, lengthSteps: 2 },
    ],
  },
  {
    id: 'dotted',
    label: 'Long-Short',
    slots: [
      { offsetSteps: 0, lengthSteps: 3 },
      { offsetSteps: 3, lengthSteps: 1 },
      { offsetSteps: 4, lengthSteps: 3 },
      { offsetSteps: 7, lengthSteps: 1 },
      { offsetSteps: 8, lengthSteps: 3 },
      { offsetSteps: 11, lengthSteps: 1 },
      { offsetSteps: 12, lengthSteps: 3 },
      { offsetSteps: 15, lengthSteps: 1 },
    ],
  },
  { id: 'sparse', label: 'Sparse', slots: evenSlots(2) },
]

/** Melody sits an octave above the chord track by default, so an
 * arpeggio reads as a lead line over the harmony rather than doubling it. */
const ARPEGGIO_OCTAVE_OFFSET = 1
const CHORD_TRACK_BASE_OCTAVE = 4

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
 * contour pattern (which chord tone plays) and rhythm template (when notes
 * fall and how long they last), replacing whatever melody notes were there
 * before. Used by the "auto-fill melody" controls on the Melody screen — a
 * starting point the user can then hand-edit.
 */
export function generateArpeggio(
  project: Project,
  pattern: ArpeggioPattern,
  rhythm: RhythmTemplate = RHYTHM_TEMPLATES[0],
): MelodyNote[] {
  const octave = CHORD_TRACK_BASE_OCTAVE + ARPEGGIO_OCTAVE_OFFSET
  const notes: MelodyNote[] = []

  project.chords.forEach((chordItem, barIndex) => {
    const voiced = resolveChord(project.key, chordItem)
    const toneCount = voiced.pitchClasses.length
    const patternIndices = buildPatternIndices(toneCount, pattern)

    rhythm.slots.forEach((slot, i) => {
      const toneIndex = pattern === 'random' ? Math.floor(Math.random() * toneCount) : patternIndices[i % patternIndices.length]
      const pitch = pitchClassToMidi(voiced.pitchClasses[toneIndex], octave)
      const startStep = barIndex * STEPS_PER_BAR + slot.offsetSteps

      notes.push({ id: createId('note'), pitch, startStep, lengthSteps: slot.lengthSteps })
    })
  })

  return notes
}
