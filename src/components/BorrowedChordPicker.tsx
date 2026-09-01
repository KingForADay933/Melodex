import { getBorrowedRomanNumeral, getDiatonicChord, parallelScale } from '../music-theory'
import type { MusicKey } from '../music-theory'
import type { ChordTrackItem } from '../types/project'
import { createChordTrackItem } from '../utils/createChordTrackItem'
import { BlueprintCard } from './ui/BlueprintCard'

interface BorrowedChordPickerProps {
  musicKey: MusicKey
  onApply: (chord: ChordTrackItem) => void
}

const DEGREES = [1, 2, 3, 4, 5, 6, 7]

/** Chords borrowed from the parallel scale (modal interchange) — only shown
 * for degrees where the borrowed chord actually differs from the diatonic
 * one, since some degrees coincide between major and natural minor. */
export function BorrowedChordPicker({ musicKey, onApply }: BorrowedChordPickerProps) {
  const candidates = DEGREES.map((degree) => {
    const home = getDiatonicChord(musicKey.tonic, musicKey.scale, degree)
    const borrowed = getDiatonicChord(musicKey.tonic, parallelScale(musicKey.scale), degree)
    return { degree, home, borrowed }
  }).filter(({ home, borrowed }) => borrowed.root !== home.root || borrowed.quality !== home.quality)

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Borrowed chords</h2>
      {candidates.length === 0 ? (
        <p className="text-sm text-slate-400">No borrowed chords differ from this key&rsquo;s own.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {candidates.map(({ degree, borrowed }) => (
            <button
              key={degree}
              type="button"
              onClick={() => onApply(createChordTrackItem(degree, { kind: 'borrowed' }))}
              className="text-left"
            >
              <BlueprintCard className="!py-2 transition-colors hover:border-accent">
                <div className="font-semibold text-slate-800">{borrowed.rootName}</div>
                <div className="text-xs text-slate-400">{getBorrowedRomanNumeral(musicKey.tonic, musicKey.scale, degree)}</div>
              </BlueprintCard>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
