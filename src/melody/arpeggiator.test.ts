import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR } from '../constants'
import type { Project } from '../types/project'
import { generateArpeggio, RHYTHM_TEMPLATES } from './arpeggiator'

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'test',
    name: 'Test',
    key: { tonic: 0, scale: 'major' }, // C major
    chords: [
      { id: 'c1', degree: 1, extension: 'triad', inversion: 0 }, // C E G
    ],
    melody: [],
    tempo: 100,
    chordInstrument: 'warm',
    melodyInstrument: 'pluck',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

describe('generateArpeggio', () => {
  it('fills every bar with notes covering the whole step range', () => {
    const project = makeProject()
    const notes = generateArpeggio(project, 'up')
    expect(notes.length).toBeGreaterThan(0)
    const lastNote = notes[notes.length - 1]
    expect(lastNote.startStep + lastNote.lengthSteps).toBeLessThanOrEqual(STEPS_PER_BAR)
  })

  it('cycles ascending through the chord tones for "up"', () => {
    const project = makeProject()
    const notes = generateArpeggio(project, 'up')
    const pitchClasses = notes.map((n) => n.pitch % 12)
    // C major triad tones: C(0) E(4) G(7), repeating
    expect(pitchClasses.slice(0, 3)).toEqual([0, 4, 7])
  })

  it('cycles descending through the chord tones for "down"', () => {
    const project = makeProject()
    const notes = generateArpeggio(project, 'down')
    const pitchClasses = notes.map((n) => n.pitch % 12)
    expect(pitchClasses.slice(0, 3)).toEqual([7, 4, 0])
  })

  it('ping-pongs for "upDown" without repeating the endpoints back to back', () => {
    const project = makeProject()
    const notes = generateArpeggio(project, 'upDown')
    const pitchClasses = notes.map((n) => n.pitch % 12)
    // indices [0,1,2,1] -> C E G E
    expect(pitchClasses.slice(0, 4)).toEqual([0, 4, 7, 4])
  })

  it('places notes an octave above the chord track register', () => {
    const project = makeProject()
    const notes = generateArpeggio(project, 'up')
    // C major triad root position starts at pitch class 0 (C); base chord
    // octave is 4, arpeggio octave is 5, so the first note should be C5 (72).
    expect(notes[0].pitch).toBe(72)
  })

  it('produces one note per bar per chord', () => {
    const project = makeProject({
      chords: [
        { id: 'c1', degree: 1, extension: 'triad', inversion: 0 },
        { id: 'c2', degree: 5, extension: 'triad', inversion: 0 },
      ],
    })
    const notes = generateArpeggio(project, 'up')
    const secondBarNotes = notes.filter((n) => n.startStep >= STEPS_PER_BAR)
    expect(secondBarNotes.length).toBeGreaterThan(0)
    expect(secondBarNotes.every((n) => n.startStep < STEPS_PER_BAR * 2)).toBe(true)
  })

  it('stays within the chord tones for "random"', () => {
    const project = makeProject()
    const notes = generateArpeggio(project, 'random')
    const validPitchClasses = new Set([0, 4, 7])
    expect(notes.every((n) => validPitchClasses.has(n.pitch % 12))).toBe(true)
  })

  it('defaults to the "Steady 8ths" rhythm template when none is given', () => {
    const project = makeProject()
    const withoutId = (notes: ReturnType<typeof generateArpeggio>) =>
      notes.map(({ pitch, startStep, lengthSteps }) => ({ pitch, startStep, lengthSteps }))
    const withDefault = withoutId(generateArpeggio(project, 'up'))
    const withExplicitFirst = withoutId(generateArpeggio(project, 'up', RHYTHM_TEMPLATES[0]))
    expect(withDefault).toEqual(withExplicitFirst)
  })

  describe.each(RHYTHM_TEMPLATES)('rhythm template "$id"', (rhythm) => {
    it('tiles each bar with no gaps or overlap', () => {
      const project = makeProject()
      const notes = generateArpeggio(project, 'up', rhythm)
      expect(notes).toHaveLength(rhythm.slots.length)

      const sorted = [...notes].sort((a, b) => a.startStep - b.startStep)
      let expectedNextStep = 0
      for (const note of sorted) {
        expect(note.startStep).toBe(expectedNextStep)
        expectedNextStep += note.lengthSteps
      }
      expect(expectedNextStep).toBe(STEPS_PER_BAR)
    })
  })
})
