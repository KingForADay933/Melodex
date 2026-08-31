import { useMemo, useState } from 'react'
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { MELODY_MAX_MIDI, MELODY_MIN_MIDI, STEPS_PER_BAR } from '../constants'
import { getVoicedChord, isInScale, noteName } from '../music-theory'
import type { MusicKey } from '../music-theory'
import type { ChordTrackItem, MelodyNote } from '../types/project'
import { createId } from '../utils/id'

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
const CELL_WIDTH = 22
const CELL_HEIGHT = 18
const HEADER_HEIGHT = 22
const RESIZE_HANDLE_WIDTH = 8

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

/** How long a note at (pitch, startStep) can grow before hitting the next
 * note on the same pitch, or the end of the track. */
function getMaxLength(pitch: number, startStep: number, notes: MelodyNote[], excludeNoteId: string, totalSteps: number): number {
  const nextNoteStart = notes
    .filter((n) => n.id !== excludeNoteId && n.pitch === pitch && n.startStep > startStep)
    .reduce((min, n) => Math.min(min, n.startStep), totalSteps)
  return nextNoteStart - startStep
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

  const pitches = useMemo(() => {
    const result: number[] = []
    for (let midi = MELODY_MAX_MIDI; midi >= MELODY_MIN_MIDI; midi -= 1) result.push(midi)
    return result
  }, [])

  const steps = useMemo(() => Array.from({ length: totalSteps }, (_, i) => i), [totalSteps])
  const barCount = Math.max(chords.length, 1)

  // While dragging, the grid renders the note at its live preview length
  // without touching the committed notes (and its undo-history entry) —
  // that only happens once, on release.
  const displayNotes = useMemo(() => {
    if (!resizing) return notes
    return notes.map((n) => (n.id === resizing.noteId ? { ...n, lengthSteps: resizing.previewLength } : n))
  }, [notes, resizing])

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
    // Placing a note clears any note on the same pitch it would overlap,
    // so the grid never has to represent stacked/ambiguous notes.
    const withoutOverlap = notes.filter(
      (n) => !(n.pitch === pitch && step < n.startStep + n.lengthSteps && step + length > n.startStep),
    )
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

    const maxLength = getMaxLength(note.pitch, note.startStep, notes, note.id, totalSteps)

    function handleMove(moveEvent: PointerEvent) {
      const deltaSteps = Math.round((moveEvent.clientX - state.pointerStartX) / CELL_WIDTH)
      const nextLength = Math.min(maxLength, Math.max(1, state.startLength + deltaSteps))
      setResizing((prev) => (prev && prev.noteId === state.noteId ? { ...prev, previewLength: nextLength } : prev))
    }

    function handleUp() {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      setResizing((prev) => {
        if (prev && prev.noteId === state.noteId && prev.previewLength !== note.lengthSteps) {
          onChange(notes.map((n) => (n.id === note.id ? { ...n, lengthSteps: prev.previewLength } : n)))
        }
        return null
      })
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

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

      <div className="max-h-96 overflow-auto rounded-2xl border border-slate-200 bg-white">
        <div className="grid" style={{ gridTemplateColumns: `56px repeat(${totalSteps}, ${CELL_WIDTH}px)` }}>
          <div className="contents">
            <div
              className="sticky left-0 top-0 z-20 border-r border-b border-slate-200 bg-slate-50"
              style={{ height: HEADER_HEIGHT }}
            />
            {Array.from({ length: barCount }, (_, barIndex) => {
              const chordItem = chords[barIndex]
              const label = chordItem
                ? getVoicedChord(musicKey.tonic, musicKey.scale, chordItem.degree, chordItem.extension, chordItem.inversion)
                    .symbol
                : '—'
              return (
                <div
                  key={barIndex}
                  className="sticky top-0 z-10 truncate border-r border-b border-slate-200 bg-slate-50 px-1 text-center text-[11px] font-medium text-slate-500"
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
                  className={`sticky left-0 z-10 flex items-center justify-end border-r border-b border-slate-100 px-2 text-[11px] hover:bg-accent-soft ${
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
                      onClick={() => toggleCell(pitch, step)}
                      onKeyDown={(event: KeyboardEvent) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          toggleCell(pitch, step)
                        }
                      }}
                      aria-label={`${noteName(pc, musicKey.tonic, musicKey.scale)} at step ${step + 1}`}
                      aria-disabled={isLocked}
                      className={[
                        'relative flex cursor-pointer items-center justify-center border-b',
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
                      style={{ width: CELL_WIDTH, height: CELL_HEIGHT }}
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
                          style={{ width: RESIZE_HANDLE_WIDTH, touchAction: 'none' }}
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
        Tap a cell to add a note, tap it again to remove it. Drag the grip on a note&rsquo;s end to
        resize it. Tap a key on the left to hear it. Dimmed rows are outside the current key.
      </p>
    </section>
  )
}
