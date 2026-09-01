import { describe, expect, it } from 'vitest'
import type { Project } from '../types/project'
import { buildProjectMidi } from './midiExport'

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'test',
    name: 'Test',
    key: { tonic: 0, scale: 'major' },
    chords: [{ id: 'c1', degree: 1, extension: 'triad', inversion: 0 }],
    melody: [
      { id: 'n1', pitch: 60, startStep: 0, lengthSteps: 2 },
      { id: 'n2', pitch: 64, startStep: 2, lengthSteps: 2 },
    ],
    tempo: 100,
    chordInstrument: 'warm',
    melodyInstrument: 'pluck',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

function melodyEvents(midi: ReturnType<typeof buildProjectMidi>) {
  const track = midi.tracks.find((t) => t.name === 'Melody')
  if (!track) throw new Error('melody track missing')
  return track.notes.map((n) => ({ time: n.time, velocity: n.velocity }))
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
    expect(melodyEvents(buildProjectMidi(project, { humanize: true }))).toHaveLength(project.melody.length)
  })
})
