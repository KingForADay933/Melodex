import * as Tone from 'tone'
import { INSTRUMENT_PRESETS } from '../audio/instruments'
import type { SynthGraph } from '../audio/playback'
import { NOTE_LAYER_IDS, applyInstrument, buildScheduleEvents, createSynthGraph, layerInstrument } from '../audio/playback'
import type { Project } from '../types/project'
import { sanitizeFilename, triggerDownload } from './downloadHelpers'

const SAMPLE_RATE = 44100
/** >= the longest instrument release, so the final note/chord's decay tail
 * isn't truncated mid-fade. Derived from INSTRUMENT_PRESETS (not hardcoded)
 * so a future preset with a longer release can't silently clip. */
const TAIL_SECONDS = Math.max(...Object.values(INSTRUMENT_PRESETS).map((preset) => preset.envelope.release)) + 0.5

/** Renders a project's full playback (chords + melody + bass + harmony,
 * exactly as PlaybackEngine.play() sounds) to an audio buffer via
 * Tone.Offline — a non-realtime bounce. */
export async function renderProjectToBuffer(project: Project): Promise<Tone.ToneAudioBuffer> {
  const { chordEvents, chordDuration, noteLayerEvents, totalSteps, stepDuration } = buildScheduleEvents(project)
  const duration = totalSteps * stepDuration + TAIL_SECONDS

  let graph: SynthGraph | undefined
  try {
    // Deliberately NOT async — Tone.Offline restores the live context
    // immediately after this callback returns (before rendering finishes),
    // so any awaited work here risks unrelated code running against the
    // wrong (offline) context in the gap. Nothing here needs to await.
    return await Tone.Offline(({ transport }) => {
      transport.bpm.value = project.tempo
      graph = createSynthGraph()
      applyInstrument(graph.chordSynth, project.chordInstrument)
      for (const id of NOTE_LAYER_IDS) applyInstrument(graph.noteLayers[id].synth, layerInstrument(project, id))

      new Tone.Part((time, event) => {
        graph!.chordSynth.triggerAttackRelease(event.notes, chordDuration, time)
      }, chordEvents).start(0)

      for (const id of NOTE_LAYER_IDS) {
        new Tone.Part((time, event) => {
          graph!.noteLayers[id].synth.triggerAttackRelease(event.note, event.duration, time)
        }, noteLayerEvents[id]).start(0)
      }

      transport.start(0)
    }, duration, 2, SAMPLE_RATE)
  } finally {
    graph?.dispose()
  }
}

/** Structural, not Tone.ToneAudioBuffer directly — lets audioBufferToWavBlob
 * be unit-tested against a plain object literal, with no OfflineAudioContext
 * (which jsdom doesn't have) required. A real ToneAudioBuffer satisfies this
 * shape with no cast needed. */
interface AudioBufferLike {
  numberOfChannels: number
  length: number
  sampleRate: number
  getChannelData(channel: number): Float32Array
}

/** Standard 44-byte RIFF/WAVE header + interleaved 16-bit PCM data. */
export function audioBufferToWavBlob(buffer: AudioBufferLike): Blob {
  const { numberOfChannels, length, sampleRate } = buffer
  const bytesPerSample = 2
  const blockAlign = numberOfChannels * bytesPerSample
  const dataSize = length * blockAlign
  const arrayBuffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(arrayBuffer)

  function writeString(offset: number, s: string) {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, numberOfChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 8 * bytesPerSample, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  const channels: Float32Array[] = []
  for (let ch = 0; ch < numberOfChannels; ch++) channels.push(buffer.getChannelData(ch))

  let offset = 44
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

/** Renders and downloads the project's audio bounce as a .wav file. */
export async function downloadProjectWav(project: Project, filename?: string): Promise<void> {
  const buffer = await renderProjectToBuffer(project)
  const blob = audioBufferToWavBlob(buffer)
  triggerDownload(blob, filename ?? `${sanitizeFilename(project.name)}.wav`)
}
