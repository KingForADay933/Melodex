import JSZip from 'jszip'
import type { Project } from '../types/project'
import { sanitizeFilename, triggerDownload } from './downloadHelpers'
import { buildChordsOnlyMidi, buildMelodyOnlyMidi, midiToArrayBuffer } from './midiExport'

/** Builds a .zip with separate chords.mid / melody.mid files and triggers a
 * browser download — the "split by track" export, as opposed to the single
 * combined-file export. */
export async function downloadProjectZip(project: Project, filename = `${sanitizeFilename(project.name)}.zip`): Promise<void> {
  const zip = new JSZip()
  zip.file('chords.mid', midiToArrayBuffer(buildChordsOnlyMidi(project)))
  zip.file('melody.mid', midiToArrayBuffer(buildMelodyOnlyMidi(project)))

  const blob = await zip.generateAsync({ type: 'blob' })
  triggerDownload(blob, filename)
}
