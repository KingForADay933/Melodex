import { useState } from 'react'
import { useGuidance } from '../guidance/GuidanceContext'
import { getDiatonicChords, getToneCount, getVoicedChord, suggestNextDegrees } from '../music-theory'
import type { ChordExtension, MusicKey } from '../music-theory'
import type { ChordTrackItem } from '../types/project'
import { createChordTrackItem } from '../utils/createChordTrackItem'
import { BlueprintCard } from './ui/BlueprintCard'

interface ChordTrackProps {
  musicKey: MusicKey
  chords: ChordTrackItem[]
  onChange: (chords: ChordTrackItem[]) => void
  /** Index of the chord currently sounding during playback, if any. */
  activeIndex?: number | null
}

const EXTENSION_OPTIONS: { value: ChordExtension; label: string }[] = [
  { value: 'triad', label: 'Triad' },
  { value: 'seventh', label: '7th' },
  { value: 'ninth', label: '9th' },
  { value: 'sus2', label: 'Sus2' },
  { value: 'sus4', label: 'Sus4' },
]

function inversionLabel(n: number): string {
  if (n === 0) return 'Root'
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
  return `${n}${suffix}`
}

export function ChordTrack({ musicKey, chords, onChange, activeIndex = null }: ChordTrackProps) {
  const diatonicChords = getDiatonicChords(musicKey.tonic, musicKey.scale)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { enabled: guidanceEnabled } = useGuidance()
  const lastDegree = chords.length > 0 ? chords[chords.length - 1].degree : null
  const suggestedDegrees = guidanceEnabled ? suggestNextDegrees(lastDegree) : []

  const addChord = (degree: number) => {
    onChange([...chords, createChordTrackItem(degree)])
  }

  const removeChord = (id: string) => {
    onChange(chords.filter((c) => c.id !== id))
  }

  const moveChord = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= chords.length) return
    const next = [...chords]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    onChange(next)
  }

  const updateChord = (id: string, patch: Partial<Pick<ChordTrackItem, 'extension' | 'inversion'>>) => {
    onChange(chords.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chord track</h2>

      {chords.length === 0 ? (
        <p className="text-sm text-slate-400">
          Tap a progression preset above, or add chords one at a time below.
        </p>
      ) : (
        <div className="space-y-2">
          {chords.map((item, index) => {
            const voiced = getVoicedChord(musicKey.tonic, musicKey.scale, item.degree, item.extension, item.inversion)
            const isExpanded = expandedId === item.id
            const toneCount = getToneCount(item.extension)

            return (
              <BlueprintCard key={item.id} active={activeIndex === index} className="!py-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate text-base font-semibold text-slate-800">{voiced.symbol}</div>
                    <div className="text-xs text-slate-400">
                      {diatonicChords[item.degree - 1].roman}
                      {item.extension !== 'triad' && ` · ${EXTENSION_OPTIONS.find((o) => o.value === item.extension)?.label}`}
                      {item.inversion !== 0 && ` · ${inversionLabel(item.inversion)} inv.`}
                    </div>
                  </button>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveChord(index, -1)}
                      disabled={index === 0}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-accent-soft hover:text-accent disabled:opacity-30 disabled:hover:bg-transparent"
                      aria-label="Move chord earlier"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => moveChord(index, 1)}
                      disabled={index === chords.length - 1}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-accent-soft hover:text-accent disabled:opacity-30 disabled:hover:bg-transparent"
                      aria-label="Move chord later"
                    >
                      ›
                    </button>
                    <button
                      type="button"
                      onClick={() => removeChord(item.id)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      aria-label="Remove chord"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap gap-1.5">
                      {EXTENSION_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateChord(item.id, { extension: option.value })}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                            item.extension === option.value
                              ? 'bg-accent text-white'
                              : 'border border-slate-200 text-slate-600 hover:bg-accent-soft'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-slate-400">Inversion:</span>
                      {Array.from({ length: toneCount }, (_, n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => updateChord(item.id, { inversion: n })}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                            item.inversion === n
                              ? 'bg-accent text-white'
                              : 'border border-slate-200 text-slate-600 hover:bg-accent-soft'
                          }`}
                        >
                          {inversionLabel(n)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </BlueprintCard>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {diatonicChords.map((chord) => {
          const isSuggested = suggestedDegrees.includes(chord.degree)
          return (
            <button
              key={chord.degree}
              type="button"
              onClick={() => addChord(chord.degree)}
              className={`rounded-lg border px-2.5 py-1 text-xs ${
                isSuggested
                  ? 'border-accent text-accent ring-1 ring-accent/40 hover:bg-accent-soft'
                  : 'border-dashed border-slate-300 text-slate-500 hover:border-accent hover:text-accent'
              }`}
            >
              + {chord.roman}
            </button>
          )
        })}
      </div>
    </section>
  )
}
