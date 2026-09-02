import { useState } from 'react'
import { ScreenHeader } from '../components/ScreenHeader'
import { BlueprintCard } from '../components/ui/BlueprintCard'
import { GuidanceTip } from '../components/ui/GuidanceTip'
import { sanitizeFilename, triggerDownload } from '../export/downloadHelpers'
import { downloadProjectMidi } from '../export/midiExport'
import { downloadProjectZip } from '../export/multiTrackExport'
import { downloadProjectWav } from '../export/wavExport'
import type { Project } from '../types/project'
import { formatKeyLabel } from '../utils/formatProject'
import { getTotalChordCount, getTotalNoteCount } from '../utils/sections'

interface ExportScreenProps {
  project: Project
  onShowShortcuts: () => void
}

export function ExportScreen({ project, onShowShortcuts }: ExportScreenProps) {
  const [isZipping, setIsZipping] = useState(false)
  const [isRendering, setIsRendering] = useState(false)
  const [humanize, setHumanize] = useState(false)
  const hasContent = getTotalChordCount(project.sections) > 0 || getTotalNoteCount(project.sections) > 0

  async function handleZipExport() {
    setIsZipping(true)
    try {
      await downloadProjectZip(project, { humanize })
    } finally {
      setIsZipping(false)
    }
  }

  async function handleWavExport() {
    setIsRendering(true)
    try {
      await downloadProjectWav(project)
    } catch {
      window.alert('Could not render the audio bounce.')
    } finally {
      setIsRendering(false)
    }
  }

  function handleJsonExport() {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
    triggerDownload(blob, `${sanitizeFilename(project.name)}.json`)
  }

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Export"
        subtitle={formatKeyLabel(project)}
        updatedAt={project.updatedAt}
        onShowShortcuts={onShowShortcuts}
      />
      <GuidanceTip>
        A single MIDI file drops straight into any DAW. The zip splits chords and melody into
        separate tracks if you want to produce them independently.
      </GuidanceTip>

      {!hasContent && (
        <p className="text-sm text-slate-400">
          Nothing to export yet — add some chords or melody first, then come back here.
        </p>
      )}

      <BlueprintCard>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Project</div>
        <div className="mt-1 text-lg font-semibold text-slate-800">{project.name}</div>
        <div className="text-sm text-slate-500">
          {formatKeyLabel(project)} · {project.tempo} BPM · {project.sections.length}{' '}
          {project.sections.length === 1 ? 'section' : 'sections'} · {getTotalChordCount(project.sections)} chords ·{' '}
          {getTotalNoteCount(project.sections)} notes
        </div>
      </BlueprintCard>

      <button
        type="button"
        onClick={() => setHumanize((v) => !v)}
        aria-pressed={humanize}
        className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium ${
          humanize ? 'border-accent bg-accent-soft text-accent' : 'border-slate-200 bg-white text-slate-600 hover:bg-accent-soft'
        }`}
      >
        Humanize timing &amp; velocity
        <span className="block text-xs font-normal text-slate-400">
          Adds subtle random variation so the export doesn&rsquo;t sound perfectly quantized.
        </span>
      </button>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => downloadProjectMidi(project, { humanize })}
          disabled={!hasContent || isZipping || isRendering}
          className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40"
        >
          Export MIDI
        </button>
        <button
          type="button"
          onClick={handleZipExport}
          disabled={!hasContent || isZipping || isRendering}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-accent-soft disabled:opacity-40"
        >
          {isZipping ? 'Zipping…' : 'Export Multi-track (.zip)'}
        </button>
        <button
          type="button"
          onClick={handleWavExport}
          disabled={!hasContent || isZipping || isRendering}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-accent-soft disabled:opacity-40"
        >
          {isRendering ? 'Rendering…' : 'Export Audio (.wav)'}
        </button>
        {/* Not gated on hasContent like the musical exports above — an
            "empty project" state is sometimes exactly the bug being
            reported, so this needs to work even then. */}
        <button
          type="button"
          onClick={handleJsonExport}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-accent-soft"
        >
          Export Project (.json)
        </button>
      </div>
    </div>
  )
}
