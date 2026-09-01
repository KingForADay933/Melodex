import { describe, expect, it } from 'vitest'
import { getBorrowedRomanNumeral, getDiatonicChords } from './chords'
import { noteName, pitchClassToMidi } from './notes'
import { COMMON_PROGRESSIONS, getProgressionChords } from './progressions'
import { getScaleNotes, isInScale } from './scales'

describe('scales', () => {
  it('builds C major from the tonic pitch class', () => {
    // C D E F G A B
    expect(getScaleNotes(0, 'major')).toEqual([0, 2, 4, 5, 7, 9, 11])
  })

  it('builds A minor from the tonic pitch class', () => {
    // A B C D E F G
    expect(getScaleNotes(9, 'minor')).toEqual([9, 11, 0, 2, 4, 5, 7])
  })

  it('knows which pitch classes are in and out of key', () => {
    expect(isInScale(4, 0, 'major')).toBe(true) // E is in C major
    expect(isInScale(3, 0, 'major')).toBe(false) // D#/Eb is not
  })
})

describe('noteName', () => {
  it('spells sharp keys with sharps', () => {
    expect(noteName(6, 0, 'major')).toBe('F#') // C major context, still sharp default
    expect(noteName(1, 2, 'major')).toBe('C#') // D major uses sharps
  })

  it('spells flat keys with flats', () => {
    expect(noteName(10, 5, 'major')).toBe('Bb') // F major uses flats
    expect(noteName(8, 3, 'major')).toBe('Ab') // Eb major uses flats
  })

  it('spells minor keys using their relative major', () => {
    // D minor (tonic 2) is relative to F major (flats)
    expect(noteName(10, 2, 'minor')).toBe('Bb')
    // E minor (tonic 4) is relative to G major (sharps)
    expect(noteName(6, 4, 'minor')).toBe('F#')
  })
})

describe('pitchClassToMidi', () => {
  it('maps C4 to MIDI note 60', () => {
    expect(pitchClassToMidi(0, 4)).toBe(60)
  })

  it('maps A4 to MIDI note 69', () => {
    expect(pitchClassToMidi(9, 4)).toBe(69)
  })
})

describe('getDiatonicChords', () => {
  it('produces the correct triad qualities and roman numerals for C major', () => {
    const chords = getDiatonicChords(0, 'major')
    expect(chords.map((c) => c.roman)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'])
    expect(chords.map((c) => c.quality)).toEqual([
      'major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished',
    ])
    expect(chords.map((c) => c.rootName)).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    expect(chords[0].noteNames).toEqual(['C', 'E', 'G'])
  })

  it('produces the correct triad qualities and roman numerals for A minor', () => {
    const chords = getDiatonicChords(9, 'minor')
    expect(chords.map((c) => c.roman)).toEqual(['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'])
    expect(chords.map((c) => c.quality)).toEqual([
      'minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major',
    ])
    expect(chords[0].noteNames).toEqual(['A', 'C', 'E'])
  })

  it('spells chords correctly in a flat key (F major)', () => {
    const chords = getDiatonicChords(5, 'major')
    // IV chord in F major is Bb major, not A# major
    expect(chords[3].rootName).toBe('Bb')
    expect(chords[3].noteNames).toEqual(['Bb', 'D', 'F'])
  })
})

describe('getBorrowedRomanNumeral', () => {
  it('flags root-shifted borrowed chords (major key borrowing from natural minor) with a flat', () => {
    // C major borrowing from C minor: iii->bIII, vi->bVI, vii°->bVII
    expect(getBorrowedRomanNumeral(0, 'major', 3)).toBe('♭III')
    expect(getBorrowedRomanNumeral(0, 'major', 6)).toBe('♭VI')
    expect(getBorrowedRomanNumeral(0, 'major', 7)).toBe('♭VII')
  })

  it('needs no accidental when only the quality changes, not the root', () => {
    // C major borrowing from C minor: i, iv, v keep the same root, just minor
    expect(getBorrowedRomanNumeral(0, 'major', 1)).toBe('i')
    expect(getBorrowedRomanNumeral(0, 'major', 4)).toBe('iv')
    expect(getBorrowedRomanNumeral(0, 'major', 5)).toBe('v')
  })

  it('flags root-shifted borrowed chords with a sharp in the reverse direction (minor key borrowing from major)', () => {
    // A minor borrowing from A major: III->#iii
    expect(getBorrowedRomanNumeral(9, 'minor', 3)).toBe('♯iii')
  })
})

describe('getProgressionChords', () => {
  it('resolves I-V-vi-IV in C major to C, G, Am, F', () => {
    const chords = getProgressionChords(0, 'major', [1, 5, 6, 4])
    expect(chords.map((c) => c.rootName)).toEqual(['C', 'G', 'A', 'F'])
    expect(chords.map((c) => c.quality)).toEqual(['major', 'major', 'minor', 'major'])
  })

  it('resolves the same pattern differently in a minor key', () => {
    const chords = getProgressionChords(9, 'minor', [1, 5, 6, 4])
    expect(chords.map((c) => c.rootName)).toEqual(['A', 'E', 'F', 'D'])
    expect(chords.map((c) => c.quality)).toEqual(['minor', 'minor', 'major', 'minor'])
  })

  it('exposes every preset as a valid 1-7 degree pattern', () => {
    for (const preset of COMMON_PROGRESSIONS) {
      expect(preset.pattern.every((degree) => degree >= 1 && degree <= 7)).toBe(true)
      expect(() => getProgressionChords(0, 'major', preset.pattern)).not.toThrow()
    }
  })
})
