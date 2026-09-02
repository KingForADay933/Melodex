import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { MELODY_MAX_MIDI, MELODY_MIN_MIDI, STEPS_PER_BAR } from '../constants'
import { isInScale, noteName } from '../music-theory'
import type { MusicKey } from '../music-theory'
import type { ChordTrackItem, MelodyNote } from '../types/project'
import { createId } from '../utils/id'
import { resolveChord } from '../utils/resolveChord'

interface PianoRollProps {
  musicKey: MusicKey
  chords: ChordTrackItem[]
  notes: MelodyNote[]
  totalSteps: number
  onChange: (notes: MelodyNote[]) => void
  /** Auditions a pitch — called when a new note is placed, or a row's key
   * label is tapped. */
  onPreviewNote: (pitch: number) => void
  /** Current playback step (16th notes), for the moving playhead highlight. */
  currentStep: number | null
  /** When on, tapping an out-of-key cell does nothing — a safety net for
   * beginners who want every note guaranteed to sound "right". */
  scaleLock: boolean
  onToggleScaleLock: () => void
}

// New notes start at a fixed length; the grip handle on the last cell of a
// note is how the user changes that afterward.
const DEFAULT_NOTE_LENGTH_STEPS = 2
// Column width is adjustable (zoom); row height stays fixed — there's no
// pitch/vertical zoom, only time/horizontal.
const ZOOM_LEVELS = [16, 22, 32, 44]
// 32px — some horizontal scrolling on a phone screen is unavoidable at any
// zoom level, so the default favors touch accuracy (bigger cells, easier to
// hit the resize grip) over fitting more of the section on screen at once.
const DEFAULT_ZOOM_INDEX = 2
const CELL_HEIGHT = 18
const HEADER_HEIGHT = 22
// Width of the sticky key-label column — shared by the grid layout, the
// playhead line, and the scroll-follow math below, so it can't drift out of
// sync between them.
const KEY_LABEL_WIDTH = 56
// Pointer movement (px) before a press-on-a-note is treated as a drag rather
// than a click-to-remove. A bit more forgiving than a mouse would need,
// since a finger is less precise than a cursor.
const DRAG_THRESHOLD_PX = 6
// Drag-move/resize rounds to whole-step increments by default (1/16 note);
// selecting a coarser snap value rounds to multiples of it instead.
const SNAP_OPTIONS: { steps: number; label: string }[] = [
  { steps: 4, label: '1/4' },
  { steps: 2, label: '1/8' },
  { steps: 1, label: '1/16' },
]
const DEFAULT_SNAP_STEPS = 1

interface ResizeState {
  noteId: string
  pitch: number
  startStep: number
  /** Pointer X (viewport px) where the drag began. */
  pointerStartX: number
  startLength: number
  /** Live length while dragging — not yet committed to onChange/undo history. */
  previewLength: number
}

interface MoveState {
  noteId: string
  length: number
  startPitch: number
  startStep: number
  /** Pointer position (viewport px) where the drag began. */
  pointerStartX: number
  pointerStartY: number
  /** Live position while dragging — not yet committed to onChange/undo history. */
  previewPitch: number
  previewStartStep: number
}

/** How long a note at (pitch, startStep) can grow before hitting the next
 * note on the same pitch, or the end of the track. */
function getMaxLength(pitch: number, startStep: number, notes: MelodyNote[], excludeNoteId: string, totalSteps: number): number {
  const nextNoteStart = notes
    .filter((n) => n.id !== excludeNoteId && n.pitch === pitch && n.startStep > startStep)
    .reduce((min, n) => Math.min(min, n.startStep), totalSteps)
  return nextNoteStart - startStep
}

/** Drops any note on `pitch` that the (startStep, length) span would
 * overlap, so the grid never has to represent stacked/ambiguous notes. */
function clearOverlap(
  notes: MelodyNote[],
  pitch: number,
  startStep: number,
  length: number,
  excludeNoteId?: string,
): MelodyNote[] {
  return notes.filter(
    (n) => n.id === excludeNoteId || !(n.pitch === pitch && startStep < n.startStep + n.lengthSteps && startStep + length > n.startStep),
  )
}

export function PianoRoll({
  musicKey,
  chords,
  notes,
  totalSteps,
  onChange,
  onPreviewNote,
  currentStep,
  scaleLock,
  onToggleScaleLock,
}: PianoRollProps) {
  const [resizing, setResizing] = useState<ResizeState | null>(null)
  const [moving, setMoving] = useState<MoveState | null>(null)
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX)
  const [snapSteps, setSnapSteps] = useState(DEFAULT_SNAP_STEPS)
  const cellWidth = ZOOM_LEVELS[zoomIndex]
  // Scales with zoom so the grip stays easy to hit on touch without eating
  // too much of the adjacent move-drag area at low zoom levels.
  const resizeHandleWidth = Math.max(8, Math.min(16, cellWidth * 0.45))
  // Set (synchronously, ahead of React state) as soon as a press-on-a-note
  // crosses the drag threshold, so the synthetic click that follows
  // pointerup on the same interaction can be told apart from a real click.
  const didDragRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const pitches = useMemo(() => {
    const result: number[] = []
    for (let midi = MELODY_MAX_MIDI; midi >= MELODY_MIN_MIDI; midi -= 1) result.push(midi)
    return result
  }, [])

  const steps = useMemo(() => Array.from({ length: totalSteps }, (_, i) => i), [totalSteps])
  const barCount = Math.max(chords.length, 1)

  // While dragging, the grid renders the note at its live preview position
  // without touching the committed notes (and its undo-history entry) —
  // that only happens once, on release.
  const displayNotes = useMemo(() => {
    if (resizing) {
      return notes.map((n) => (n.id === resizing.noteId ? { ...n, lengthSteps: resizing.previewLength } : n))
    }
    if (moving) {
      return notes.map((n) =>
        n.id === moving.noteId ? { ...n, pitch: moving.previewPitch, startStep: moving.previewStartStep } : n,
      )
    }
    return notes
  }, [notes, resizing, moving])

  function noteAt(pitch: number, step: number): MelodyNote | undefined {
    return displayNotes.find((n) => n.pitch === pitch && step >= n.startStep && step < n.startStep + n.lengthSteps)
  }

  function toggleCell(pitch: number, step: number) {
    const existing = noteAt(pitch, step)
    if (existing) {
      onChange(notes.filter((n) => n.id !== existing.id))
      return
    }
    if (scaleLock && !isInScale(pitch % 12, musicKey.tonic, musicKey.scale)) return

    const length = Math.min(DEFAULT_NOTE_LENGTH_STEPS, totalSteps - step)
    const withoutOverlap = clearOverlap(notes, pitch, step, length)
    onChange([...withoutOverlap, { id: createId('note'), pitch, startStep: step, lengthSteps: length }])
    onPreviewNote(pitch)
  }

  function startResize(note: MelodyNote, event: ReactPointerEvent) {
    event.stopPropagation()
    event.preventDefault()
    const state: ResizeState = {
      noteId: note.id,
      pitch: note.pitch,
      startStep: note.startStep,
      pointerStartX: event.clientX,
      startLength: note.lengthSteps,
      previewLength: note.lengthSteps,
    }
    setResizing(state)
    // Tracks the live value alongside the (async) state update above, so
    // handleUp can read it directly instead of committing onChange from
    // inside a setState updater — React 19 flags cross-component setState
    // calls made that way.
    let previewLength = state.previewLength

    const maxLength = getMaxLength(note.pitch, note.startStep, notes, note.id, totalSteps)

    function handleMove(moveEvent: PointerEvent) {
      const deltaSteps = Math.round((moveEvent.clientX - state.pointerStartX) / cellWidth / snapSteps) * snapSteps
      previewLength = Math.min(maxLength, Math.max(1, state.startLength + deltaSteps))
      setResizing((prev) => (prev && prev.noteId === state.noteId ? { ...prev, previewLength } : prev))
    }

    function handleUp() {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      setResizing(null)
      if (previewLength !== note.lengthSteps) {
        onChange(notes.map((n) => (n.id === note.id ? { ...n, lengthSteps: previewLength } : n)))
      }
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  function startMove(note: MelodyNote, event: ReactPointerEvent) {
    // Without this, a mouse drag across the grid is interpreted as a text
    // selection (dragging across the key labels highlights their text).
    event.preventDefault()
    const state: MoveState = {
      noteId: note.id,
      length: note.lengthSteps,
      startPitch: note.pitch,
      startStep: note.startStep,
      pointerStartX: event.clientX,
      pointerStartY: event.clientY,
      previewPitch: note.pitch,
      previewStartStep: note.startStep,
    }

    // Tracks the live values alongside the (async) state updates below, so
    // handleUp can read them directly instead of committing onChange from
    // inside a setState updater — React 19 flags cross-component setState
    // calls made that way.
    let previewPitch = state.previewPitch
    let previewStartStep = state.previewStartStep

    function handleMove(moveEvent: PointerEvent) {
      const deltaX = moveEvent.clientX - state.pointerStartX
      const deltaY = moveEvent.clientY - state.pointerStartY
      if (!didDragRef.current) {
        if (Math.abs(deltaX) < DRAG_THRESHOLD_PX && Math.abs(deltaY) < DRAG_THRESHOLD_PX) return
        didDragRef.current = true
        setMoving(state)
      }
      const deltaSteps = Math.round(deltaX / cellWidth / snapSteps) * snapSteps
      const deltaPitchSteps = Math.round(deltaY / CELL_HEIGHT)
      previewStartStep = Math.min(Math.max(0, state.startStep + deltaSteps), totalSteps - state.length)
      // Pitches climb as MIDI numbers increase, but rows climb as the
      // pointer moves up (negative deltaY) — flip the sign.
      previewPitch = Math.min(MELODY_MAX_MIDI, Math.max(MELODY_MIN_MIDI, state.startPitch - deltaPitchSteps))
      setMoving((prev) => (prev && prev.noteId === state.noteId ? { ...prev, previewStartStep, previewPitch } : prev))
    }

    function handleUp() {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      if (!didDragRef.current) return
      setMoving(null)
      if (previewPitch !== note.pitch || previewStartStep !== note.startStep) {
        const withoutOverlap = clearOverlap(notes, previewPitch, previewStartStep, note.lengthSteps, note.id)
        onChange([...withoutOverlap.filter((n) => n.id !== note.id), { ...note, pitch: previewPitch, startStep: previewStartStep }])
      }
      // Defer clearing the drag flag so the synthetic click that follows
      // pointerup on this same interaction is still seen as a drag and
      // doesn't re-toggle (remove) the note that was just moved.
      setTimeout(() => {
        didDragRef.current = false
      }, 0)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  // Keeps the moving playhead in view during playback: only nudges
  // scrollLeft when the playhead is actually about to leave the visible
  // window, rather than on every single step, so it doesn't fight a smooth
  // scroll against itself many times a second at typical tempos.
  useEffect(() => {
    if (currentStep === null || !scrollRef.current) return
    const container = scrollRef.current
    const playheadX = KEY_LABEL_WIDTH + currentStep * cellWidth
    const visibleLeft = container.scrollLeft + KEY_LABEL_WIDTH
    const visibleRight = container.scrollLeft + container.clientWidth
    const margin = cellWidth * 2
    if (playheadX < visibleLeft) {
      container.scrollTo({ left: Math.max(0, playheadX - margin), behavior: 'smooth' })
    } else if (playheadX > visibleRight - margin) {
      container.scrollTo({ left: playheadX - container.clientWidth + margin, behavior: 'smooth' })
    }
  }, [currentStep, cellWidth])

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Melody</h2>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-accent" /> In key
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rotate-45 bg-slate-400" /> Out of key
          </span>
          <button
            type="button"
            onClick={onToggleScaleLock}
            aria-pressed={scaleLock}
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              scaleLock ? 'bg-accent text-white' : 'border border-slate-200 text-slate-500 hover:bg-accent-soft'
            }`}
          >
            Scale lock
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <span className="text-slate-400">Zoom:</span>
          <button
            type="button"
            onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
            disabled={zoomIndex === 0}
            aria-label="Zoom out"
            className="rounded-md border border-slate-200 px-2 py-1 font-medium hover:bg-accent-soft disabled:opacity-30 disabled:hover:bg-transparent"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setZoomIndex((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            aria-label="Zoom in"
            className="rounded-md border border-slate-200 px-2 py-1 font-medium hover:bg-accent-soft disabled:opacity-30 disabled:hover:bg-transparent"
          >
            +
          </button>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-400">Snap:</span>
          {SNAP_OPTIONS.map((option) => (
            <button
              key={option.steps}
              type="button"
              onClick={() => setSnapSteps(option.steps)}
              aria-pressed={snapSteps === option.steps}
              className={`rounded-md px-2 py-1 font-medium ${
                snapSteps === option.steps ? 'bg-accent text-white' : 'border border-slate-200 hover:bg-accent-soft'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="max-h-96 select-none overflow-auto rounded-2xl border border-slate-200 bg-white">
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `${KEY_LABEL_WIDTH}px repeat(${totalSteps}, ${cellWidth}px)` }}
        >
          {currentStep !== null && (
            <div
              className="pointer-events-none absolute inset-y-0 z-[15] w-0.5 bg-amber-500"
              style={{ left: KEY_LABEL_WIDTH + currentStep * cellWidth }}
            />
          )}
          <div className="contents">
            <div
              className="sticky left-0 top-0 z-30 border-r border-b border-slate-200 bg-slate-50"
              style={{ height: HEADER_HEIGHT }}
            />
            {Array.from({ length: barCount }, (_, barIndex) => {
              const chordItem = chords[barIndex]
              const label = chordItem ? resolveChord(musicKey, chordItem).symbol : '—'
              return (
                <div
                  key={barIndex}
                  className="sticky top-0 z-20 truncate border-r border-b border-slate-200 bg-slate-50 px-1 text-center text-[11px] font-medium text-slate-500"
                  style={{ height: HEADER_HEIGHT, gridColumn: `span ${STEPS_PER_BAR}` }}
                >
                  {label}
                </div>
              )
            })}
          </div>

          {pitches.map((pitch) => {
            const pc = pitch % 12
            const inKey = isInScale(pc, musicKey.tonic, musicKey.scale)
            const isTonic = pc === musicKey.tonic

            return (
              <div key={pitch} className="contents">
                <button
                  type="button"
                  onClick={() => onPreviewNote(pitch)}
                  aria-label={`Preview ${noteName(pc, musicKey.tonic, musicKey.scale)}`}
                  className={`sticky left-0 z-20 flex items-center justify-end border-r border-b border-slate-100 px-2 text-[11px] hover:bg-accent-soft ${
                    isTonic ? 'bg-accent-soft font-semibold text-accent' : 'bg-slate-50 text-slate-500'
                  }`}
                  style={{ height: CELL_HEIGHT }}
                >
                  {noteName(pc, musicKey.tonic, musicKey.scale)}
                </button>

                {steps.map((step) => {
                  const note = noteAt(pitch, step)
                  const isNoteStart = note?.startStep === step
                  const isNoteEnd = note ? step === note.startStep + note.lengthSteps - 1 : false
                  // A border-right on step N sits between N and N+1, so the
                  // line marking a boundary belongs on the step *before* it
                  // (the last 16th of the previous bar/beat), not on the
                  // step the bar/beat actually starts on.
                  const isBarLine = (step + 1) % STEPS_PER_BAR === 0
                  const isBeatLine = !isBarLine && (step + 1) % 4 === 0
                  const isCurrentStep = currentStep !== null && step === currentStep
                  const isLocked = scaleLock && !inKey && !note

                  return (
                    <div
                      key={step}
                      role="button"
                      tabIndex={0}
                      onPointerDown={(event) => {
                        if (note) startMove(note, event)
                      }}
                      onClick={() => {
                        if (didDragRef.current) return
                        toggleCell(pitch, step)
                      }}
                      onKeyDown={(event: KeyboardEvent) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          toggleCell(pitch, step)
                        }
                      }}
                      aria-label={`${noteName(pc, musicKey.tonic, musicKey.scale)} at step ${step + 1}`}
                      aria-disabled={isLocked}
                      className={[
                        'relative flex items-center justify-center border-b',
                        note ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                        isBarLine
                          ? 'border-r-2 border-r-slate-400'
                          : isBeatLine
                            ? 'border-r-2 border-r-slate-400/50'
                            : 'border-r border-r-slate-100',
                        'border-b-slate-100',
                        note ? 'bg-white' : inKey ? 'bg-white hover:bg-accent-soft' : 'bg-slate-50',
                        !note && !inKey && !isLocked ? 'hover:bg-accent-soft' : '',
                        isLocked ? 'cursor-not-allowed opacity-50' : '',
                        isCurrentStep ? 'ring-1 ring-inset ring-amber-400' : '',
                      ].join(' ')}
                      style={{ width: cellWidth, height: CELL_HEIGHT, touchAction: note ? 'none' : undefined }}
                    >
                      {note && isNoteStart && (
                        <span
                          className={
                            inKey ? 'h-3 w-3 rounded-[3px] bg-accent' : 'h-2.5 w-2.5 rotate-45 bg-slate-400'
                          }
                        />
                      )}
                      {note && !isNoteStart && <span className="h-1.5 w-4/5 rounded-full bg-accent/40" />}

                      {note && isNoteEnd && (
                        <div
                          role="presentation"
                          onPointerDown={(event) => startResize(note, event)}
                          onClick={(event) => event.stopPropagation()}
                          className="absolute inset-y-0 right-0 z-10 flex cursor-ew-resize items-center justify-end"
                          style={{ width: resizeHandleWidth, touchAction: 'none' }}
                        >
                          <span className="h-3/5 w-[3px] rounded-full bg-accent" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
      <p className="text-xs text-slate-400">
        Tap a cell to add a note, tap it again to remove it. Drag a note to move it, or drag the
        grip on its end to resize it. Tap a key on the left to hear it. Dimmed rows are outside the
        current key.
      </p>
    </section>
  )
}
