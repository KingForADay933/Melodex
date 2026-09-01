import { classifyTriad, getDiatonicChord, intervalFromTonic } from './chords'
import { noteName, pitchClassToMidi } from './notes'
import { SCALES } from './scales'
import type { ChordExtension, ChordQuality, ScaleType, VoicedChord } from './types'

// Chord tones as scale-step offsets from the root degree. sus chords replace
// the third with the 2nd/4th scale step instead of stacking on top of it.
// Ninth chords include the seventh (a 9th without a 7th isn't really a "9th
// chord" in standard usage), so they're 5 notes: root, 3rd, 5th, 7th, 9th.
const EXTENSION_STEPS: Record<ChordExtension, number[]> = {
  triad: [0, 2, 4],
  seventh: [0, 2, 4, 6],
  ninth: [0, 2, 4, 6, 8],
  sus2: [0, 1, 4],
  sus4: [0, 3, 4],
}

/** How many chord tones an extension has — the number of inversions available. */
export function getToneCount(extension: ChordExtension): number {
  return EXTENSION_STEPS[extension].length
}

function buildSymbol(
  rootName: string,
  quality: ChordQuality,
  extension: ChordExtension,
  seventhSemitonesFromRoot: number | null,
  bassName: string | null,
): string {
  const slash = bassName && bassName !== rootName ? `/${bassName}` : ''

  if (extension === 'sus2') return `${rootName}sus2${slash}`
  if (extension === 'sus4') return `${rootName}sus4${slash}`

  if (extension === 'triad') {
    if (quality === 'minor') return `${rootName}m${slash}`
    if (quality === 'diminished') return `${rootName}dim${slash}`
    if (quality === 'augmented') return `${rootName}aug${slash}`
    return `${rootName}${slash}`
  }

  // seventh or ninth
  const suffix = extension === 'ninth' ? '9' : '7'
  if (quality === 'diminished') {
    return seventhSemitonesFromRoot === 9 ? `${rootName}dim${suffix}${slash}` : `${rootName}m${suffix}b5${slash}`
  }
  if (quality === 'minor') return `${rootName}m${suffix}${slash}`
  if (quality === 'major') {
    return seventhSemitonesFromRoot === 11 ? `${rootName}maj${suffix}${slash}` : `${rootName}${suffix}${slash}`
  }
  return `${rootName}${suffix}${slash}`
}

/** Builds a fully-resolved chord: diatonic degree + extension + inversion,
 * correctly spelled and named for the key. Inversion only affects which
 * tone is voiced as the bass note (see voiceChordTones), but it's also
 * reflected in the chord symbol as a slash chord. */
export function getVoicedChord(
  tonic: number,
  scale: ScaleType,
  degree: number,
  extension: ChordExtension,
  inversion: number,
): VoicedChord {
  const intervals = SCALES[scale]
  const degreeIndex = degree - 1
  const steps = EXTENSION_STEPS[extension]
  const clampedInversion = ((inversion % steps.length) + steps.length) % steps.length

  const rootInterval = intervalFromTonic(intervals, degreeIndex, 0)
  const thirdInterval = intervalFromTonic(intervals, degreeIndex, 2)
  const fifthInterval = intervalFromTonic(intervals, degreeIndex, 4)
  const quality = classifyTriad(thirdInterval - rootInterval, fifthInterval - rootInterval)

  const seventhInterval = steps.includes(6) ? intervalFromTonic(intervals, degreeIndex, 6) : null
  const seventhSemitonesFromRoot = seventhInterval !== null ? seventhInterval - rootInterval : null

  const pitchClasses = steps.map((step) => (tonic + intervalFromTonic(intervals, degreeIndex, step)) % 12)
  const root = pitchClasses[0]
  const rootName = noteName(root, tonic, scale)
  const bassPitchClass = pitchClasses[clampedInversion]
  const bassName = noteName(bassPitchClass, tonic, scale)

  return {
    degree,
    extension,
    inversion: clampedInversion,
    quality,
    root,
    rootName,
    symbol: buildSymbol(rootName, quality, extension, seventhSemitonesFromRoot, bassName),
    pitchClasses,
    noteNames: pitchClasses.map((pc) => noteName(pc, tonic, scale)),
  }
}

// A dominant chord's tone structure is a fixed set of semitones above its
// root, unlike EXTENSION_STEPS (scale-step offsets) — a dominant chord's
// shape doesn't depend on the home scale. This is also exactly what a
// diatonic V chord's tones work out to (major 3rd, perfect 5th, minor/
// "dominant" 7th, major 9th), which is why V7 already sounds dominant today.
const DOMINANT_EXTENSION_STEPS: Record<ChordExtension, number[]> = {
  triad: [0, 4, 7],
  seventh: [0, 4, 7, 10],
  ninth: [0, 4, 7, 10, 14],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
}

/** A dominant-function chord tonicizing `targetDegree` — root a perfect 5th
 * above that degree's diatonic root. Unlike getVoicedChord, tones are fixed
 * semitone offsets from the root rather than scale-steps, since a dominant
 * chord's structure doesn't depend on the home scale. */
export function getSecondaryDominantChord(
  tonic: number,
  scale: ScaleType,
  targetDegree: number,
  extension: ChordExtension,
  inversion: number,
): VoicedChord {
  const target = getDiatonicChord(tonic, scale, targetDegree)
  const root = (target.root + 7) % 12
  const rootName = noteName(root, tonic, scale)
  const steps = DOMINANT_EXTENSION_STEPS[extension]
  const clampedInversion = ((inversion % steps.length) + steps.length) % steps.length
  const pitchClasses = steps.map((step) => (root + step) % 12)
  const bassName = noteName(pitchClasses[clampedInversion], tonic, scale)
  const seventhSemitonesFromRoot = steps.includes(10) ? 10 : null

  return {
    degree: targetDegree,
    extension,
    inversion: clampedInversion,
    quality: 'major',
    root,
    rootName,
    symbol: buildSymbol(rootName, 'major', extension, seventhSemitonesFromRoot, bassName),
    pitchClasses,
    noteNames: pitchClasses.map((pc) => noteName(pc, tonic, scale)),
  }
}

/**
 * Turns root-position pitch classes into an ascending MIDI voicing for a
 * given inversion: the first `inversion` tones move up an octave, so the
 * next tone in the array becomes the bass note.
 */
export function voiceChordTones(pitchClasses: number[], baseOctave: number, inversion: number): number[] {
  const n = pitchClasses.length
  const clampedInversion = ((inversion % n) + n) % n
  const rotated = [...pitchClasses.slice(clampedInversion), ...pitchClasses.slice(0, clampedInversion)]

  const midiNotes: number[] = []
  let previousMidi = -Infinity
  let octave = baseOctave
  for (const pitchClass of rotated) {
    let midi = pitchClassToMidi(pitchClass, octave)
    while (midi <= previousMidi) {
      octave += 1
      midi = pitchClassToMidi(pitchClass, octave)
    }
    midiNotes.push(midi)
    previousMidi = midi
  }
  return midiNotes
}
