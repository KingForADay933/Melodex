import { STEPS_PER_BAR } from '../constants'
import type { ChordTrackItem, MelodyNote, Project, Section } from '../types/project'

/** One section's own grid size (the piano roll's `totalSteps` prop).
 * Padded to at least one bar so an empty section still renders a grid —
 * mirrors how the pre-sections app always showed at least one bar. */
export function getSectionDisplaySteps(section: Section): number {
  return Math.max(section.chords.length, 1) * STEPS_PER_BAR
}

/** Steps this section contributes to the flattened whole-song timeline.
 * Unlike getSectionDisplaySteps, an empty section contributes zero — it
 * must not insert a silent bar into playback/export. */
function getSectionTimelineSteps(section: Section): number {
  return section.chords.length * STEPS_PER_BAR
}

/** Whole-song step count, for playback's stop-scheduling and the
 * transport progress bar. Can be 0 if every section is empty. */
export function getProjectTotalSteps(sections: Section[]): number {
  return sections.reduce((sum, s) => sum + getSectionTimelineSteps(s), 0)
}

export interface FlatChordEvent {
  item: ChordTrackItem
  /** Absolute bar index within the whole flattened song. */
  barIndex: number
}

/** Concatenates every section's chords in order, with bar indices made
 * absolute across the whole song (not just within their own section). */
export function flattenChords(sections: Section[]): FlatChordEvent[] {
  const events: FlatChordEvent[] = []
  let barOffset = 0
  for (const section of sections) {
    section.chords.forEach((item, i) => events.push({ item, barIndex: barOffset + i }))
    barOffset += section.chords.length
  }
  return events
}

export type NoteLayerKey = 'melody' | 'bassline' | 'harmonyMelody'

/** Concatenates every section's notes (for the given layer) in order, with
 * each note's startStep shifted to its absolute position in the whole song. */
export function flattenNotes(sections: Section[], layer: NoteLayerKey): MelodyNote[] {
  const notes: MelodyNote[] = []
  let stepOffset = 0
  for (const section of sections) {
    for (const note of section[layer]) notes.push({ ...note, startStep: note.startStep + stepOffset })
    stepOffset += getSectionTimelineSteps(section)
  }
  return notes
}

/** Concatenates every section's lead melody notes — a thin, more readable
 * wrapper around flattenNotes for the layer most call sites care about. */
export function flattenMelody(sections: Section[]): MelodyNote[] {
  return flattenNotes(sections, 'melody')
}

/** Absolute bar offset where a section begins in the flattened song —
 * used to translate a song-wide playback bar index back into "index
 * within this section's own chords". */
export function getSectionBarOffset(sections: Section[], sectionId: string): number {
  let offset = 0
  for (const section of sections) {
    if (section.id === sectionId) return offset
    offset += section.chords.length
  }
  return offset
}

/** Looks up a section by id, falling back to the first section if the id
 * is stale (e.g. its section was just deleted). */
export function getActiveSection(project: Project, activeSectionId: string): Section {
  return project.sections.find((s) => s.id === activeSectionId) ?? project.sections[0]
}

export function getTotalChordCount(sections: Section[]): number {
  return sections.reduce((sum, s) => sum + s.chords.length, 0)
}

export function getTotalNoteCount(sections: Section[]): number {
  return sections.reduce((sum, s) => sum + s.melody.length + s.bassline.length + s.harmonyMelody.length, 0)
}
