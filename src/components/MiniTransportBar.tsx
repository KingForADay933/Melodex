import { useState } from 'react'
import { BPM_COARSE_STEP, BPM_FINE_STEP, MAX_BPM, MIN_BPM } from '../constants'
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

function clampTempo(value: number): number {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, value))
}

const stepperButtonClass =
  'rounded p-1 text-slate-400 hover:bg-accent-soft hover:text-accent disabled:opacity-30 disabled:hover:bg-transparent'

/** Persistent play/stop preview bar shown above the tab bar on the Chords
 * and Melody screens, so playback isn't tucked behind a dedicated tab.
 * Also hosts the tempo control — locked while playing since changing it
 * mid-take would desync the already-scheduled note times. The outer «/»
 * buttons step by BPM_COARSE_STEP, the inner ‹/› by BPM_FINE_STEP, and
 * tapping the BPM number itself switches it to a direct-entry field. */
export function MiniTransportBar({
  isPlaying,
  progress,
  disabled,
  tempo,
  onTempoChange,
  onPlay,
  onStop,
}: MiniTransportBarProps) {
  const [isEditingTempo, setIsEditingTempo] = useState(false)
  const [tempoDraft, setTempoDraft] = useState('')

  function step(amount: number) {
    onTempoChange(clampTempo(tempo + amount))
  }

  function startEditing() {
    if (isPlaying) return
    setTempoDraft(String(tempo))
    setIsEditingTempo(true)
  }

  function commitEdit() {
    const parsed = Number.parseInt(tempoDraft, 10)
    if (Number.isFinite(parsed)) {
      onTempoChange(clampTempo(parsed))
    }
    setIsEditingTempo(false)
  }

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
            onClick={() => step(-BPM_COARSE_STEP)}
            disabled={isPlaying || tempo <= MIN_BPM}
            className={stepperButtonClass}
            aria-label={`Decrease tempo by ${BPM_COARSE_STEP}`}
          >
            «
          </button>
          <button
            type="button"
            onClick={() => step(-BPM_FINE_STEP)}
            disabled={isPlaying || tempo <= MIN_BPM}
            className={stepperButtonClass}
            aria-label={`Decrease tempo by ${BPM_FINE_STEP}`}
          >
            ‹
          </button>

          {isEditingTempo ? (
            <input
              type="number"
              inputMode="numeric"
              autoFocus
              min={MIN_BPM}
              max={MAX_BPM}
              value={tempoDraft}
              onChange={(event) => setTempoDraft(event.target.value)}
              onFocus={(event) => event.target.select()}
              onBlur={commitEdit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitEdit()
                if (event.key === 'Escape') setIsEditingTempo(false)
              }}
              className="w-14 rounded border border-accent bg-white text-center text-xs text-slate-700 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={startEditing}
              disabled={isPlaying}
              className="w-14 rounded py-0.5 text-center text-xs text-slate-500 hover:bg-accent-soft disabled:hover:bg-transparent"
              aria-label="Edit tempo"
            >
              {tempo} BPM
            </button>
          )}

          <button
            type="button"
            onClick={() => step(BPM_FINE_STEP)}
            disabled={isPlaying || tempo >= MAX_BPM}
            className={stepperButtonClass}
            aria-label={`Increase tempo by ${BPM_FINE_STEP}`}
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => step(BPM_COARSE_STEP)}
            disabled={isPlaying || tempo >= MAX_BPM}
            className={stepperButtonClass}
            aria-label={`Increase tempo by ${BPM_COARSE_STEP}`}
          >
            »
          </button>
        </div>
      </div>
    </div>
  )
}
