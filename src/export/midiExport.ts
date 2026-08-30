import { Midi } from '@tonejs/midi'
import { BEATS_PER_BAR, CHORD_OCTAVE, DEFAULT_BPM, STEPS_PER_BAR } from '../constants'
import { getDiatonicChords, pitchClassToMidi } from '../music-theory'
import type { Project } from '../types/project'

const SECONDS_PER_STEP = (60 / DEFAULT_BPM) * (BEATS_PER_BAR / STEPS_PER_BAR)

/**
 * Builds a two-track MIDI file (chords + melody) from a project. Phase 0
 * exports both parts combined into a single .mid file rather than split
 * files — per-track separated export is a later-phase feature.
 */
export function buildProjectMidi(project: Project): Midi {
  const midi = new Midi()
  midi.header.setTempo(DEFAULT_BPM)

  const chordTrack = midi.addTrack()
  chordTrack.name = 'Chords'
  const diatonicChords = getDiatonicChords(project.key.tonic, project.key.scale)

  project.chords.forEach((item, index) => {
    const chord = diatonicChords[item.degree - 1]
    const startTime = index * STEPS_PER_BAR * SECONDS_PER_STEP
    const duration = STEPS_PER_BAR * SECONDS_PER_STEP
    for (const pitchClass of chord.notes) {
      chordTrack.addNote({
        midi: pitchClassToMidi(pitchClass, CHORD_OCTAVE),
        time: startTime,
        duration,
        velocity: 0.8,
      })
    }
  })

  const melodyTrack = midi.addTrack()
  melodyTrack.name = 'Melody'
  for (const note of project.melody) {
    melodyTrack.addNote({
      midi: note.pitch,
      time: note.startStep * SECONDS_PER_STEP,
      duration: note.lengthSteps * SECONDS_PER_STEP,
      velocity: 0.9,
    })
  }

  return midi
}

/** Builds the project's MIDI file and triggers a browser download. */
export function downloadProjectMidi(project: Project, filename = 'chord-sketch.mid'): void {
  const midi = buildProjectMidi(project)
  const bytes = midi.toArray()
  // Copy into a plain ArrayBuffer — Blob won't accept the ArrayBufferLike
  // (possibly-SharedArrayBuffer)-backed Uint8Array that toArray() returns.
  const arrayBuffer = new ArrayBuffer(bytes.length)
  new Uint8Array(arrayBuffer).set(bytes)
  const blob = new Blob([arrayBuffer], { type: 'audio/midi' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()

  URL.revokeObjectURL(url)
}
