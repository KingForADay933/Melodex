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

/** e.g. "5m ago", "2h ago" — used for both the Home screen's project list
 * and the per-screen "Saved" indicator, so autosaving to localStorage
 * (which has no other visible feedback) still reads as trustworthy. */
export function formatRelativeTime(timestamp: number): string {
  const diffMinutes = Math.round((Date.now() - timestamp) / 60_000)
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.round(diffHours / 24)}d ago`
}
