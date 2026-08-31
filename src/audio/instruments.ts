export type InstrumentId = 'warm' | 'pluck' | 'bright' | 'pad'

export interface InstrumentPreset {
  id: InstrumentId
  label: string
  oscillator: { type: 'triangle' | 'square' | 'sawtooth' | 'sine' }
  envelope: { attack: number; decay: number; sustain: number; release: number }
  /** General MIDI program number, set on the exported track as a hint for
   * whatever DAW opens it — most will let the user pick their own sound
   * anyway, so this is just a reasonable default. */
  midiProgram: number
}

// "warm" and "pluck" match the app's original fixed chord/melody sounds
// exactly, so existing projects (defaulted to these) sound unchanged.
export const INSTRUMENT_PRESETS: Record<InstrumentId, InstrumentPreset> = {
  warm: {
    id: 'warm',
    label: 'Warm',
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.8 },
    midiProgram: 4, // Electric Piano
  },
  pluck: {
    id: 'pluck',
    label: 'Pluck',
    oscillator: { type: 'square' },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.3 },
    midiProgram: 46, // Pizzicato Strings
  },
  bright: {
    id: 'bright',
    label: 'Bright',
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.01, decay: 0.15, sustain: 0.3, release: 0.4 },
    midiProgram: 81, // Lead 2 (sawtooth)
  },
  pad: {
    id: 'pad',
    label: 'Pad',
    oscillator: { type: 'sine' },
    envelope: { attack: 0.6, decay: 0.3, sustain: 0.7, release: 1.5 },
    midiProgram: 89, // Pad 2 (warm)
  },
}

export const INSTRUMENT_IDS: InstrumentId[] = ['warm', 'pluck', 'bright', 'pad']
