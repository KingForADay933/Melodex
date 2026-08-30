import { useMemo } from 'react'
import { MELODY_MAX_MIDI, MELODY_MIN_MIDI, STEPS_PER_BAR } from '../constants'
import { getDiatonicChords, isInScale, noteName } from '../music-theory'
import type { MusicKey } from '../music-theory'
import type { ChordTrackItem, MelodyNote } from '../types/project'
import { createId } from '../utils/id'

interface PianoRollProps {
  musicKey: MusicKey
  chords: ChordTrackItem[]
  notes: MelodyNote[]
  totalSteps: number
  onChange: (notes: MelodyNote[]) => void
  /** Current playback step (16th notes), for the moving playhead highlight. */
  currentStep: number | null
}

// Notes are placed at a fixed length rather than drawn/resized — free-length
// editing is a later-phase piano-roll refinement, not a Phase 0 requirement.
const DEFAULT_NOTE_LENGTH_STEPS = 2
const CELL_WIDTH = 22
const CELL_HEIGHT = 18
const HEADER_HEIGHT = 22

export function PianoRoll({ musicKey, chords, notes, totalSteps, onChange, currentStep }: PianoRollProps) {
  const pitches = useMemo(() => {
    const result: number[] = []
    for (let midi = MELODY_MAX_MIDI; midi >= MELODY_MIN_MIDI; midi -= 1) result.push(midi)
    return result
  }, [])

  const steps = useMemo(() => Array.from({ length: totalSteps }, (_, i) => i), [totalSteps])
  const diatonicChords = getDiatonicChords(musicKey.tonic, musicKey.scale)
  const barCount = Math.max(chords.length, 1)

  function noteAt(pitch: number, step: number): MelodyNote | undefined {
    return notes.find(
      (n) => n.pitch === pitch && step >= n.startStep && step < n.startStep + n.lengthSteps,
    )
  }

  function toggleCell(pitch: number, step: number) {
    const existing = noteAt(pitch, step)
    if (existing) {
      onChange(notes.filter((n) => n.id !== existing.id))
      return
    }
    const length = Math.min(DEFAULT_NOTE_LENGTH_STEPS, totalSteps - step)
    // Placing a note clears any note on the same pitch it would overlap,
    // so the grid never has to represent stacked/ambiguous notes.
    const withoutOverlap = notes.filter(
      (n) => !(n.pitch === pitch && step < n.startStep + n.lengthSteps && step + length > n.startStep),
    )
    onChange([...withoutOverlap, { id: createId('note'), pitch, startStep: step, lengthSteps: length }])
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Melody</h2>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-accent" /> In key
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rotate-45 bg-slate-400" /> Out of key
          </span>
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
              const label = chordItem ? diatonicChords[chordItem.degree - 1].rootName : '—'
              return (
                <div
                  key={barIndex}
                  className="sticky top-0 z-10 border-r border-b border-slate-200 bg-slate-50 px-1 text-center text-[11px] font-medium text-slate-500"
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
                <div
                  className={`sticky left-0 z-10 flex items-center justify-end border-r border-b border-slate-100 px-2 text-[11px] ${
                    isTonic ? 'bg-accent-soft font-semibold text-accent' : 'bg-slate-50 text-slate-500'
                  }`}
                  style={{ height: CELL_HEIGHT }}
                >
                  {noteName(pc, musicKey.tonic, musicKey.scale)}
                </div>

                {steps.map((step) => {
                  const note = noteAt(pitch, step)
                  const isNoteStart = note?.startStep === step
                  const barBoundary = step % STEPS_PER_BAR === 0
                  const isCurrentStep = currentStep !== null && step === currentStep

                  return (
                    <button
                      key={step}
                      type="button"
                      onClick={() => toggleCell(pitch, step)}
                      aria-label={`${noteName(pc, musicKey.tonic, musicKey.scale)} at step ${step + 1}`}
                      className={[
                        'relative flex items-center justify-center border-b border-r',
                        barBoundary ? 'border-r-slate-300' : 'border-r-slate-100',
                        'border-b-slate-100',
                        note ? 'bg-white' : inKey ? 'bg-white hover:bg-accent-soft' : 'bg-slate-50 hover:bg-accent-soft',
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
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
      <p className="text-xs text-slate-400">
        Tap a cell to add a note, tap it again to remove it. Dimmed rows are outside the current key.
      </p>
    </section>
  )
}
