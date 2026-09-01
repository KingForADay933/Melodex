import { MELODY_MAX_MIDI, MELODY_MIN_MIDI } from '../constants'
import type { MusicKey } from '../music-theory'
import type { MelodyNote, Project } from '../types/project'

/** Shifts a MIDI pitch by octaves until it falls within [min, max],
 * preserving pitch class — used instead of clamping so a transposed melody
 * keeps its intervals rather than collapsing onto the range boundary. */
export function wrapIntoRange(pitch: number, min: number, max: number): number {
  let wrapped = pitch
  while (wrapped < min) wrapped += 12
  while (wrapped > max) wrapped -= 12
  return wrapped
}

function transposeNote(note: MelodyNote, delta: number): MelodyNote {
  return { ...note, pitch: wrapIntoRange(note.pitch + delta, MELODY_MIN_MIDI, MELODY_MAX_MIDI) }
}

/** Moves a project to a new key, shifting every note in every melodic
 * layer (lead melody, bassline, harmony line) of every section by the
 * resulting semitone delta — the shortest signed path in [-6, 5]. A
 * tritone apart (e.g. C -> F#) is equally short either direction; the
 * formula resolves that tie to -6. Chords need no change: they're stored
 * as scale degrees and re-voice automatically from `project.key` wherever
 * they're resolved. */
export function transposeProject(project: Project, newKey: MusicKey): Project {
  const delta = ((newKey.tonic - project.key.tonic + 18) % 12) - 6
  return {
    ...project,
    key: newKey,
    sections: project.sections.map((section) => ({
      ...section,
      melody: section.melody.map((note) => transposeNote(note, delta)),
      bassline: section.bassline.map((note) => transposeNote(note, delta)),
      harmonyMelody: section.harmonyMelody.map((note) => transposeNote(note, delta)),
    })),
  }
}
