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
}

export function ScreenHeader({ title, subtitle, canUndo, canRedo, onUndo, onRedo, onShowShortcuts }: ScreenHeaderProps) {
  const showHistoryControls = onUndo !== undefined && onRedo !== undefined

  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold text-slate-900">{title}</h1>
        {subtitle && <p className="truncate text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex flex-shrink-0 items-center gap-1.5">
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
        <GuidanceToggleButton />
      </div>
    </header>
  )
}
