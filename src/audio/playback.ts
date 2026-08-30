import * as Tone from 'tone'
import { CHORD_OCTAVE, DEFAULT_BPM, STEPS_PER_BAR } from '../constants'
import { getDiatonicChords, pitchClassToMidi } from '../music-theory'
import type { Project } from '../types/project'

function midiToNoteName(midi: number): string {
  return Tone.Frequency(midi, 'midi').toNote()
}

/**
 * Thin wrapper around Tone.js that turns a Project into scheduled playback.
 * Kept separate from React/UI code so the audio engine can be reused (or
 * swapped) without touching component code, and vice versa.
 */
export class PlaybackEngine {
  private chordSynth: Tone.PolySynth
  private melodySynth: Tone.Synth
  private chordPart: Tone.Part | null = null
  private melodyPart: Tone.Part | null = null

  /** Called with the current 16th-note step during playback, or null when stopped. */
  onStepChange: ((step: number | null) => void) | null = null

  constructor() {
    this.chordSynth = new Tone.PolySynth(Tone.Synth).toDestination()
    this.chordSynth.set({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.8 },
    })

    this.melodySynth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.3 },
    }).toDestination()
    this.melodySynth.volume.value = -6
  }

  async play(project: Project): Promise<void> {
    await Tone.start()
    this.resetTransport()

    if (project.chords.length === 0) return

    Tone.Transport.bpm.value = DEFAULT_BPM
    const stepDuration = Tone.Time('16n').toSeconds()
    const totalSteps = project.chords.length * STEPS_PER_BAR

    const diatonicChords = getDiatonicChords(project.key.tonic, project.key.scale)

    const chordEvents: [number, { notes: string[] }][] = project.chords.map((item, index) => {
      const chord = diatonicChords[item.degree - 1]
      const notes = chord.notes.map((pc) => midiToNoteName(pitchClassToMidi(pc, CHORD_OCTAVE)))
      return [index * STEPS_PER_BAR * stepDuration, { notes }]
    })

    this.chordPart = new Tone.Part((time, event) => {
      this.chordSynth.triggerAttackRelease(event.notes, STEPS_PER_BAR * stepDuration * 0.95, time)
    }, chordEvents).start(0)

    const melodyEvents: [number, { note: string; duration: number }][] = project.melody.map((note) => [
      note.startStep * stepDuration,
      { note: midiToNoteName(note.pitch), duration: note.lengthSteps * stepDuration * 0.9 },
    ])

    this.melodyPart = new Tone.Part((time, event) => {
      this.melodySynth.triggerAttackRelease(event.note, event.duration, time)
    }, melodyEvents).start(0)

    if (this.onStepChange) {
      let step = 0
      Tone.Transport.scheduleRepeat((time) => {
        const current = step
        Tone.Draw.schedule(() => this.onStepChange?.(current), time)
        step += 1
      }, stepDuration, 0)
    }

    Tone.Transport.scheduleOnce(() => {
      this.stop()
    }, totalSteps * stepDuration)

    Tone.Transport.start()
  }

  /** Stops the transport and clears scheduled parts without notifying
   * onStepChange — used at the start of play() so beginning a new take
   * doesn't fire the "playback stopped" callback that a real stop does. */
  private resetTransport(): void {
    Tone.Transport.stop()
    Tone.Transport.cancel()
    this.chordPart?.dispose()
    this.melodyPart?.dispose()
    this.chordPart = null
    this.melodyPart = null
  }

  stop(): void {
    this.resetTransport()
    this.onStepChange?.(null)
  }

  dispose(): void {
    this.stop()
    this.chordSynth.dispose()
    this.melodySynth.dispose()
  }
}
