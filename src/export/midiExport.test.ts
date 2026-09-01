import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR } from '../constants'
import type { ChordTrackItem, MelodyNote, Project, Section } from '../types/project'
import { buildProjectMidi } from './midiExport'

function makeProject(overrides: { chords?: ChordTrackItem[]; melody?: MelodyNote[]; sections?: Section[] } = {}): Project {
  return {
    id: 'test',
    name: 'Test',
    key: { tonic: 0, scale: 'major' },
    sections: overrides.sections ?? [
      {
        id: 's1',
        name: 'Section 1',
        chords: overrides.chords ?? [{ id: 'c1', degree: 1, extension: 'triad', inversion: 0 }],
        melody: overrides.melody ?? [
          { id: 'n1', pitch: 60, startStep: 0, lengthSteps: 2 },
          { id: 'n2', pitch: 64, startStep: 2, lengthSteps: 2 },
        ],
      },
    ],
    tempo: 100,
    chordInstrument: 'warm',
    melodyInstrument: 'pluck',
    createdAt: 0,
    updatedAt: 0,
  }
}

function melodyEvents(midi: ReturnType<typeof buildProjectMidi>) {
  const track = midi.tracks.find((t) => t.name === 'Melody')
  if (!track) throw new Error('melody track missing')
  return track.notes.map((n) => ({ time: n.time, velocity: n.velocity, midi: n.midi }))
}

function chordEvents(midi: ReturnType<typeof buildProjectMidi>) {
  const track = midi.tracks.find((t) => t.name === 'Chords')
  if (!track) throw new Error('chords track missing')
  return track.notes.map((n) => ({ time: n.time, midi: n.midi }))
}

describe('buildProjectMidi humanize', () => {
  it('produces identical output across calls when humanize is omitted', () => {
    const project = makeProject()
    expect(melodyEvents(buildProjectMidi(project))).toEqual(melodyEvents(buildProjectMidi(project)))
  })

  it('produces the same output whether humanize is omitted or explicitly false', () => {
    const project = makeProject()
    const withoutOption = melodyEvents(buildProjectMidi(project))
    const explicitFalse = melodyEvents(buildProjectMidi(project, { humanize: false }))
    expect(withoutOption).toEqual(explicitFalse)
  })

  it('keeps velocity at the fixed base value (0.9) when humanize is off', () => {
    const project = makeProject()
    for (const event of melodyEvents(buildProjectMidi(project))) {
      expect(event.velocity).toBeCloseTo(0.9, 5)
    }
  })

  it('keeps the first note at time 0 whether or not humanize is on', () => {
    const project = makeProject()
    expect(melodyEvents(buildProjectMidi(project))[0].time).toBe(0)
  })

  it('actually varies timing/velocity across many notes when humanize is on', () => {
    const project = makeProject({
      melody: Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, pitch: 60, startStep: i, lengthSteps: 1 })),
    })
    const events = melodyEvents(buildProjectMidi(project, { humanize: true }))
    const distinctVelocities = new Set(events.map((e) => e.velocity))
    expect(distinctVelocities.size).toBeGreaterThan(1)
  })

  it('keeps humanized times non-negative and velocities within [0.4, 1.0]', () => {
    const project = makeProject({
      melody: Array.from({ length: 50 }, (_, i) => ({ id: `n${i}`, pitch: 60, startStep: 0, lengthSteps: 1 })),
    })
    for (const event of melodyEvents(buildProjectMidi(project, { humanize: true }))) {
      expect(event.time).toBeGreaterThanOrEqual(0)
      expect(event.velocity).toBeGreaterThanOrEqual(0.4)
      expect(event.velocity).toBeLessThanOrEqual(1)
    }
  })

  it('does not change note count when humanize is on', () => {
    const project = makeProject()
    expect(melodyEvents(buildProjectMidi(project, { humanize: true }))).toHaveLength(project.sections[0].melody.length)
  })
})

describe('buildProjectMidi across multiple sections', () => {
  it('places each section\'s chords and melody at the correct absolute bar/step offset', () => {
    const project = makeProject({
      sections: [
        {
          id: 's1',
          name: 'Verse',
          chords: [{ id: 'c1', degree: 1, extension: 'triad', inversion: 0 }], // 1 bar
          melody: [{ id: 'n1', pitch: 60, startStep: 0, lengthSteps: 2 }],
        },
        {
          id: 's2',
          name: 'Chorus',
          chords: [
            { id: 'c2', degree: 4, extension: 'triad', inversion: 0 },
            { id: 'c3', degree: 5, extension: 'triad', inversion: 0 },
          ], // 2 bars
          melody: [{ id: 'n2', pitch: 67, startStep: 0, lengthSteps: 2 }],
        },
      ],
    })
    const midi = buildProjectMidi(project)
    const stepSeconds = (60 / 100) * (4 / STEPS_PER_BAR)

    // Chorus's melody note (pitch 67) starts at step 0 *within its
    // section*, but the verse ahead of it is 1 bar (16 steps) long, so its
    // absolute time should be offset by exactly one bar.
    const chorusNote = melodyEvents(midi).find((n) => n.midi === 67)
    expect(chorusNote?.time).toBeCloseTo(STEPS_PER_BAR * stepSeconds, 5)

    // Chorus's second chord (V) should land 2 bars in (1 verse bar + 1 chorus bar).
    const chords = chordEvents(midi)
    const chorusSecondChordTime = Math.max(...chords.map((c) => c.time))
    expect(chorusSecondChordTime).toBeCloseTo(2 * STEPS_PER_BAR * stepSeconds, 5)
  })

  it('skips an empty section without inserting a silent bar', () => {
    const project = makeProject({
      sections: [
        { id: 's1', name: 'Verse', chords: [{ id: 'c1', degree: 1, extension: 'triad', inversion: 0 }], melody: [] },
        { id: 's2', name: 'Empty', chords: [], melody: [] },
        {
          id: 's3',
          name: 'Chorus',
          chords: [{ id: 'c2', degree: 5, extension: 'triad', inversion: 0 }],
          melody: [{ id: 'n1', pitch: 67, startStep: 0, lengthSteps: 2 }],
        },
      ],
    })
    const midi = buildProjectMidi(project)
    const stepSeconds = (60 / 100) * (4 / STEPS_PER_BAR)
    // Chorus's chord should be at bar 1 (right after Verse's 1 bar), not bar 2.
    const chords = chordEvents(midi)
    expect(Math.max(...chords.map((c) => c.time))).toBeCloseTo(STEPS_PER_BAR * stepSeconds, 5)
  })
})
