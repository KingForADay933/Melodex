import { PlayIcon, StopIcon } from './ui/icons'

interface MiniTransportBarProps {
  isPlaying: boolean
  progress: number
  disabled: boolean
  onPlay: () => void
  onStop: () => void
}

/** Persistent play/stop preview bar shown above the tab bar on the Chords
 * and Melody screens, so playback isn't tucked behind a dedicated tab. */
export function MiniTransportBar({ isPlaying, progress, disabled, onPlay, onStop }: MiniTransportBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-16 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
        <button
          type="button"
          onClick={isPlaying ? onStop : onPlay}
          disabled={disabled}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40"
          aria-label={isPlaying ? 'Stop' : 'Play'}
        >
          {isPlaying ? <StopIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
        </button>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-150 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="flex-shrink-0 text-xs text-slate-400">Preview</span>
      </div>
    </div>
  )
}
