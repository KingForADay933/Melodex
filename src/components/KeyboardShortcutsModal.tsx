import { useEffect, useRef } from 'react'
import { BlueprintCard } from './ui/BlueprintCard'

interface KeyboardShortcutsModalProps {
  open: boolean
  onClose: () => void
}

function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPod|iPad/.test(navigator.platform ?? navigator.userAgent)
}

function KeyCombo({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
      {children}
    </kbd>
  )
}

/** Discoverable reference for the app's global keyboard shortcuts, opened
 * via the header button or the "?" shortcut itself. Self-contained: manages
 * its own Escape-to-close and focus-on-open/return-on-close, so App.tsx's
 * global keydown handler doesn't need to know about it beyond opening it. */
export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previouslyFocusedRef.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  const mod = isMacPlatform() ? '⌘' : 'Ctrl'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="w-full max-w-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <BlueprintCard>
          <div className="flex items-center justify-between">
            <h2 id="shortcuts-title" className="text-sm font-semibold text-slate-800">
              Keyboard shortcuts
            </h2>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded p-1 text-slate-400 hover:bg-accent-soft hover:text-accent"
            >
              ×
            </button>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li className="flex items-center justify-between gap-3">
              <span>Play / Stop</span>
              <KeyCombo>Space</KeyCombo>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>Undo</span>
              <KeyCombo>{`${mod}Z`}</KeyCombo>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>Redo</span>
              <KeyCombo>{`${mod}⇧Z`}</KeyCombo>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>Show shortcuts</span>
              <KeyCombo>?</KeyCombo>
            </li>
          </ul>
        </BlueprintCard>
      </div>
    </div>
  )
}
