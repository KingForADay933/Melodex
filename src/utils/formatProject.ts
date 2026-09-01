import { noteName } from '../music-theory'
import type { Project } from '../types/project'
import { resolveChord } from './resolveChord'

export function formatKeyLabel(project: Project): string {
  const tonicName = noteName(project.key.tonic, project.key.tonic, project.key.scale)
  const scaleLabel = project.key.scale === 'major' ? 'Major' : 'Minor'
  return `${tonicName} ${scaleLabel}`
}

export function formatProgressionLabel(project: Project): string {
  if (project.chords.length === 0) return 'No chords yet'
  return project.chords.map((c) => resolveChord(project.key, c).roman).join(' – ')
}

/** e.g. "F# Minor · i – VI – III – VII", used as the subtitle under each screen's title. */
export function formatScreenSubtitle(project: Project): string {
  return `${formatKeyLabel(project)} · ${formatProgressionLabel(project)}`
}
