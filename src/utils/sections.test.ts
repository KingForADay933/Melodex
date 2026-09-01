import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR } from '../constants'
import type { ChordTrackItem, MelodyNote, Project, Section } from '../types/project'
import {
  flattenChords,
  flattenMelody,
  flattenNotes,
  getActiveSection,
  getProjectTotalSteps,
  getSectionBarOffset,
  getSectionDisplaySteps,
  getTotalChordCount,
  getTotalNoteCount,
} from './sections'

function makeChord(overrides: Partial<ChordTrackItem> = {}): ChordTrackItem {
  return { id: 'c', degree: 1, extension: 'triad', inversion: 0, ...overrides }
}

function makeNote(overrides: Partial<MelodyNote> = {}): MelodyNote {
  return { id: 'n', pitch: 60, startStep: 0, lengthSteps: 2, ...overrides }
}

function makeSection(overrides: Partial<Section> = {}): Section {
  return { id: 's1', name: 'Section', chords: [], melody: [], bassline: [], harmonyMelody: [], ...overrides }
}

describe('getSectionDisplaySteps', () => {
  it('is at least one bar even for an empty section', () => {
    expect(getSectionDisplaySteps(makeSection())).toBe(STEPS_PER_BAR)
  })

  it('scales with the section\'s own chord count', () => {
    const section = makeSection({ chords: [makeChord(), makeChord(), makeChord()] })
    expect(getSectionDisplaySteps(section)).toBe(3 * STEPS_PER_BAR)
  })
})

describe('getProjectTotalSteps', () => {
  it('is 0 when every section is empty (unlike getSectionDisplaySteps)', () => {
    expect(getProjectTotalSteps([makeSection(), makeSection({ id: 's2' })])).toBe(0)
  })

  it('sums timeline steps across sections without padding empty ones', () => {
    const sections = [
      makeSection({ id: 's1', chords: [makeChord(), makeChord()] }), // 2 bars
      makeSection({ id: 's2' }), // empty -> 0 bars, not padded to 1
      makeSection({ id: 's3', chords: [makeChord()] }), // 1 bar
    ]
    expect(getProjectTotalSteps(sections)).toBe(3 * STEPS_PER_BAR)
  })
})

describe('flattenChords', () => {
  it('assigns absolute bar indices across section boundaries', () => {
    const sections = [
      makeSection({ id: 's1', chords: [makeChord({ id: 'a' }), makeChord({ id: 'b' })] }),
      makeSection({ id: 's2', chords: [makeChord({ id: 'c' })] }),
    ]
    const flat = flattenChords(sections)
    expect(flat.map((e) => [e.item.id, e.barIndex])).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 2],
    ])
  })

  it('skips empty sections without leaving a bar-index gap', () => {
    const sections = [
      makeSection({ id: 's1', chords: [makeChord({ id: 'a' })] }),
      makeSection({ id: 's2' }), // empty
      makeSection({ id: 's3', chords: [makeChord({ id: 'b' })] }),
    ]
    const flat = flattenChords(sections)
    expect(flat.map((e) => [e.item.id, e.barIndex])).toEqual([
      ['a', 0],
      ['b', 1],
    ])
  })
})

describe('flattenMelody', () => {
  it('shifts each section\'s notes by the cumulative step offset of prior sections', () => {
    const sections = [
      makeSection({ id: 's1', chords: [makeChord(), makeChord()], melody: [makeNote({ id: 'n1', startStep: 0 })] }), // 2 bars = 32 steps
      makeSection({ id: 's2', chords: [makeChord()], melody: [makeNote({ id: 'n2', startStep: 4 })] }),
    ]
    const flat = flattenMelody(sections)
    expect(flat.find((n) => n.id === 'n1')?.startStep).toBe(0)
    expect(flat.find((n) => n.id === 'n2')?.startStep).toBe(2 * STEPS_PER_BAR + 4)
  })

  it('does not mutate the original notes', () => {
    const note = makeNote({ id: 'n1', startStep: 0 })
    const sections = [makeSection({ chords: [makeChord()], melody: [note] }), makeSection({ id: 's2', chords: [makeChord()] })]
    flattenMelody(sections)
    expect(note.startStep).toBe(0)
  })
})

describe('flattenNotes', () => {
  it('applies the same offset math to the bassline and harmony layers', () => {
    const sections = [
      makeSection({ id: 's1', chords: [makeChord(), makeChord()], bassline: [makeNote({ id: 'b1', startStep: 0 })] }), // 2 bars
      makeSection({ id: 's2', chords: [makeChord()], harmonyMelody: [makeNote({ id: 'h1', startStep: 4 })] }),
    ]
    expect(flattenNotes(sections, 'bassline').find((n) => n.id === 'b1')?.startStep).toBe(0)
    expect(flattenNotes(sections, 'harmonyMelody').find((n) => n.id === 'h1')?.startStep).toBe(2 * STEPS_PER_BAR + 4)
  })

  it('flattenMelody is equivalent to flattenNotes(sections, "melody")', () => {
    const sections = [makeSection({ chords: [makeChord()], melody: [makeNote({ id: 'n1' })] })]
    expect(flattenMelody(sections)).toEqual(flattenNotes(sections, 'melody'))
  })
})

describe('getSectionBarOffset', () => {
  it('returns 0 for the first section and the cumulative bar count for later ones', () => {
    const sections = [
      makeSection({ id: 's1', chords: [makeChord(), makeChord()] }),
      makeSection({ id: 's2', chords: [makeChord()] }),
      makeSection({ id: 's3' }),
    ]
    expect(getSectionBarOffset(sections, 's1')).toBe(0)
    expect(getSectionBarOffset(sections, 's2')).toBe(2)
    expect(getSectionBarOffset(sections, 's3')).toBe(3)
  })
})

describe('getActiveSection', () => {
  function makeProject(sections: Section[]): Project {
    return {
      id: 'p',
      name: 'Test',
      key: { tonic: 0, scale: 'major' },
      sections,
      tempo: 100,
      chordInstrument: 'warm',
      melodyInstrument: 'pluck',
      bassInstrument: 'warm',
      harmonyInstrument: 'bright',
      createdAt: 0,
      updatedAt: 0,
    }
  }

  it('finds the section matching the given id', () => {
    const sections = [makeSection({ id: 's1' }), makeSection({ id: 's2' })]
    expect(getActiveSection(makeProject(sections), 's2').id).toBe('s2')
  })

  it('falls back to the first section when the id is stale', () => {
    const sections = [makeSection({ id: 's1' }), makeSection({ id: 's2' })]
    expect(getActiveSection(makeProject(sections), 'deleted').id).toBe('s1')
  })
})

describe('getTotalChordCount / getTotalNoteCount', () => {
  it('sums chords across all sections', () => {
    const sections = [
      makeSection({ id: 's1', chords: [makeChord(), makeChord()], melody: [makeNote()] }),
      makeSection({ id: 's2', chords: [makeChord()], melody: [makeNote(), makeNote()] }),
    ]
    expect(getTotalChordCount(sections)).toBe(3)
  })

  it('sums notes across melody, bassline, and harmony layers in every section', () => {
    const sections = [
      makeSection({ id: 's1', melody: [makeNote()], bassline: [makeNote(), makeNote()] }),
      makeSection({ id: 's2', melody: [makeNote(), makeNote()], harmonyMelody: [makeNote()] }),
    ]
    expect(getTotalNoteCount(sections)).toBe(6)
  })
})
