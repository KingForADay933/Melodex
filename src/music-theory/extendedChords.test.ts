import { describe, expect, it } from 'vitest'
import { getSecondaryDominantChord, getToneCount, getVoicedChord, voiceChordTones } from './extendedChords'

describe('getVoicedChord', () => {
  it('builds a plain major triad', () => {
    const chord = getVoicedChord(0, 'major', 1, 'triad', 0)
    expect(chord.symbol).toBe('C')
    expect(chord.pitchClasses).toEqual([0, 4, 7]) // C E G
    expect(chord.noteNames).toEqual(['C', 'E', 'G'])
  })

  it('builds a dominant 7th on the V degree', () => {
    const chord = getVoicedChord(0, 'major', 5, 'seventh', 0)
    expect(chord.symbol).toBe('G7')
    expect(chord.noteNames).toEqual(['G', 'B', 'D', 'F'])
  })

  it('builds a major 7th on the I degree', () => {
    const chord = getVoicedChord(0, 'major', 1, 'seventh', 0)
    expect(chord.symbol).toBe('Cmaj7')
    expect(chord.noteNames).toEqual(['C', 'E', 'G', 'B'])
  })

  it('builds a minor 7th on the ii degree', () => {
    const chord = getVoicedChord(0, 'major', 2, 'seventh', 0)
    expect(chord.symbol).toBe('Dm7')
    expect(chord.noteNames).toEqual(['D', 'F', 'A', 'C'])
  })

  it('builds a half-diminished 7th on the vii degree', () => {
    const chord = getVoicedChord(0, 'major', 7, 'seventh', 0)
    expect(chord.symbol).toBe('Bm7b5')
    expect(chord.noteNames).toEqual(['B', 'D', 'F', 'A'])
  })

  it('builds a minor 7th on a natural minor tonic', () => {
    const chord = getVoicedChord(9, 'minor', 1, 'seventh', 0)
    expect(chord.symbol).toBe('Am7')
    expect(chord.noteNames).toEqual(['A', 'C', 'E', 'G'])
  })

  it('builds a major 9th on the I degree', () => {
    const chord = getVoicedChord(0, 'major', 1, 'ninth', 0)
    expect(chord.symbol).toBe('Cmaj9')
    expect(chord.noteNames).toEqual(['C', 'E', 'G', 'B', 'D'])
  })

  it('builds sus2 and sus4 chords, replacing the third', () => {
    const sus2 = getVoicedChord(0, 'major', 1, 'sus2', 0)
    expect(sus2.symbol).toBe('Csus2')
    expect(sus2.noteNames).toEqual(['C', 'D', 'G'])

    const sus4 = getVoicedChord(0, 'major', 1, 'sus4', 0)
    expect(sus4.symbol).toBe('Csus4')
    expect(sus4.noteNames).toEqual(['C', 'F', 'G'])
  })

  it('labels an inversion as a slash chord', () => {
    const chord = getVoicedChord(0, 'major', 1, 'triad', 1)
    expect(chord.symbol).toBe('C/E')
    expect(chord.inversion).toBe(1)
  })

  it('spells chords correctly in a flat key', () => {
    const chord = getVoicedChord(5, 'major', 4, 'seventh', 0) // F major, IV = Bbmaj7
    expect(chord.rootName).toBe('Bb')
    expect(chord.symbol).toBe('Bbmaj7')
  })

  it('wraps out-of-range inversions', () => {
    const chord = getVoicedChord(0, 'major', 1, 'triad', 5) // triad has 3 tones, 5 % 3 = 2
    expect(chord.inversion).toBe(2)
  })
})

describe('getSecondaryDominantChord', () => {
  it('builds V/V (resolves to the V degree) as a dominant 7th', () => {
    // C major: V degree is G (root 7); a fifth above that is D.
    const chord = getSecondaryDominantChord(0, 'major', 5, 'seventh', 0)
    expect(chord.rootName).toBe('D')
    expect(chord.symbol).toBe('D7')
    expect(chord.noteNames).toEqual(['D', 'F#', 'A', 'C'])
  })

  it('builds V/vi (resolves to the vi degree) as a dominant 7th', () => {
    // C major: vi degree is A (root 9); a fifth above that is E.
    const chord = getSecondaryDominantChord(0, 'major', 6, 'seventh', 0)
    expect(chord.rootName).toBe('E')
    expect(chord.symbol).toBe('E7')
    expect(chord.noteNames).toEqual(['E', 'G#', 'B', 'D'])
  })

  it('builds a plain major triad (not maj7) when extension is triad', () => {
    // C major: ii degree is D (root 2); a fifth above that is A.
    const chord = getSecondaryDominantChord(0, 'major', 2, 'triad', 0)
    expect(chord.rootName).toBe('A')
    expect(chord.symbol).toBe('A')
    expect(chord.quality).toBe('major')
  })

  it('never produces a "maj7" symbol — the seventh is always a dominant (minor) seventh', () => {
    for (let degree = 2; degree <= 6; degree += 1) {
      const chord = getSecondaryDominantChord(0, 'major', degree, 'seventh', 0)
      expect(chord.symbol).not.toContain('maj')
    }
  })

  it('supports ninth/sus2/sus4 extensions with the correct tone count', () => {
    expect(getSecondaryDominantChord(0, 'major', 5, 'ninth', 0).pitchClasses).toHaveLength(5)
    expect(getSecondaryDominantChord(0, 'major', 5, 'sus2', 0).pitchClasses).toHaveLength(3)
    expect(getSecondaryDominantChord(0, 'major', 5, 'sus4', 0).pitchClasses).toHaveLength(3)
  })

  it('reflects inversion as a slash chord', () => {
    const chord = getSecondaryDominantChord(0, 'major', 5, 'triad', 1)
    expect(chord.symbol).toBe('D/F#')
    expect(chord.inversion).toBe(1)
  })
})

describe('getToneCount', () => {
  it('reports the right tone count per extension', () => {
    expect(getToneCount('triad')).toBe(3)
    expect(getToneCount('sus2')).toBe(3)
    expect(getToneCount('sus4')).toBe(3)
    expect(getToneCount('seventh')).toBe(4)
    expect(getToneCount('ninth')).toBe(5)
  })
})

describe('voiceChordTones', () => {
  const cMajorTriad = [0, 4, 7] // C E G

  it('voices root position ascending from the base octave', () => {
    expect(voiceChordTones(cMajorTriad, 4, 0)).toEqual([60, 64, 67]) // C4 E4 G4
  })

  it('voices first inversion with the third in the bass', () => {
    expect(voiceChordTones(cMajorTriad, 4, 1)).toEqual([64, 67, 72]) // E4 G4 C5
  })

  it('voices second inversion with the fifth in the bass', () => {
    expect(voiceChordTones(cMajorTriad, 4, 2)).toEqual([67, 72, 76]) // G4 C5 E5
  })

  it('always produces strictly ascending MIDI notes', () => {
    for (let inversion = 0; inversion < 4; inversion += 1) {
      const notes = voiceChordTones([0, 4, 7, 11], 4, inversion) // Cmaj7
      for (let i = 1; i < notes.length; i += 1) {
        expect(notes[i]).toBeGreaterThan(notes[i - 1])
      }
    }
  })
})
