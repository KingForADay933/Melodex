import { ScreenHeader } from '../components/ScreenHeader'
import { BlueprintCard } from '../components/ui/BlueprintCard'
import { GuidanceTip } from '../components/ui/GuidanceTip'
import { downloadProjectMidi } from '../export/midiExport'
import type { Project } from '../types/project'
import { formatKeyLabel } from '../utils/formatProject'

interface ExportScreenProps {
  project: Project
}

export function ExportScreen({ project }: ExportScreenProps) {
  const hasContent = project.chords.length > 0 || project.melody.length > 0

  return (
    <div className="space-y-5">
      <ScreenHeader title="Export" subtitle={formatKeyLabel(project)} />
      <GuidanceTip>
        Exporting gives you a MIDI file you can drop straight into any DAW to keep producing.
      </GuidanceTip>

      <BlueprintCard>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Project</div>
        <div className="mt-1 text-lg font-semibold text-slate-800">{project.name}</div>
        <div className="text-sm text-slate-500">
          {formatKeyLabel(project)} · {project.chords.length} chords · {project.melody.length} notes
        </div>
      </BlueprintCard>

      <button
        type="button"
        onClick={() => downloadProjectMidi(project)}
        disabled={!hasContent}
        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40"
      >
        Export MIDI
      </button>
    </div>
  )
}
