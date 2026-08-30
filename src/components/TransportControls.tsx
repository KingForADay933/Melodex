import type { Project } from '../types/project'

interface TransportControlsProps {
  project: Project
  isPlaying: boolean
  currentStep: number | null
  totalSteps: number
  onPlay: () => void
  onStop: () => void
  onExport: () => void
}

export function TransportControls({
  project,
  isPlaying,
  currentStep,
  totalSteps,
  onPlay,
  onStop,
  onExport,
}: TransportControlsProps) {
  const hasContent = project.chords.length > 0 || project.melody.length > 0
  const progress = isPlaying && currentStep !== null ? Math.min(1, currentStep / totalSteps) : 0

  return (
    <div className="space-y-3 border-t border-slate-200 pt-6">
      {isPlaying && (
        <div className="h-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-150 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={isPlaying ? onStop : onPlay}
          disabled={!hasContent}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40"
        >
          {isPlaying ? 'Stop' : 'Play'}
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={!hasContent}
          className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-accent-soft disabled:opacity-40"
        >
          Export MIDI
        </button>
      </div>
    </div>
  )
}
