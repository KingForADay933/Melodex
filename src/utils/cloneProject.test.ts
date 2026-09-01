import { describe, expect, it } from 'vitest'
import type { ChordTrackItem, MelodyNote, Project, Section } from '../types/project'
import { cloneProject, cloneSection } from './cloneProject'

function makeChord(id: string): ChordTrackItem {
  return { id, degree: 1, extension: 'triad', inversion: 0 }
}

function makeNote(id: string): MelodyNote {
  return { id, pitch: 60, startStep: 0, lengthSteps: 2 }
}

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    id: 's1',
    name: 'Verse',
    chords: [makeChord('c1')],
    melody: [makeNote('n1')],
    bassline: [makeNote('b1')],
    harmonyMelody: [makeNote('h1')],
    ...overrides,
  }
}

function makeProject(sections: Section[]): Project {
  return {
    id: 'p1',
    name: 'Test Song',
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

describe('cloneSection', () => {
  it('gives the section, and every nested chord/note, a fresh id', () => {
    const section = makeSection()
    const clone = cloneSection(section)
    expect(clone.id).not.toBe(section.id)
    expect(clone.chords[0].id).not.toBe(section.chords[0].id)
    expect(clone.melody[0].id).not.toBe(section.melody[0].id)
  })

  it('clones the bassline and harmony layers too, not just the lead melody', () => {
    const section = makeSection()
    const clone = cloneSection(section)
    expect(clone.bassline).toHaveLength(1)
    expect(clone.bassline[0].id).not.toBe(section.bassline[0].id)
    expect(clone.harmonyMelody).toHaveLength(1)
    expect(clone.harmonyMelody[0].id).not.toBe(section.harmonyMelody[0].id)
  })

  it('defaults to appending "(copy)" to the name', () => {
    expect(cloneSection(makeSection({ name: 'Chorus' })).name).toBe('Chorus (copy)')
  })

  it('accepts an explicit name override', () => {
    expect(cloneSection(makeSection({ name: 'Chorus' }), 'Chorus 2').name).toBe('Chorus 2')
  })

  it('does not mutate the original', () => {
    const section = makeSection()
    cloneSection(section)
    expect(section.chords).toHaveLength(1)
    expect(section.chords[0].id).toBe('c1')
  })
})

describe('cloneProject', () => {
  it('gives the project, and every nested section/chord/note, a fresh id', () => {
    const project = makeProject([makeSection({ id: 's1' }), makeSection({ id: 's2', name: 'Chorus' })])
    const clone = cloneProject(project)
    expect(clone.id).not.toBe(project.id)
    expect(clone.sections.map((s) => s.id)).not.toEqual(project.sections.map((s) => s.id))
    expect(clone.sections[0].chords[0].id).not.toBe(project.sections[0].chords[0].id)
    expect(clone.sections[0].melody[0].id).not.toBe(project.sections[0].melody[0].id)
  })

  it('keeps each section\'s own name unchanged, not double-suffixed with "(copy)"', () => {
    const project = makeProject([makeSection({ name: 'Verse' }), makeSection({ id: 's2', name: 'Chorus' })])
    const clone = cloneProject(project)
    expect(clone.sections.map((s) => s.name)).toEqual(['Verse', 'Chorus'])
  })

  it('defaults to appending "(copy)" to the project name', () => {
    expect(cloneProject(makeProject([makeSection()])).name).toBe('Test Song (copy)')
  })

  it('accepts an explicit name override', () => {
    expect(cloneProject(makeProject([makeSection()]), 'Renamed').name).toBe('Renamed')
  })
})
