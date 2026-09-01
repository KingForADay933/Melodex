import { noteName } from '../music-theory'
import type { MusicKey } from '../music-theory'
import type { ChordTrackItem, Project, Section } from '../types/project'
import { resolveChord } from './resolveChord'

export function formatKeyLabel(project: Project): string {
  const tonicName = noteName(project.key.tonic, project.key.tonic, project.key.scale)
  const scaleLabel = project.key.scale === 'major' ? 'Major' : 'Minor'
  return `${tonicName} ${scaleLabel}`
}

export function formatProgressionLabel(musicKey: MusicKey, chords: ChordTrackItem[]): string {
  if (chords.length === 0) return 'No chords yet'
  return chords.map((c) => resolveChord(musicKey, c).roman).join(' – ')
}

/** e.g. "F# Minor · Verse · i – VI – III – VII", used as the subtitle
 * under each screen's title. */
export function formatScreenSubtitle(project: Project, section: Section): string {
  return `${formatKeyLabel(project)} · ${section.name} · ${formatProgressionLabel(project.key, section.chords)}`
}
