import { describe, expect, it } from 'vitest'
import { MELODY_MAX_MIDI, MELODY_MIN_MIDI } from '../constants'
import type { Project } from '../types/project'
import { transposeProject, wrapIntoRange } from './transpose'

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'test',
    name: 'Test',
    key: { tonic: 0, scale: 'major' }, // C major
    chords: [{ id: 'c1', degree: 1, extension: 'triad', inversion: 0 }],
    melody: [{ id: 'n1', pitch: 60, startStep: 0, lengthSteps: 2 }], // C4
    tempo: 100,
    chordInstrument: 'warm',
    melodyInstrument: 'pluck',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

describe('wrapIntoRange', () => {
  it('leaves a pitch already in range untouched', () => {
    expect(wrapIntoRange(60, MELODY_MIN_MIDI, MELODY_MAX_MIDI)).toBe(60)
  })

  it('shifts up an octave at a time when below the range', () => {
    expect(wrapIntoRange(MELODY_MIN_MIDI - 1, MELODY_MIN_MIDI, MELODY_MAX_MIDI)).toBe(MELODY_MIN_MIDI - 1 + 12)
  })

  it('shifts down an octave at a time when above the range', () => {
    expect(wrapIntoRange(MELODY_MAX_MIDI + 1, MELODY_MIN_MIDI, MELODY_MAX_MIDI)).toBe(MELODY_MAX_MIDI + 1 - 12)
  })

  it('preserves pitch class after wrapping', () => {
    const wrapped = wrapIntoRange(MELODY_MIN_MIDI - 5, MELODY_MIN_MIDI, MELODY_MAX_MIDI)
    expect(wrapped % 12).toBe(((MELODY_MIN_MIDI - 5) % 12 + 12) % 12)
  })
})

describe('transposeProject', () => {
  it('takes the shortest signed path for the semitone delta', () => {
    const cases: [from: number, to: number, expectedDelta: number][] = [
      [0, 1, 1],
      [0, 11, -1],
      [0, 5, 5],
      [0, 7, -5],
      [0, 6, -6],
    ]
    for (const [from, to, expectedDelta] of cases) {
      const project = makeProject({ key: { tonic: from, scale: 'major' }, melody: [{ id: 'n1', pitch: 60, startStep: 0, lengthSteps: 2 }] })
      const result = transposeProject(project, { tonic: to, scale: 'major' })
      expect(result.melody[0].pitch - 60).toBe(expectedDelta)
    }
  })

  it('sets the new key on the returned project', () => {
    const project = makeProject()
    const result = transposeProject(project, { tonic: 7, scale: 'major' })
    expect(result.key).toEqual({ tonic: 7, scale: 'major' })
  })

  it('leaves chords untouched (degree-based, re-voices automatically)', () => {
    const project = makeProject()
    const result = transposeProject(project, { tonic: 7, scale: 'major' })
    expect(result.chords).toEqual(project.chords)
  })

  it('wraps melody notes by octave instead of clamping when they would fall out of range', () => {
    const project = makeProject({
      key: { tonic: 0, scale: 'major' },
      melody: [{ id: 'n1', pitch: MELODY_MAX_MIDI - 1, startStep: 0, lengthSteps: 2 }],
    })
    const result = transposeProject(project, { tonic: 5, scale: 'major' }) // +5 semitones
    expect(result.melody[0].pitch).toBeLessThanOrEqual(MELODY_MAX_MIDI)
    expect(result.melody[0].pitch).toBeGreaterThanOrEqual(MELODY_MIN_MIDI)
    expect(result.melody[0].pitch % 12).toBe((MELODY_MAX_MIDI - 1 + 5) % 12)
  })

  it('does not throw on an empty melody', () => {
    const project = makeProject({ melody: [] })
    expect(() => transposeProject(project, { tonic: 3, scale: 'minor' })).not.toThrow()
    expect(transposeProject(project, { tonic: 3, scale: 'minor' }).melody).toEqual([])
  })

  it('is a no-op shift when the new tonic equals the old one', () => {
    const project = makeProject()
    const result = transposeProject(project, { tonic: 0, scale: 'minor' })
    expect(result.melody[0].pitch).toBe(project.melody[0].pitch)
  })
})
