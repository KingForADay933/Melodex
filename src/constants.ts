// App-wide constants that aren't user-configurable in Phase 0. Tempo and bar
// length become real controls in later phases (see project brief); for now
// they're fixed so playback and export have something to schedule against.

export const DEFAULT_BPM = 100

/** Every chord in the chord track occupies one 4/4 bar. */
export const BEATS_PER_BAR = 4

/** Piano-roll time resolution: 16th notes, i.e. 16 steps per bar. */
export const STEPS_PER_BAR = 16

/** Melody pitch range shown in the piano roll: C3 (48) through C6 (84). */
export const MELODY_MIN_MIDI = 48
export const MELODY_MAX_MIDI = 84

/** Octave the chord track plays back in. */
export const CHORD_OCTAVE = 4
