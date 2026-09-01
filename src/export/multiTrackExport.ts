import JSZip from 'jszip'
import type { Project } from '../types/project'
import { flattenNotes } from '../utils/sections'
import { sanitizeFilename, triggerDownload } from './downloadHelpers'
import { buildBassOnlyMidi, buildChordsOnlyMidi, buildHarmonyOnlyMidi, buildMelodyOnlyMidi, midiToArrayBuffer } from './midiExport'
import type { ExportOptions } from './midiExport'

/** Builds a .zip with separate chords.mid / melody.mid files (plus bass.mid
 * / harmony.mid when those layers have notes) and triggers a browser
 * download — the "split by track" export, as opposed to the single
 * combined-file export. */
export async function downloadProjectZip(project: Project, options: ExportOptions = {}): Promise<void> {
  const filename = options.filename ?? `${sanitizeFilename(project.name)}.zip`
  const zip = new JSZip()
  zip.file('chords.mid', midiToArrayBuffer(buildChordsOnlyMidi(project, options)))
  zip.file('melody.mid', midiToArrayBuffer(buildMelodyOnlyMidi(project, options)))

  if (flattenNotes(project.sections, 'bassline').length > 0) {
    zip.file('bass.mid', midiToArrayBuffer(buildBassOnlyMidi(project, options)))
  }
  if (flattenNotes(project.sections, 'harmonyMelody').length > 0) {
    zip.file('harmony.mid', midiToArrayBuffer(buildHarmonyOnlyMidi(project, options)))
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  triggerDownload(blob, filename)
}
