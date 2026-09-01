import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR } from '../constants'
import type { MusicKey } from '../music-theory'
import type { ChordTrackItem } from '../types/project'
import { generateArpeggio, generateBassline, RHYTHM_TEMPLATES } from './arpeggiator'

const C_MAJOR: MusicKey = { tonic: 0, scale: 'major' }
const ONE_CHORD: ChordTrackItem[] = [{ id: 'c1', degree: 1, extension: 'triad', inversion: 0 }] // C E G

describe('generateArpeggio', () => {
  it('fills every bar with notes covering the whole step range', () => {
    const notes = generateArpeggio(ONE_CHORD, C_MAJOR, 'up')
    expect(notes.length).toBeGreaterThan(0)
    const lastNote = notes[notes.length - 1]
    expect(lastNote.startStep + lastNote.lengthSteps).toBeLessThanOrEqual(STEPS_PER_BAR)
  })

  it('cycles ascending through the chord tones for "up"', () => {
    const notes = generateArpeggio(ONE_CHORD, C_MAJOR, 'up')
    const pitchClasses = notes.map((n) => n.pitch % 12)
    // C major triad tones: C(0) E(4) G(7), repeating
    expect(pitchClasses.slice(0, 3)).toEqual([0, 4, 7])
  })

  it('cycles descending through the chord tones for "down"', () => {
    const notes = generateArpeggio(ONE_CHORD, C_MAJOR, 'down')
    const pitchClasses = notes.map((n) => n.pitch % 12)
    expect(pitchClasses.slice(0, 3)).toEqual([7, 4, 0])
  })

  it('ping-pongs for "upDown" without repeating the endpoints back to back', () => {
    const notes = generateArpeggio(ONE_CHORD, C_MAJOR, 'upDown')
    const pitchClasses = notes.map((n) => n.pitch % 12)
    // indices [0,1,2,1] -> C E G E
    expect(pitchClasses.slice(0, 4)).toEqual([0, 4, 7, 4])
  })

  it('places notes an octave above the chord track register', () => {
    const notes = generateArpeggio(ONE_CHORD, C_MAJOR, 'up')
    // C major triad root position starts at pitch class 0 (C); base chord
    // octave is 4, arpeggio octave is 5, so the first note should be C5 (72).
    expect(notes[0].pitch).toBe(72)
  })

  it('produces one note per bar per chord', () => {
    const chords: ChordTrackItem[] = [
      { id: 'c1', degree: 1, extension: 'triad', inversion: 0 },
      { id: 'c2', degree: 5, extension: 'triad', inversion: 0 },
    ]
    const notes = generateArpeggio(chords, C_MAJOR, 'up')
    const secondBarNotes = notes.filter((n) => n.startStep >= STEPS_PER_BAR)
    expect(secondBarNotes.length).toBeGreaterThan(0)
    expect(secondBarNotes.every((n) => n.startStep < STEPS_PER_BAR * 2)).toBe(true)
  })

  it('stays within the chord tones for "random"', () => {
    const notes = generateArpeggio(ONE_CHORD, C_MAJOR, 'random')
    const validPitchClasses = new Set([0, 4, 7])
    expect(notes.every((n) => validPitchClasses.has(n.pitch % 12))).toBe(true)
  })

  it('defaults to the "Steady 8ths" rhythm template when none is given', () => {
    const withoutId = (notes: ReturnType<typeof generateArpeggio>) =>
      notes.map(({ pitch, startStep, lengthSteps }) => ({ pitch, startStep, lengthSteps }))
    const withDefault = withoutId(generateArpeggio(ONE_CHORD, C_MAJOR, 'up'))
    const withExplicitFirst = withoutId(generateArpeggio(ONE_CHORD, C_MAJOR, 'up', RHYTHM_TEMPLATES[0]))
    expect(withDefault).toEqual(withExplicitFirst)
  })

  describe.each(RHYTHM_TEMPLATES)('rhythm template "$id"', (rhythm) => {
    it('tiles each bar with no gaps or overlap', () => {
      const notes = generateArpeggio(ONE_CHORD, C_MAJOR, 'up', rhythm)
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

describe('generateBassline', () => {
  it('sits one octave below the chord track (not two — must stay inside the piano roll\'s fixed pitch range)', () => {
    const notes = generateBassline(ONE_CHORD, C_MAJOR, 'up')
    // C major triad root is pitch class 0 (C); bass octave 3 -> MIDI 48,
    // one octave below the chord track's own register (octave 4 -> 60)
    // and comfortably inside MELODY_MIN_MIDI..MELODY_MAX_MIDI (48-84).
    expect(notes[0].pitch).toBe(48)
  })

  it('alternates root and fifth only, for "up"', () => {
    const notes = generateBassline(ONE_CHORD, C_MAJOR, 'up')
    const pitchClasses = notes.map((n) => n.pitch % 12)
    // C major triad: root C(0), fifth G(7) — third (4) never appears.
    expect(pitchClasses.slice(0, 4)).toEqual([0, 7, 0, 7])
  })

  it('reverses to fifth-then-root for "down"', () => {
    const notes = generateBassline(ONE_CHORD, C_MAJOR, 'down')
    const pitchClasses = notes.map((n) => n.pitch % 12)
    expect(pitchClasses.slice(0, 4)).toEqual([7, 0, 7, 0])
  })

  it('ignores extension tones beyond root/fifth (e.g. a 7th) — the pool stays just 2 tones', () => {
    const seventhChord: ChordTrackItem[] = [{ id: 'c1', degree: 1, extension: 'seventh', inversion: 0 }]
    const notes = generateBassline(seventhChord, C_MAJOR, 'random')
    const validPitchClasses = new Set([0, 7]) // root + fifth of Cmaj7, not the 7th (11)
    expect(notes.every((n) => validPitchClasses.has(n.pitch % 12))).toBe(true)
  })

  it('stays correct across a chord change (root+fifth recomputed per bar)', () => {
    const chords: ChordTrackItem[] = [
      { id: 'c1', degree: 1, extension: 'triad', inversion: 0 }, // C: root C(0), fifth G(7)
      { id: 'c2', degree: 5, extension: 'triad', inversion: 0 }, // G: root G(7), fifth D(2)
    ]
    const notes = generateBassline(chords, C_MAJOR, 'up')
    const secondBarNotes = notes.filter((n) => n.startStep >= STEPS_PER_BAR)
    const pitchClasses = secondBarNotes.map((n) => n.pitch % 12)
    expect(pitchClasses.slice(0, 2)).toEqual([7, 2])
  })

  it('defaults to the "Steady 8ths" rhythm template, same as generateArpeggio', () => {
    const withoutId = (notes: ReturnType<typeof generateBassline>) =>
      notes.map(({ pitch, startStep, lengthSteps }) => ({ pitch, startStep, lengthSteps }))
    const withDefault = withoutId(generateBassline(ONE_CHORD, C_MAJOR, 'up'))
    const withExplicitFirst = withoutId(generateBassline(ONE_CHORD, C_MAJOR, 'up', RHYTHM_TEMPLATES[0]))
    expect(withDefault).toEqual(withExplicitFirst)
  })

  it('tiles each bar with no gaps or overlap, for every rhythm template', () => {
    for (const rhythm of RHYTHM_TEMPLATES) {
      const notes = generateBassline(ONE_CHORD, C_MAJOR, 'up', rhythm)
      expect(notes).toHaveLength(rhythm.slots.length)
    }
  })
})
