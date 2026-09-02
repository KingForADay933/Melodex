import { useState } from 'react'
import type { PlaybackScope } from '../audio/playback'
import type { AudioUnlockState } from '../audio/useAudioEngine'
import { BPM_COARSE_STEP, BPM_FINE_STEP, MAX_BPM, MIN_BPM } from '../constants'
import { PlayIcon, RepeatIcon, StopIcon } from './ui/icons'

interface MiniTransportBarProps {
  isPlaying: boolean
  progress: number
  disabled: boolean
  unlockState: AudioUnlockState
  playbackScope: PlaybackScope
  onPlaybackScopeChange: (scope: PlaybackScope) => void
  loopEnabled: boolean
  onLoopEnabledChange: (enabled: boolean) => void
  tempo: number
  onTempoChange: (tempo: number) => void
  onPlay: () => void
  onStop: () => void
}

function clampTempo(value: number): number {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, value))
}

const stepperButtonClass =
  'rounded p-2 text-slate-400 hover:bg-accent-soft hover:text-accent disabled:opacity-30 disabled:hover:bg-transparent'

const scopePillClass = (active: boolean) =>
  `rounded-md px-2.5 py-1 text-xs font-medium ${
    active ? 'bg-accent text-white' : 'border border-slate-200 text-slate-600 hover:bg-accent-soft'
  }`

/** Persistent play/stop preview bar shown above the tab bar on the Sections,
 * Chords, and Melody screens, so playback isn't tucked behind a dedicated
 * tab. Also hosts the playback scope, loop, and tempo controls — all locked
 * while playing, since any of them changing mid-take would desync or
 * invalidate the already-scheduled bounds/note times; changes instead take
 * effect the next time Play is pressed. The outer «/» buttons step tempo by
 * BPM_COARSE_STEP, the inner ‹/› by BPM_FINE_STEP, and tapping the BPM
 * number itself switches it to a direct-entry field. */
export function MiniTransportBar({
  isPlaying,
  progress,
  disabled,
  unlockState,
  playbackScope,
  onPlaybackScopeChange,
  loopEnabled,
  onLoopEnabledChange,
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
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
      {unlockState === 'failed' && (
        <p className="bg-amber-50 px-4 py-1.5 text-center text-xs font-medium text-amber-700">
          Audio blocked — check Silent Mode / Low Power Mode and try Play again.
        </p>
      )}
      <div className="mx-auto max-w-3xl px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={isPlaying ? onStop : onPlay}
            disabled={disabled}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40"
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
          <button
            type="button"
            onClick={() => onLoopEnabledChange(!loopEnabled)}
            disabled={isPlaying}
            aria-label={loopEnabled ? 'Loop is on — tap to turn off' : 'Loop is off — tap to turn on'}
            aria-pressed={loopEnabled}
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg disabled:opacity-40 ${
              loopEnabled ? 'bg-accent-soft text-accent' : 'text-slate-400 hover:bg-accent-soft hover:text-accent'
            }`}
          >
            <RepeatIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-shrink-0 items-center gap-1" role="group" aria-label="Playback scope">
            <button
              type="button"
              onClick={() => onPlaybackScopeChange('section')}
              disabled={isPlaying}
              aria-pressed={playbackScope === 'section'}
              className={`${scopePillClass(playbackScope === 'section')} disabled:opacity-40`}
            >
              Section
            </button>
            <button
              type="button"
              onClick={() => onPlaybackScopeChange('song')}
              disabled={isPlaying}
              aria-pressed={playbackScope === 'song'}
              className={`${scopePillClass(playbackScope === 'song')} disabled:opacity-40`}
            >
              Song
            </button>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1">
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
                className="w-14 rounded py-1.5 text-center text-xs text-slate-500 hover:bg-accent-soft disabled:hover:bg-transparent"
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
    </div>
  )
}
