import { describe, expect, it } from 'vitest'
import { MELODY_MAX_MIDI, MELODY_MIN_MIDI } from '../constants'
import type { Project, Section } from '../types/project'
import { transposeProject, wrapIntoRange } from './transpose'

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    id: 's1',
    name: 'Section 1',
    chords: [{ id: 'c1', degree: 1, extension: 'triad', inversion: 0 }],
    melody: [{ id: 'n1', pitch: 60, startStep: 0, lengthSteps: 2 }], // C4
    bassline: [],
    harmonyMelody: [],
    ...overrides,
  }
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'test',
    name: 'Test',
    key: { tonic: 0, scale: 'major' }, // C major
    sections: [makeSection()],
    tempo: 100,
    chordInstrument: 'warm',
    melodyInstrument: 'pluck',
    bassInstrument: 'warm',
    harmonyInstrument: 'bright',
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
      const project = makeProject({ key: { tonic: from, scale: 'major' } })
      const result = transposeProject(project, { tonic: to, scale: 'major' })
      expect(result.sections[0].melody[0].pitch - 60).toBe(expectedDelta)
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
    expect(result.sections[0].chords).toEqual(project.sections[0].chords)
  })

  it('wraps melody notes by octave instead of clamping when they would fall out of range', () => {
    const project = makeProject({
      key: { tonic: 0, scale: 'major' },
      sections: [makeSection({ melody: [{ id: 'n1', pitch: MELODY_MAX_MIDI - 1, startStep: 0, lengthSteps: 2 }] })],
    })
    const result = transposeProject(project, { tonic: 5, scale: 'major' }) // +5 semitones
    const pitch = result.sections[0].melody[0].pitch
    expect(pitch).toBeLessThanOrEqual(MELODY_MAX_MIDI)
    expect(pitch).toBeGreaterThanOrEqual(MELODY_MIN_MIDI)
    expect(pitch % 12).toBe((MELODY_MAX_MIDI - 1 + 5) % 12)
  })

  it('does not throw on an empty melody', () => {
    const project = makeProject({ sections: [makeSection({ melody: [] })] })
    expect(() => transposeProject(project, { tonic: 3, scale: 'minor' })).not.toThrow()
    expect(transposeProject(project, { tonic: 3, scale: 'minor' }).sections[0].melody).toEqual([])
  })

  it('is a no-op shift when the new tonic equals the old one', () => {
    const project = makeProject()
    const result = transposeProject(project, { tonic: 0, scale: 'minor' })
    expect(result.sections[0].melody[0].pitch).toBe(project.sections[0].melody[0].pitch)
  })

  it('shifts bassline and harmony notes by the same delta as the lead melody', () => {
    const project = makeProject({
      sections: [
        makeSection({
          bassline: [{ id: 'b1', pitch: 48, startStep: 0, lengthSteps: 2 }],
          harmonyMelody: [{ id: 'h1', pitch: 72, startStep: 0, lengthSteps: 2 }],
        }),
      ],
    })
    const result = transposeProject(project, { tonic: 5, scale: 'major' }) // +5 semitones
    expect(result.sections[0].bassline[0].pitch).toBe(53)
    expect(result.sections[0].harmonyMelody[0].pitch).toBe(77)
  })

  it('shifts melody in every section, not just the first', () => {
    const project = makeProject({
      sections: [
        makeSection({ id: 's1', melody: [{ id: 'n1', pitch: 60, startStep: 0, lengthSteps: 2 }] }),
        makeSection({ id: 's2', melody: [{ id: 'n2', pitch: 64, startStep: 0, lengthSteps: 2 }] }),
      ],
    })
    const result = transposeProject(project, { tonic: 5, scale: 'major' }) // +5 semitones
    expect(result.sections[0].melody[0].pitch).toBe(65)
    expect(result.sections[1].melody[0].pitch).toBe(69)
  })
})
