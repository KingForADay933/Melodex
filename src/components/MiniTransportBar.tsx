import { BPM_STEP, MAX_BPM, MIN_BPM } from '../constants'
import { PlayIcon, StopIcon } from './ui/icons'

interface MiniTransportBarProps {
  isPlaying: boolean
  progress: number
  disabled: boolean
  tempo: number
  onTempoChange: (tempo: number) => void
  onPlay: () => void
  onStop: () => void
}

/** Persistent play/stop preview bar shown above the tab bar on the Chords
 * and Melody screens, so playback isn't tucked behind a dedicated tab.
 * Also hosts the tempo stepper — tempo is locked while playing since
 * changing it mid-take would desync the already-scheduled note times. */
export function MiniTransportBar({
  isPlaying,
  progress,
  disabled,
  tempo,
  onTempoChange,
  onPlay,
  onStop,
}: MiniTransportBarProps) {
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
        <div className="flex flex-shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onTempoChange(Math.max(MIN_BPM, tempo - BPM_STEP))}
            disabled={isPlaying || tempo <= MIN_BPM}
            className="rounded p-1 text-slate-400 hover:bg-accent-soft hover:text-accent disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Decrease tempo"
          >
            ‹
          </button>
          <span className="w-14 text-center text-xs text-slate-500">{tempo} BPM</span>
          <button
            type="button"
            onClick={() => onTempoChange(Math.min(MAX_BPM, tempo + BPM_STEP))}
            disabled={isPlaying || tempo >= MAX_BPM}
            className="rounded p-1 text-slate-400 hover:bg-accent-soft hover:text-accent disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Increase tempo"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  )
}
