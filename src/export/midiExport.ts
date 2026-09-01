import { Midi } from '@tonejs/midi'
import { INSTRUMENT_PRESETS } from '../audio/instruments'
import { BEATS_PER_BAR, CHORD_OCTAVE, STEPS_PER_BAR } from '../constants'
import { voiceChordTones } from '../music-theory'
import type { Project } from '../types/project'
import { resolveChord } from '../utils/resolveChord'
import { flattenChords, flattenMelody } from '../utils/sections'
import { sanitizeFilename, triggerDownload } from './downloadHelpers'

type MidiTrack = ReturnType<Midi['addTrack']>

export interface ExportOptions {
  filename?: string
  /** Adds subtle random timing/velocity variation so the export doesn't
   * sound perfectly quantized when dropped into a DAW. Off by default so
   * existing exports are unaffected unless explicitly opted in. */
  humanize?: boolean
}

function secondsPerStep(tempo: number): number {
  return (60 / tempo) * (BEATS_PER_BAR / STEPS_PER_BAR)
}

const HUMANIZE_TIME_JITTER_RATIO = 0.15
const HUMANIZE_VELOCITY_JITTER = 0.08
const HUMANIZE_MIN_VELOCITY = 0.4
const HUMANIZE_MAX_VELOCITY = 1

/** Nudges a note's time/velocity by a small random amount, tempo-relative
 * (jitter is a fraction of one step's duration) so the feel scales with
 * tempo instead of always jittering by a fixed number of seconds. */
function applyHumanize(time: number, velocity: number, stepSeconds: number): { time: number; velocity: number } {
  const timeJitter = stepSeconds * HUMANIZE_TIME_JITTER_RATIO
  return {
    time: Math.max(0, time + (Math.random() * 2 - 1) * timeJitter),
    velocity: Math.min(
      HUMANIZE_MAX_VELOCITY,
      Math.max(HUMANIZE_MIN_VELOCITY, velocity + (Math.random() * 2 - 1) * HUMANIZE_VELOCITY_JITTER),
    ),
  }
}

function addChordNotes(track: MidiTrack, project: Project, options: ExportOptions): void {
  const stepSize = secondsPerStep(project.tempo)
  const duration = STEPS_PER_BAR * stepSize

  flattenChords(project.sections).forEach(({ item, barIndex }) => {
    const voiced = resolveChord(project.key, item)
    const midiNotes = voiceChordTones(voiced.pitchClasses, CHORD_OCTAVE, item.inversion)
    const startTime = barIndex * STEPS_PER_BAR * stepSize
    for (const midi of midiNotes) {
      const { time, velocity } = options.humanize ? applyHumanize(startTime, 0.8, stepSize) : { time: startTime, velocity: 0.8 }
      track.addNote({ midi, time, duration, velocity })
    }
  })
}

function addMelodyNotes(track: MidiTrack, project: Project, options: ExportOptions): void {
  const stepSize = secondsPerStep(project.tempo)
  for (const note of flattenMelody(project.sections)) {
    const startTime = note.startStep * stepSize
    const { time, velocity } = options.humanize ? applyHumanize(startTime, 0.9, stepSize) : { time: startTime, velocity: 0.9 }
    track.addNote({ midi: note.pitch, time, duration: note.lengthSteps * stepSize, velocity })
  }
}

/** Two-track MIDI file (chords + melody) combined — the single-file export. */
export function buildProjectMidi(project: Project, options: ExportOptions = {}): Midi {
  const midi = new Midi()
  midi.header.setTempo(project.tempo)

  const chordTrack = midi.addTrack()
  chordTrack.name = 'Chords'
  chordTrack.instrument.number = INSTRUMENT_PRESETS[project.chordInstrument].midiProgram
  addChordNotes(chordTrack, project, options)

  const melodyTrack = midi.addTrack()
  melodyTrack.name = 'Melody'
  melodyTrack.instrument.number = INSTRUMENT_PRESETS[project.melodyInstrument].midiProgram
  addMelodyNotes(melodyTrack, project, options)

  return midi
}

/** Single-track MIDI file with just the chords — used by the multi-track zip export. */
export function buildChordsOnlyMidi(project: Project, options: ExportOptions = {}): Midi {
  const midi = new Midi()
  midi.header.setTempo(project.tempo)
  const track = midi.addTrack()
  track.name = 'Chords'
  track.instrument.number = INSTRUMENT_PRESETS[project.chordInstrument].midiProgram
  addChordNotes(track, project, options)
  return midi
}

/** Single-track MIDI file with just the melody — used by the multi-track zip export. */
export function buildMelodyOnlyMidi(project: Project, options: ExportOptions = {}): Midi {
  const midi = new Midi()
  midi.header.setTempo(project.tempo)
  const track = midi.addTrack()
  track.name = 'Melody'
  track.instrument.number = INSTRUMENT_PRESETS[project.melodyInstrument].midiProgram
  addMelodyNotes(track, project, options)
  return midi
}

/** Copies a Midi file's bytes into a plain ArrayBuffer — Blob won't accept
 * the ArrayBufferLike (possibly-SharedArrayBuffer)-backed Uint8Array that
 * toArray() returns directly. */
export function midiToArrayBuffer(midi: Midi): ArrayBuffer {
  const bytes = midi.toArray()
  const arrayBuffer = new ArrayBuffer(bytes.length)
  new Uint8Array(arrayBuffer).set(bytes)
  return arrayBuffer
}

/** Builds the project's combined MIDI file and triggers a browser download. */
export function downloadProjectMidi(project: Project, options: ExportOptions = {}): void {
  const filename = options.filename ?? `${sanitizeFilename(project.name)}.mid`
  const blob = new Blob([midiToArrayBuffer(buildProjectMidi(project, options))], { type: 'audio/midi' })
  triggerDownload(blob, filename)
}
