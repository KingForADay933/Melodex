import { Midi } from '@tonejs/midi'
import { BEATS_PER_BAR, CHORD_OCTAVE, STEPS_PER_BAR } from '../constants'
import { getVoicedChord, voiceChordTones } from '../music-theory'
import type { Project } from '../types/project'
import { sanitizeFilename, triggerDownload } from './downloadHelpers'

type MidiTrack = ReturnType<Midi['addTrack']>

function secondsPerStep(tempo: number): number {
  return (60 / tempo) * (BEATS_PER_BAR / STEPS_PER_BAR)
}

function addChordNotes(track: MidiTrack, project: Project): void {
  const stepSize = secondsPerStep(project.tempo)
  const duration = STEPS_PER_BAR * stepSize

  project.chords.forEach((item, index) => {
    const voiced = getVoicedChord(project.key.tonic, project.key.scale, item.degree, item.extension, item.inversion)
    const midiNotes = voiceChordTones(voiced.pitchClasses, CHORD_OCTAVE, item.inversion)
    const startTime = index * STEPS_PER_BAR * stepSize
    for (const midi of midiNotes) {
      track.addNote({ midi, time: startTime, duration, velocity: 0.8 })
    }
  })
}

function addMelodyNotes(track: MidiTrack, project: Project): void {
  const stepSize = secondsPerStep(project.tempo)
  for (const note of project.melody) {
    track.addNote({
      midi: note.pitch,
      time: note.startStep * stepSize,
      duration: note.lengthSteps * stepSize,
      velocity: 0.9,
    })
  }
}

/** Two-track MIDI file (chords + melody) combined — the single-file export. */
export function buildProjectMidi(project: Project): Midi {
  const midi = new Midi()
  midi.header.setTempo(project.tempo)

  const chordTrack = midi.addTrack()
  chordTrack.name = 'Chords'
  addChordNotes(chordTrack, project)

  const melodyTrack = midi.addTrack()
  melodyTrack.name = 'Melody'
  addMelodyNotes(melodyTrack, project)

  return midi
}

/** Single-track MIDI file with just the chords — used by the multi-track zip export. */
export function buildChordsOnlyMidi(project: Project): Midi {
  const midi = new Midi()
  midi.header.setTempo(project.tempo)
  const track = midi.addTrack()
  track.name = 'Chords'
  addChordNotes(track, project)
  return midi
}

/** Single-track MIDI file with just the melody — used by the multi-track zip export. */
export function buildMelodyOnlyMidi(project: Project): Midi {
  const midi = new Midi()
  midi.header.setTempo(project.tempo)
  const track = midi.addTrack()
  track.name = 'Melody'
  addMelodyNotes(track, project)
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
export function downloadProjectMidi(project: Project, filename = `${sanitizeFilename(project.name)}.mid`): void {
  const blob = new Blob([midiToArrayBuffer(buildProjectMidi(project))], { type: 'audio/midi' })
  triggerDownload(blob, filename)
}
