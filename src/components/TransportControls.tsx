import type { Project } from '../types/project'

interface TransportControlsProps {
  project: Project
  isPlaying: boolean
  onPlay: () => void
  onStop: () => void
  onExport: () => void
}

export function TransportControls({ project, isPlaying, onPlay, onStop, onExport }: TransportControlsProps) {
  const hasContent = project.chords.length > 0 || project.melody.length > 0

  return (
    <div className="flex items-center gap-3 border-t border-slate-200 pt-6">
      <button
        type="button"
        onClick={isPlaying ? onStop : onPlay}
        disabled={!hasContent}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        {isPlaying ? 'Stop' : 'Play'}
      </button>
      <button
        type="button"
        onClick={onExport}
        disabled={!hasContent}
        className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
      >
        Export MIDI
      </button>
    </div>
  )
}
