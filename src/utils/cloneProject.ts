import type { ChordTrackItem, MelodyNote, Project, Section } from '../types/project'
import { createId } from './id'

function cloneChord(chord: ChordTrackItem): ChordTrackItem {
  return { ...chord, id: createId('chord') }
}

function cloneNote(note: MelodyNote): MelodyNote {
  return { ...note, id: createId('note') }
}

/** Deep-clones a section with a fresh id for the section itself and every
 * nested chord/note, so editing the clone never touches the original. */
export function cloneSection(section: Section, name = `${section.name} (copy)`): Section {
  return {
    id: createId('section'),
    name,
    chords: section.chords.map(cloneChord),
    melody: section.melody.map(cloneNote),
    bassline: section.bassline.map(cloneNote),
    harmonyMelody: section.harmonyMelody.map(cloneNote),
  }
}

/** Deep-clones a whole project with a fresh id for the project and every
 * nested section/chord/note. Section names are kept as-is (not run through
 * cloneSection's own "(copy)" default) — duplicating a project shouldn't
 * suffix every section name. */
export function cloneProject(project: Project, name = `${project.name} (copy)`): Project {
  const now = Date.now()
  return {
    ...project,
    id: createId('project'),
    name,
    sections: project.sections.map((section) => cloneSection(section, section.name)),
    createdAt: now,
    updatedAt: now,
  }
}
