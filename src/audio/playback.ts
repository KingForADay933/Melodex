import * as Tone from 'tone'
import { CHORD_OCTAVE, STEPS_PER_BAR } from '../constants'
import { getVoicedChord, voiceChordTones } from '../music-theory'
import type { Project } from '../types/project'
import { INSTRUMENT_PRESETS } from './instruments'

function midiToNoteName(midi: number): string {
  return Tone.Frequency(midi, 'midi').toNote()
}

/**
 * Thin wrapper around Tone.js that turns a Project into scheduled playback.
 * Kept separate from React/UI code so the audio engine can be reused (or
 * swapped) without touching component code, and vice versa.
 */
export class PlaybackEngine {
  private masterBus: Tone.Compressor
  private chordSynth: Tone.PolySynth<Tone.MonoSynth>
  private melodySynth: Tone.MonoSynth
  private chordPart: Tone.Part | null = null
  private melodyPart: Tone.Part | null = null

  /** Called with the current 16th-note step during playback, or null when stopped. */
  onStepChange: ((step: number | null) => void) | null = null

  constructor() {
    // A gentle bus compressor keeps a dense chord (several PolySynth voices
    // stacked at once) from summing into harsh, clipped peaks — without it,
    // a 9th chord can be noticeably louder and harsher than a single note.
    this.masterBus = new Tone.Compressor({ threshold: -18, ratio: 3, attack: 0.02, release: 0.2 }).toDestination()
    this.chordSynth = new Tone.PolySynth(Tone.MonoSynth).connect(this.masterBus)
    this.chordSynth.set({ volume: -4 })
    this.melodySynth = new Tone.MonoSynth().connect(this.masterBus)
    this.melodySynth.volume.value = -6
  }

  async play(project: Project): Promise<void> {
    await Tone.start()
    this.resetTransport()

    if (project.chords.length === 0) return

    const chordPreset = INSTRUMENT_PRESETS[project.chordInstrument]
    this.chordSynth.set({
      oscillator: chordPreset.oscillator,
      envelope: chordPreset.envelope,
      filter: chordPreset.filter,
      filterEnvelope: chordPreset.filterEnvelope,
    })
    const melodyPreset = INSTRUMENT_PRESETS[project.melodyInstrument]
    this.melodySynth.set({
      oscillator: melodyPreset.oscillator,
      envelope: melodyPreset.envelope,
      filter: melodyPreset.filter,
      filterEnvelope: melodyPreset.filterEnvelope,
    })

    Tone.Transport.bpm.value = project.tempo
    const stepDuration = Tone.Time('16n').toSeconds()
    const totalSteps = project.chords.length * STEPS_PER_BAR

    const chordEvents: [number, { notes: string[] }][] = project.chords.map((item, index) => {
      const voiced = getVoicedChord(project.key.tonic, project.key.scale, item.degree, item.extension, item.inversion)
      const notes = voiceChordTones(voiced.pitchClasses, CHORD_OCTAVE, item.inversion).map(midiToNoteName)
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
    this.masterBus.dispose()
  }
}
