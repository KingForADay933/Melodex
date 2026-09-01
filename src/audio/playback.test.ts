import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR } from '../constants'
import { secondsPerStep } from '../export/midiExport'
import type { ChordTrackItem, MelodyNote, Project, Section } from '../types/project'
import { buildScheduleEvents } from './playback'

function makeSection(overrides: Partial<Section> = {}): Section {
  return { id: 's1', name: 'Section 1', chords: [], melody: [], bassline: [], harmonyMelody: [], ...overrides }
}

function makeProject(overrides: { sections?: Section[]; tempo?: number } = {}): Project {
  return {
    id: 'test',
    name: 'Test',
    key: { tonic: 0, scale: 'major' },
    sections: overrides.sections ?? [makeSection()],
    tempo: overrides.tempo ?? 100,
    chordInstrument: 'warm',
    melodyInstrument: 'pluck',
    bassInstrument: 'warm',
    harmonyInstrument: 'bright',
    createdAt: 0,
    updatedAt: 0,
  }
}

const CHORD: ChordTrackItem = { id: 'c1', degree: 1, extension: 'triad', inversion: 0 } // C major triad

function note(overrides: Partial<MelodyNote> = {}): MelodyNote {
  return { id: 'n', pitch: 60, startStep: 0, lengthSteps: 2, ...overrides }
}

describe('buildScheduleEvents', () => {
  it('matches the pure secondsPerStep/chordDuration formulas at a given tempo', () => {
    const events = buildScheduleEvents(makeProject({ tempo: 100 }))
    expect(events.stepDuration).toBeCloseTo(secondsPerStep(100), 10)
    expect(events.chordDuration).toBeCloseTo(STEPS_PER_BAR * secondsPerStep(100) * 0.95, 10)
  })

  it('scales correctly at a different tempo', () => {
    const events = buildScheduleEvents(makeProject({ tempo: 120 }))
    expect(events.stepDuration).toBeCloseTo(secondsPerStep(120), 10)
    expect(events.chordDuration).toBeCloseTo(STEPS_PER_BAR * secondsPerStep(120) * 0.95, 10)
  })

  it('resolves a chord to its voiced note names at time 0 for the first bar', () => {
    const project = makeProject({ sections: [makeSection({ chords: [CHORD] })] })
    const events = buildScheduleEvents(project)
    expect(events.chordEvents).toEqual([[0, { notes: ['C4', 'E4', 'G4'] }]])
  })

  it('places each note layer at its startStep in seconds, with duration scaled by 0.9', () => {
    const project = makeProject({
      sections: [
        makeSection({
          chords: [CHORD],
          melody: [note({ pitch: 72, startStep: 4, lengthSteps: 2 })],
          bassline: [note({ pitch: 48, startStep: 0, lengthSteps: 4 })],
          harmonyMelody: [note({ pitch: 79, startStep: 8, lengthSteps: 2 })],
        }),
      ],
    })
    const stepDuration = secondsPerStep(100)
    const events = buildScheduleEvents(project)
    expect(events.noteLayerEvents.melody).toEqual([[4 * stepDuration, { note: 'C5', duration: 2 * stepDuration * 0.9 }]])
    expect(events.noteLayerEvents.bass).toEqual([[0, { note: 'C3', duration: 4 * stepDuration * 0.9 }]])
    expect(events.noteLayerEvents.harmony).toEqual([[8 * stepDuration, { note: 'G5', duration: 2 * stepDuration * 0.9 }]])
  })

  it('assigns absolute time offsets across section boundaries, same as flattenChords/flattenNotes', () => {
    const project = makeProject({
      sections: [
        makeSection({ id: 's1', chords: [CHORD], melody: [note({ id: 'n1', startStep: 0 })] }), // 1 bar
        makeSection({
          id: 's2',
          chords: [CHORD, CHORD],
          melody: [note({ id: 'n2', startStep: 0 })],
        }), // 2 bars
      ],
    })
    const stepDuration = secondsPerStep(100)
    const events = buildScheduleEvents(project)

    // Second section's chords start 1 bar (16 steps) in.
    expect(events.chordEvents.map(([time]) => time)).toEqual([0, STEPS_PER_BAR * stepDuration, 2 * STEPS_PER_BAR * stepDuration])
    // Second section's melody note is likewise offset by the first section's 1 bar.
    expect(events.noteLayerEvents.melody.map(([time]) => time)).toEqual([0, STEPS_PER_BAR * stepDuration])
    expect(events.totalSteps).toBe(3 * STEPS_PER_BAR)
  })

  it('still builds correct note-layer events for a section with zero chords (silencing is a PlaybackEngine.play() decision, not this function\'s)', () => {
    const project = makeProject({
      sections: [makeSection({ chords: [], melody: [note({ pitch: 60, startStep: 0, lengthSteps: 2 })] })],
    })
    const events = buildScheduleEvents(project)
    expect(events.chordEvents).toEqual([])
    expect(events.noteLayerEvents.melody).toEqual([[0, { note: 'C4', duration: 2 * secondsPerStep(100) * 0.9 }]])
  })
})
