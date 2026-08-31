export type InstrumentId = 'warm' | 'pluck' | 'bright' | 'pad'

interface OscillatorConfig {
  type: 'triangle' | 'square' | 'sawtooth' | 'sine'
}

interface EnvelopeConfig {
  attack: number
  decay: number
  sustain: number
  release: number
}

interface FilterConfig {
  type: 'lowpass'
  Q: number
  rolloff: -12 | -24 | -48 | -96
}

interface FilterEnvelopeConfig {
  attack: number
  decay: number
  sustain: number
  release: number
  baseFrequency: number
  octaves: number
}

export interface InstrumentPreset {
  id: InstrumentId
  label: string
  oscillator: OscillatorConfig
  envelope: EnvelopeConfig
  /** A lowpass filter (swept by filterEnvelope) tames the raw harmonic edge
   * of the oscillator — without one, square/sawtooth waves sound buzzy and
   * several of them stacked in a chord tend to clash. */
  filter: FilterConfig
  filterEnvelope: FilterEnvelopeConfig
  /** General MIDI program number, set on the exported track as a hint for
   * whatever DAW opens it — most will let the user pick their own sound
   * anyway, so this is just a reasonable default. */
  midiProgram: number
}

export const INSTRUMENT_PRESETS: Record<InstrumentId, InstrumentPreset> = {
  warm: {
    id: 'warm',
    label: 'Warm',
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.02, decay: 0.3, sustain: 0.35, release: 1.0 },
    filter: { type: 'lowpass', Q: 1, rolloff: -24 },
    filterEnvelope: { attack: 0.02, decay: 0.4, sustain: 0.4, release: 1.0, baseFrequency: 400, octaves: 3 },
    midiProgram: 4, // Electric Piano
  },
  pluck: {
    id: 'pluck',
    label: 'Pluck',
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.005, decay: 0.3, sustain: 0, release: 0.3 },
    filter: { type: 'lowpass', Q: 2, rolloff: -24 },
    filterEnvelope: { attack: 0.005, decay: 0.25, sustain: 0, release: 0.3, baseFrequency: 200, octaves: 4.5 },
    midiProgram: 46, // Pizzicato Strings
  },
  bright: {
    id: 'bright',
    label: 'Bright',
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.3 },
    filter: { type: 'lowpass', Q: 1, rolloff: -12 },
    filterEnvelope: { attack: 0.05, decay: 0.3, sustain: 0.5, release: 0.3, baseFrequency: 500, octaves: 3 },
    midiProgram: 81, // Lead 2 (sawtooth)
  },
  pad: {
    id: 'pad',
    label: 'Pad',
    oscillator: { type: 'sine' },
    envelope: { attack: 0.8, decay: 0.4, sustain: 0.7, release: 2.0 },
    filter: { type: 'lowpass', Q: 0.7, rolloff: -12 },
    filterEnvelope: { attack: 1.2, decay: 0.6, sustain: 0.6, release: 2.0, baseFrequency: 300, octaves: 2.5 },
    midiProgram: 89, // Pad 2 (warm)
  },
}

export const INSTRUMENT_IDS: InstrumentId[] = ['warm', 'pluck', 'bright', 'pad']
