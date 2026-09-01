import { Midi } from '@tonejs/midi'
import { describe, expect, it } from 'vitest'
import { DEFAULT_BPM, MAX_BPM, MAX_IMPORT_BARS, MIN_BPM, STEPS_PER_BAR } from '../constants'
import { secondsPerStep } from '../export/midiExport'
import type { MelodyNote } from '../types/project'
import { buildProjectFromMidi } from './midiImport'

const STEP_SECONDS = secondsPerStep(DEFAULT_BPM)
const BAR_SECONDS = STEP_SECONDS * STEPS_PER_BAR

function stripNote({ pitch, startStep, lengthSteps }: MelodyNote) {
  return { pitch, startStep, lengthSteps }
}

function trackWithOneNote(midi: Midi): Midi {
  midi.addTrack().addNote({ midi: 60, time: 0, duration: 0.5, velocity: 0.8 })
  return midi
}

describe('buildProjectFromMidi — chord detection', () => {
  function buildProgressionMidi(): Midi {
    const midi = new Midi()
    midi.header.setTempo(DEFAULT_BPM)

    const chords = midi.addTrack()
    chords.name = 'Chords'
    const bars = [
      [60, 64, 67], // C major (I)
      [65, 69, 72], // F major (IV)
      [67, 71, 74], // G major (V)
      [60, 64, 67], // C major (I)
    ]
    bars.forEach((pitches, barIndex) => {
      for (const pitch of pitches) {
        chords.addNote({ midi: pitch, time: barIndex * BAR_SECONDS, duration: BAR_SECONDS, velocity: 0.8 })
      }
    })

    const melody = midi.addTrack()
    melody.name = 'Melody'
    melody.addNote({ midi: 76, time: 4 * STEP_SECONDS, duration: 2 * STEP_SECONDS, velocity: 0.9 })

    return midi
  }

  it('detects a I-IV-V-I progression from block triads, as plain root-position triads', () => {
    const { project } = buildProjectFromMidi(buildProgressionMidi(), 'progression.mid')
    const chords = project.sections[0].chords
    expect(chords.map((c) => c.degree)).toEqual([1, 4, 5, 1])
    expect(chords.every((c) => c.extension === 'triad' && c.inversion === 0 && !c.source)).toBe(true)
  })

  it('quantizes melody notes to steps and keeps pitch within the piano-roll range', () => {
    const { project } = buildProjectFromMidi(buildProgressionMidi(), 'progression.mid')
    expect(project.sections[0].melody.map(stripNote)).toEqual([{ pitch: 76, startStep: 4, lengthSteps: 2 }])
  })

  it('reuses the previous bar\'s chord for an interior silent bar, defaulting a leading silence to the tonic', () => {
    const midi = new Midi()
    midi.header.setTempo(DEFAULT_BPM)
    const track = midi.addTrack()
    for (const pitch of [60, 64, 67]) track.addNote({ midi: pitch, time: 0, duration: BAR_SECONDS, velocity: 0.8 }) // bar 0: I
    for (const pitch of [65, 69, 72]) track.addNote({ midi: pitch, time: BAR_SECONDS, duration: BAR_SECONDS, velocity: 0.8 }) // bar 1: IV
    // bar 2: silent — nothing added
    for (const pitch of [67, 71, 74]) track.addNote({ midi: pitch, time: 3 * BAR_SECONDS, duration: BAR_SECONDS, velocity: 0.8 }) // bar 3: V

    const { project } = buildProjectFromMidi(midi, 'silent.mid')
    expect(project.sections[0].chords.map((c) => c.degree)).toEqual([1, 4, 4, 5])
  })
})

describe('buildProjectFromMidi — key detection', () => {
  it('uses the file\'s key signature when present, ignoring note content', () => {
    const midi = new Midi()
    midi.header.keySignatures.push({ key: 'Eb', scale: 'minor', ticks: 0 })
    const { project } = buildProjectFromMidi(midi, 'x.mid')
    expect(project.key).toEqual({ tonic: 3, scale: 'minor' })
  })

  it('falls back to histogram scoring, preferring major on a relative-minor tie', () => {
    const midi = new Midi()
    midi.header.setTempo(DEFAULT_BPM)
    const track = midi.addTrack()
    // D major's 7 pitch classes: D E F# G A B C#. Its relative minor (B
    // minor) shares the exact same set, so this also exercises the
    // major-wins tie-break, not just "some scale got a perfect score".
    const dMajorPitchClasses = [2, 4, 6, 7, 9, 11, 1]
    dMajorPitchClasses.forEach((pc, i) => {
      track.addNote({ midi: 60 + pc, time: i * STEP_SECONDS, duration: STEP_SECONDS, velocity: 0.8 })
    })

    const { project } = buildProjectFromMidi(midi, 'x.mid')
    expect(project.key).toEqual({ tonic: 2, scale: 'major' })
  })

  it('defaults to C major when the file has no notes and no key signature', () => {
    const { project } = buildProjectFromMidi(new Midi(), 'x.mid')
    expect(project.key).toEqual({ tonic: 0, scale: 'major' })
  })
})

describe('buildProjectFromMidi — track classification', () => {
  it('a single unnamed track feeds melody entirely, leaving bass/harmony empty', () => {
    const midi = new Midi()
    midi.header.setTempo(DEFAULT_BPM)
    const track = midi.addTrack() // no name set
    for (const pitch of [60, 64, 67]) track.addNote({ midi: pitch, time: 0, duration: BAR_SECONDS, velocity: 0.8 })

    const { project } = buildProjectFromMidi(midi, 'solo.mid')
    const section = project.sections[0]
    expect(section.chords).toHaveLength(1)
    expect(section.chords[0].degree).toBe(1)
    expect(section.melody).toHaveLength(3)
    expect(section.bassline).toEqual([])
    expect(section.harmonyMelody).toEqual([])
  })

  it('excludes the percussion channel from key/chord detection, layers, and song length', () => {
    const midi = new Midi()
    midi.header.setTempo(DEFAULT_BPM)

    const melodic = midi.addTrack()
    melodic.name = 'Lead'
    for (const pitch of [60, 64, 67]) melodic.addNote({ midi: pitch, time: 0, duration: BAR_SECONDS, velocity: 0.8 }) // bar 0 only

    const drums = midi.addTrack()
    drums.name = 'Drums'
    drums.channel = 9
    drums.addNote({ midi: 36, time: 0, duration: STEP_SECONDS, velocity: 0.9 })
    drums.addNote({ midi: 38, time: 50 * BAR_SECONDS, duration: STEP_SECONDS, velocity: 0.9 }) // far out at bar 50

    const { project } = buildProjectFromMidi(midi, 'beat.mid')
    const section = project.sections[0]
    // Song length must come only from the melodic track (bar 0) — a drum
    // hit 50 bars out must not inflate the chord count.
    expect(section.chords).toHaveLength(1)
    const allLayerPitches = [...section.melody, ...section.bassline, ...section.harmonyMelody].map((n) => n.pitch)
    expect(allLayerPitches).not.toContain(36)
    expect(allLayerPitches).not.toContain(38)
  })
})

describe('buildProjectFromMidi — note dedup and bar cap', () => {
  it('drops a same-pitch overlap when two tracks get merged into one layer', () => {
    const midi = new Midi()
    midi.header.setTempo(DEFAULT_BPM)

    // Named "Bass" so it claims the bassline slot in pass 1, leaving both
    // unnamed tracks below to compete for melody in pass 2 — the loser
    // then merges into melody in pass 3, producing the overlap.
    const bass = midi.addTrack()
    bass.name = 'Bass'
    bass.addNote({ midi: 40, time: 0, duration: BAR_SECONDS, velocity: 0.8 })

    const trackA = midi.addTrack()
    trackA.addNote({ midi: 60, time: 0, duration: 2 * STEP_SECONDS, velocity: 0.8 })
    const trackB = midi.addTrack()
    trackB.addNote({ midi: 60, time: 1 * STEP_SECONDS, duration: 2 * STEP_SECONDS, velocity: 0.8 })

    const { project } = buildProjectFromMidi(midi, 'overlap.mid')
    expect(project.sections[0].melody.map(stripNote)).toEqual([{ pitch: 60, startStep: 0, lengthSteps: 2 }])
  })

  it('caps chords at MAX_IMPORT_BARS, clips a note spanning the boundary, and drops one entirely past it', () => {
    const midi = new Midi()
    midi.header.setTempo(DEFAULT_BPM)
    const track = midi.addTrack()

    const capStep = MAX_IMPORT_BARS * STEPS_PER_BAR
    const clippedStart = (MAX_IMPORT_BARS - 1) * STEPS_PER_BAR + 8 // inside the last kept bar
    track.addNote({ midi: 60, time: clippedStart * STEP_SECONDS, duration: 16 * STEP_SECONDS, velocity: 0.8 })
    track.addNote({ midi: 64, time: 140 * STEPS_PER_BAR * STEP_SECONDS, duration: STEP_SECONDS, velocity: 0.8 }) // well past the cap

    const { project, warnings } = buildProjectFromMidi(midi, 'long.mid')
    const section = project.sections[0]
    expect(section.chords).toHaveLength(MAX_IMPORT_BARS)
    expect(warnings.some((w) => w.includes('truncated'))).toBe(true)

    const clipped = section.melody.find((n) => n.pitch === 60)
    expect(clipped?.startStep).toBe(clippedStart)
    expect(clipped?.lengthSteps).toBe(capStep - clippedStart)
    expect(section.melody.some((n) => n.pitch === 64)).toBe(false)
  })
})

describe('buildProjectFromMidi — tempo detection', () => {
  it('defaults to DEFAULT_BPM when the file has no tempo event', () => {
    const { project } = buildProjectFromMidi(trackWithOneNote(new Midi()), 'x.mid')
    expect(project.tempo).toBe(DEFAULT_BPM)
  })

  it('clamps an out-of-range tempo into [MIN_BPM, MAX_BPM]', () => {
    const high = new Midi()
    high.header.setTempo(300)
    expect(buildProjectFromMidi(trackWithOneNote(high), 'x.mid').project.tempo).toBe(MAX_BPM)

    const low = new Midi()
    low.header.setTempo(10)
    expect(buildProjectFromMidi(trackWithOneNote(low), 'x.mid').project.tempo).toBe(MIN_BPM)
  })

  it('uses the first tempo and warns when the file has tempo changes', () => {
    const midi = new Midi()
    midi.header.setTempo(120)
    midi.header.tempos.push({ bpm: 200, ticks: 10000 })
    // header.update() recomputes each tempo event's derived `.time` field —
    // required after mutating `tempos` directly (per Header's own doc
    // comment), or any later note-time lookup binary-searches against an
    // entry with `.time === undefined` and never terminates.
    midi.header.update()

    const { project, warnings } = buildProjectFromMidi(trackWithOneNote(midi), 'x.mid')
    expect(project.tempo).toBe(120)
    expect(warnings.some((w) => w.toLowerCase().includes('tempo'))).toBe(true)
  })
})

describe('buildProjectFromMidi — project naming', () => {
  it('strips a .mid or .midi extension (case-insensitively) from the source filename', () => {
    expect(buildProjectFromMidi(new Midi(), 'My Song.mid').project.name).toBe('My Song')
    expect(buildProjectFromMidi(new Midi(), 'My Song.MIDI').project.name).toBe('My Song')
  })

  it('falls back to "Imported MIDI" when the name is empty after stripping', () => {
    expect(buildProjectFromMidi(new Midi(), '.midi').project.name).toBe('Imported MIDI')
  })
})
