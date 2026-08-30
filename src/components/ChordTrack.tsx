import { getDiatonicChords } from '../music-theory'
import type { MusicKey } from '../music-theory'
import type { ChordTrackItem } from '../types/project'
import { createId } from '../utils/id'

interface ChordTrackProps {
  musicKey: MusicKey
  chords: ChordTrackItem[]
  onChange: (chords: ChordTrackItem[]) => void
  /** Index of the chord currently sounding during playback, if any. */
  activeIndex?: number | null
}

const QUALITY_SUFFIX: Record<string, string> = {
  minor: 'm',
  diminished: '°',
  augmented: '+',
}

export function ChordTrack({ musicKey, chords, onChange, activeIndex = null }: ChordTrackProps) {
  const diatonicChords = getDiatonicChords(musicKey.tonic, musicKey.scale)

  const addChord = (degree: number) => {
    onChange([...chords, { id: createId('chord'), degree }])
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

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Chord track</h2>

      {chords.length === 0 ? (
        <p className="text-sm text-slate-400">
          Tap a progression preset above, or add chords one at a time below.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {chords.map((item, index) => {
            const chord = diatonicChords[item.degree - 1]
            return (
              <div
                key={item.id}
                className={`flex items-center gap-1 rounded-lg border px-1.5 py-1.5 ${
                  activeIndex === index ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'
                }`}
              >
                <button
                  type="button"
                  onClick={() => moveChord(index, -1)}
                  disabled={index === 0}
                  className="px-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                  aria-label="Move chord earlier"
                >
                  ‹
                </button>
                <div className="px-1 text-center leading-tight">
                  <div className="text-[10px] text-slate-400">{chord.roman}</div>
                  <div className="text-sm font-semibold text-slate-800">
                    {chord.rootName}
                    {QUALITY_SUFFIX[chord.quality] ?? ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => moveChord(index, 1)}
                  disabled={index === chords.length - 1}
                  className="px-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                  aria-label="Move chord later"
                >
                  ›
                </button>
                <button
                  type="button"
                  onClick={() => removeChord(item.id)}
                  className="ml-1 px-1 text-slate-400 hover:text-red-500"
                  aria-label="Remove chord"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {diatonicChords.map((chord) => (
          <button
            key={chord.degree}
            type="button"
            onClick={() => addChord(chord.degree)}
            className="rounded-md border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
          >
            + {chord.roman}
          </button>
        ))}
      </div>
    </section>
  )
}
