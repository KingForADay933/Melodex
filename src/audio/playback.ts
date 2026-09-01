import * as Tone from 'tone'
import { CHORD_OCTAVE, STEPS_PER_BAR } from '../constants'
import { voiceChordTones } from '../music-theory'
import type { Project } from '../types/project'
import { resolveChord } from '../utils/resolveChord'
import { flattenChords, flattenMelody, getProjectTotalSteps } from '../utils/sections'
import type { InstrumentId } from './instruments'
import { INSTRUMENT_PRESETS } from './instruments'

/** How long a one-off note preview (clicking a piano-roll cell or key)
 * rings for, independent of tempo — it's an audition, not part of a take. */
const PREVIEW_NOTE_DURATION = 0.25

function midiToNoteName(midi: number): string {
  return Tone.Frequency(midi, 'midi').toNote()
}

function applyInstrument(synth: Tone.PolySynth<Tone.MonoSynth>, instrumentId: InstrumentId): void {
  const preset = INSTRUMENT_PRESETS[instrumentId]
  synth.set({
    oscillator: preset.oscillator,
    envelope: preset.envelope,
    filter: preset.filter,
    filterEnvelope: preset.filterEnvelope,
  })
}

/**
 * Thin wrapper around Tone.js that turns a Project into scheduled playback.
 * Kept separate from React/UI code so the audio engine can be reused (or
 * swapped) without touching component code, and vice versa.
 */
export class PlaybackEngine {
  private compressor: Tone.Compressor
  private limiter: Tone.Limiter
  private chordSynth: Tone.PolySynth<Tone.MonoSynth>
  private melodySynth: Tone.PolySynth<Tone.MonoSynth>
  /** Separate from melodySynth so auditioning a pitch (click a piano-roll
   * cell or key) never steals a voice from — or otherwise touches — actual
   * sequenced playback, even while the transport is running. */
  private previewSynth: Tone.PolySynth<Tone.MonoSynth>
  private chordPart: Tone.Part | null = null
  private melodyPart: Tone.Part | null = null

  /** Called with the current 16th-note step during playback, or null when stopped. */
  onStepChange: ((step: number | null) => void) | null = null

  constructor() {
    // PolySynth stacks a full-gain voice per note, so a dense chord (a 9th
    // chord is 5 simultaneous voices) can sum well past 0dBFS right at the
    // attack, where the oscillators start roughly in phase — that hard
    // digital clipping is what reads as "static". Tone.Limiter is really
    // just a fast Compressor, not a true zero-latency brick-wall limiter,
    // so it can't fully catch a same-sample transient spike on its own —
    // measured peaks still hit +1dB / clipped samples with only a limiter.
    // The real fix is headroom: -14dB per voice keeps 5 voices summing in
    // phase at or below 0dBFS before any dynamics processing even runs.
    // The compressor+limiter are then just a safety net for the rest.
    this.compressor = new Tone.Compressor({ threshold: -24, ratio: 4, attack: 0.005, release: 0.15 })
    this.limiter = new Tone.Limiter(-1).toDestination()
    this.compressor.connect(this.limiter)

    this.chordSynth = new Tone.PolySynth(Tone.MonoSynth).connect(this.compressor)
    this.chordSynth.set({ volume: -14 })
    // Polyphonic even though melody is usually one note at a time: the
    // piano roll only prevents overlaps on the *same* pitch (so a brief
    // two-note harmony is allowed), and a monophonic synth's single voice
    // can't take two simultaneous note-ons without a scheduling crash — its
    // oscillator gets told to "restart" at a time that isn't after itself.
    this.melodySynth = new Tone.PolySynth(Tone.MonoSynth).connect(this.compressor)
    this.melodySynth.set({ volume: -8 })

    this.previewSynth = new Tone.PolySynth(Tone.MonoSynth).connect(this.compressor)
    this.previewSynth.set({ volume: -8 })
  }

  async play(project: Project): Promise<void> {
    await Tone.start()
    this.resetTransport()

    const flatChords = flattenChords(project.sections)
    if (flatChords.length === 0) return

    applyInstrument(this.chordSynth, project.chordInstrument)
    applyInstrument(this.melodySynth, project.melodyInstrument)

    Tone.Transport.bpm.value = project.tempo
    const stepDuration = Tone.Time('16n').toSeconds()
    const totalSteps = getProjectTotalSteps(project.sections)

    const chordEvents: [number, { notes: string[] }][] = flatChords.map(({ item, barIndex }) => {
      const voiced = resolveChord(project.key, item)
      const notes = voiceChordTones(voiced.pitchClasses, CHORD_OCTAVE, item.inversion).map(midiToNoteName)
      return [barIndex * STEPS_PER_BAR * stepDuration, { notes }]
    })

    this.chordPart = new Tone.Part((time, event) => {
      this.chordSynth.triggerAttackRelease(event.notes, STEPS_PER_BAR * stepDuration * 0.95, time)
    }, chordEvents).start(0)

    const melodyEvents: [number, { note: string; duration: number }][] = flattenMelody(project.sections).map((note) => [
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

  /** Auditions a single pitch — clicking a piano-roll cell to place a note,
   * or a row's key label. Independent of the transport, so it works
   * whether or not anything is currently playing. */
  async previewNote(pitch: number, instrumentId: InstrumentId): Promise<void> {
    await Tone.start()
    applyInstrument(this.previewSynth, instrumentId)
    this.previewSynth.triggerAttackRelease(midiToNoteName(pitch), PREVIEW_NOTE_DURATION)
  }

  dispose(): void {
    this.stop()
    this.chordSynth.dispose()
    this.melodySynth.dispose()
    this.previewSynth.dispose()
    this.compressor.dispose()
    this.limiter.dispose()
  }
}
