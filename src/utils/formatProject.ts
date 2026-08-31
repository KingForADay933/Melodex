import { getDiatonicChords, noteName } from '../music-theory'
import type { Project } from '../types/project'

export function formatKeyLabel(project: Project): string {
  const tonicName = noteName(project.key.tonic, project.key.tonic, project.key.scale)
  const scaleLabel = project.key.scale === 'major' ? 'Major' : 'Minor'
  return `${tonicName} ${scaleLabel}`
}

export function formatProgressionLabel(project: Project): string {
  if (project.chords.length === 0) return 'No chords yet'
  const diatonicChords = getDiatonicChords(project.key.tonic, project.key.scale)
  return project.chords.map((c) => diatonicChords[c.degree - 1].roman).join(' – ')
}

/** e.g. "F# Minor · i – VI – III – VII", used as the subtitle under each screen's title. */
export function formatScreenSubtitle(project: Project): string {
  return `${formatKeyLabel(project)} · ${formatProgressionLabel(project)}`
}
