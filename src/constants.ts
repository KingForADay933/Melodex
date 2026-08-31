// App-wide constants. Bar length is still fixed (see project brief roadmap);
// tempo became a real per-project control in Phase 2.

/** Default tempo for newly-created projects. */
export const DEFAULT_BPM = 100
export const MIN_BPM = 40
export const MAX_BPM = 220
export const BPM_FINE_STEP = 1
export const BPM_COARSE_STEP = 5

/** Every chord in the chord track occupies one 4/4 bar. */
export const BEATS_PER_BAR = 4

/** Piano-roll time resolution: 16th notes, i.e. 16 steps per bar. */
export const STEPS_PER_BAR = 16

/** Melody pitch range shown in the piano roll: C3 (48) through C6 (84). */
export const MELODY_MIN_MIDI = 48
export const MELODY_MAX_MIDI = 84

/** Octave the chord track plays back in. */
export const CHORD_OCTAVE = 4
