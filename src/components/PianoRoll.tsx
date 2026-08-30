import { useMemo } from 'react'
import { MELODY_MAX_MIDI, MELODY_MIN_MIDI, STEPS_PER_BAR } from '../constants'
import { isInScale, noteName } from '../music-theory'
import type { MusicKey } from '../music-theory'
import type { MelodyNote } from '../types/project'
import { createId } from '../utils/id'

interface PianoRollProps {
  musicKey: MusicKey
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

export function PianoRoll({ musicKey, notes, totalSteps, onChange, currentStep }: PianoRollProps) {
  const pitches = useMemo(() => {
    const result: number[] = []
    for (let midi = MELODY_MAX_MIDI; midi >= MELODY_MIN_MIDI; midi -= 1) result.push(midi)
    return result
  }, [])

  const steps = useMemo(() => Array.from({ length: totalSteps }, (_, i) => i), [totalSteps])

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
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Melody</h2>
      <div className="max-h-96 overflow-auto rounded-lg border border-slate-200 bg-white">
        <div className="grid" style={{ gridTemplateColumns: `56px repeat(${totalSteps}, ${CELL_WIDTH}px)` }}>
          {pitches.map((pitch) => {
            const pc = pitch % 12
            const inKey = isInScale(pc, musicKey.tonic, musicKey.scale)
            const isTonic = pc === musicKey.tonic

            return (
              <div key={pitch} className="contents">
                <div
                  className={`sticky left-0 z-10 flex items-center justify-end border-r border-b border-slate-100 px-2 text-[11px] ${
                    isTonic ? 'bg-indigo-50 font-semibold text-indigo-700' : 'bg-slate-50 text-slate-500'
                  }`}
                  style={{ height: CELL_HEIGHT }}
                >
                  {noteName(pc, musicKey.tonic, musicKey.scale)}
                </div>

                {steps.map((step) => {
                  const note = noteAt(pitch, step)
                  const barBoundary = step % STEPS_PER_BAR === 0
                  const isCurrentStep = currentStep !== null && step === currentStep

                  return (
                    <button
                      key={step}
                      type="button"
                      onClick={() => toggleCell(pitch, step)}
                      aria-label={`${noteName(pc, musicKey.tonic, musicKey.scale)} at step ${step + 1}`}
                      className={[
                        'border-b border-r',
                        barBoundary ? 'border-r-slate-300' : 'border-r-slate-100',
                        'border-b-slate-100',
                        note ? 'bg-indigo-500' : inKey ? 'bg-white hover:bg-indigo-50' : 'bg-slate-50 hover:bg-indigo-50',
                        isCurrentStep ? 'ring-1 ring-inset ring-amber-400' : '',
                      ].join(' ')}
                      style={{ width: CELL_WIDTH, height: CELL_HEIGHT }}
                    />
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
