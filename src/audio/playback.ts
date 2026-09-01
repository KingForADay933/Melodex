import * as Tone from 'tone'
import { CHORD_OCTAVE, STEPS_PER_BAR } from '../constants'
import { secondsPerStep } from '../export/midiExport'
import { voiceChordTones } from '../music-theory'
import type { Project } from '../types/project'
import { resolveChord } from '../utils/resolveChord'
import { flattenChords, flattenNotes, getProjectTotalSteps } from '../utils/sections'
import type { NoteLayerKey } from '../utils/sections'
import type { InstrumentId } from './instruments'
import { INSTRUMENT_PRESETS } from './instruments'

/** How long a one-off note preview (clicking a piano-roll cell or key)
 * rings for, independent of tempo — it's an audition, not part of a take. */
const PREVIEW_NOTE_DURATION = 0.25

/** The three melodic layers, each scheduled identically (one synth, one
 * Tone.Part) — chords are scheduled separately since they're structurally
 * different (multiple simultaneous notes per event). `volume` values keep
 * bass present but not overpowering and harmony subordinate to the lead,
 * relative to melody's existing -8dB. */
export type NoteLayerId = 'melody' | 'bass' | 'harmony'
export const NOTE_LAYER_IDS: NoteLayerId[] = ['melody', 'bass', 'harmony']

function layerSectionKey(id: NoteLayerId): NoteLayerKey {
  if (id === 'bass') return 'bassline'
  if (id === 'harmony') return 'harmonyMelody'
  return 'melody'
}

function layerVolume(id: NoteLayerId): number {
  if (id === 'bass') return -9
  if (id === 'harmony') return -12
  return -8
}

export function layerInstrument(project: Project, id: NoteLayerId): InstrumentId {
  if (id === 'bass') return project.bassInstrument
  if (id === 'harmony') return project.harmonyInstrument
  return project.melodyInstrument
}

function midiToNoteName(midi: number): string {
  return Tone.Frequency(midi, 'midi').toNote()
}

export function applyInstrument(synth: Tone.PolySynth<Tone.MonoSynth>, instrumentId: InstrumentId): void {
  const preset = INSTRUMENT_PRESETS[instrumentId]
  synth.set({
    oscillator: preset.oscillator,
    envelope: preset.envelope,
    filter: preset.filter,
    filterEnvelope: preset.filterEnvelope,
  })
}

/** Pure, tempo-explicit event data for a project's whole playback — shared
 * by live playback and the offline WAV render so the two can never silently
 * drift apart. Uses secondsPerStep instead of Tone.Time('16n').toSeconds()
 * so it has zero dependency on any Tone audio context. */
export interface ScheduleEvents {
  chordEvents: [number, { notes: string[] }][]
  chordDuration: number
  noteLayerEvents: Record<NoteLayerId, [number, { note: string; duration: number }][]>
  totalSteps: number
  stepDuration: number
}

export function buildScheduleEvents(project: Project): ScheduleEvents {
  const stepDuration = secondsPerStep(project.tempo)
  const totalSteps = getProjectTotalSteps(project.sections)

  const chordEvents: [number, { notes: string[] }][] = flattenChords(project.sections).map(({ item, barIndex }) => {
    const voiced = resolveChord(project.key, item)
    const notes = voiceChordTones(voiced.pitchClasses, CHORD_OCTAVE, item.inversion).map(midiToNoteName)
    return [barIndex * STEPS_PER_BAR * stepDuration, { notes }]
  })

  const noteLayerEvents = Object.fromEntries(
    NOTE_LAYER_IDS.map((id) => [
      id,
      flattenNotes(project.sections, layerSectionKey(id)).map(
        (note): [number, { note: string; duration: number }] => [
          note.startStep * stepDuration,
          { note: midiToNoteName(note.pitch), duration: note.lengthSteps * stepDuration * 0.9 },
        ],
      ),
    ]),
  ) as Record<NoteLayerId, [number, { note: string; duration: number }][]>

  return { chordEvents, chordDuration: STEPS_PER_BAR * stepDuration * 0.95, noteLayerEvents, totalSteps, stepDuration }
}

/** The synth/effects graph used to actually render a project's audio —
 * shared by live playback (built once, long-lived) and the offline WAV
 * render (built fresh inside each Tone.Offline callback). Deliberately
 * excludes the preview synth: auditioning a piano-roll click is a live-UI
 * concept an offline bounce never needs. */
export interface SynthGraph {
  compressor: Tone.Compressor
  limiter: Tone.Limiter
  chordSynth: Tone.PolySynth<Tone.MonoSynth>
  noteLayers: Record<NoteLayerId, { synth: Tone.PolySynth<Tone.MonoSynth>; part: Tone.Part | null }>
  dispose(): void
}

export function createSynthGraph(): SynthGraph {
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
  const compressor = new Tone.Compressor({ threshold: -24, ratio: 4, attack: 0.005, release: 0.15 })
  const limiter = new Tone.Limiter(-1).toDestination()
  compressor.connect(limiter)

  const chordSynth = new Tone.PolySynth(Tone.MonoSynth).connect(compressor)
  chordSynth.set({ volume: -14 })

  // Polyphonic even though each melodic layer is usually one note at a
  // time: the piano roll only prevents overlaps on the *same* pitch (so
  // a brief two-note harmony is allowed), and a monophonic synth's
  // single voice can't take two simultaneous note-ons without a
  // scheduling crash — its oscillator gets told to "restart" at a time
  // that isn't after itself.
  const noteLayers = Object.fromEntries(
    NOTE_LAYER_IDS.map((id) => {
      const synth = new Tone.PolySynth(Tone.MonoSynth).connect(compressor)
      synth.set({ volume: layerVolume(id) })
      return [id, { synth, part: null }]
    }),
  ) as SynthGraph['noteLayers']

  return {
    compressor,
    limiter,
    chordSynth,
    noteLayers,
    dispose() {
      chordSynth.dispose()
      for (const id of NOTE_LAYER_IDS) noteLayers[id].synth.dispose()
      compressor.dispose()
      limiter.dispose()
    },
  }
}

/**
 * Thin wrapper around Tone.js that turns a Project into scheduled playback.
 * Kept separate from React/UI code so the audio engine can be reused (or
 * swapped) without touching component code, and vice versa.
 */
export class PlaybackEngine {
  private graph: SynthGraph
  /** Separate from the note-layer synths so auditioning a pitch (click a
   * piano-roll cell or key) never steals a voice from — or otherwise
   * touches — actual sequenced playback, even while the transport is running. */
  private previewSynth: Tone.PolySynth<Tone.MonoSynth>
  private chordPart: Tone.Part | null = null

  /** Called with the current 16th-note step during playback, or null when stopped. */
  onStepChange: ((step: number | null) => void) | null = null

  constructor() {
    this.graph = createSynthGraph()
    this.previewSynth = new Tone.PolySynth(Tone.MonoSynth).connect(this.graph.compressor)
    this.previewSynth.set({ volume: -8 })
  }

  async play(project: Project): Promise<void> {
    await Tone.start()
    this.resetTransport()

    const flatChords = flattenChords(project.sections)
    if (flatChords.length === 0) return

    applyInstrument(this.graph.chordSynth, project.chordInstrument)
    for (const id of NOTE_LAYER_IDS) {
      applyInstrument(this.graph.noteLayers[id].synth, layerInstrument(project, id))
    }

    Tone.Transport.bpm.value = project.tempo
    const { chordEvents, chordDuration, noteLayerEvents, totalSteps, stepDuration } = buildScheduleEvents(project)

    this.chordPart = new Tone.Part((time, event) => {
      this.graph.chordSynth.triggerAttackRelease(event.notes, chordDuration, time)
    }, chordEvents).start(0)

    for (const id of NOTE_LAYER_IDS) {
      const layer = this.graph.noteLayers[id]
      layer.part = new Tone.Part((time, event) => {
        layer.synth.triggerAttackRelease(event.note, event.duration, time)
      }, noteLayerEvents[id]).start(0)
    }

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
    this.chordPart = null
    for (const id of NOTE_LAYER_IDS) {
      const layer = this.graph.noteLayers[id]
      layer.part?.dispose()
      layer.part = null
    }
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
    this.graph.dispose()
    this.previewSynth.dispose()
  }
}
