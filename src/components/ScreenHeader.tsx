import { useEffect, useState } from 'react'
import { formatRelativeTime } from '../utils/formatProject'
import { FeedbackButton } from './ui/FeedbackButton'
import { GuidanceToggleButton } from './ui/GuidanceToggleButton'
import { KeyboardIcon, RedoIcon, UndoIcon } from './ui/icons'

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
  onShowShortcuts: () => void
  /** When set, shows a "Saved {relative time}" line — the only feedback
   * that localStorage autosaving actually happened, since there's no
   * explicit Save action to confirm it. */
  updatedAt?: number
}

export function ScreenHeader({
  title,
  subtitle,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onShowShortcuts,
  updatedAt,
}: ScreenHeaderProps) {
  const showHistoryControls = onUndo !== undefined && onRedo !== undefined

  // Re-renders periodically so "Saved just now" ages into "Saved 5m ago"
  // etc. even if the user stops editing — not just right after a change.
  const [, tick] = useState(0)
  useEffect(() => {
    if (updatedAt === undefined) return
    const id = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [updatedAt])

  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold text-slate-900">{title}</h1>
        {subtitle && <p className="truncate text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          {showHistoryControls && (
            <>
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-accent-soft disabled:opacity-30 disabled:hover:bg-white"
                aria-label="Undo"
              >
                <UndoIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-accent-soft disabled:opacity-30 disabled:hover:bg-white"
                aria-label="Redo"
              >
                <RedoIcon className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onShowShortcuts}
            aria-label="Show keyboard shortcuts"
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-accent-soft"
          >
            <KeyboardIcon className="h-4 w-4" />
          </button>
          <FeedbackButton />
          <GuidanceToggleButton />
        </div>
        {updatedAt !== undefined && (
          <span className="text-[11px] text-slate-400">Saved {formatRelativeTime(updatedAt)}</span>
        )}
      </div>
    </header>
  )
}
