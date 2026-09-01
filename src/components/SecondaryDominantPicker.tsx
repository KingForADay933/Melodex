import { getDiatonicChord, getSecondaryDominantChord } from '../music-theory'
import type { MusicKey } from '../music-theory'
import type { ChordTrackItem } from '../types/project'
import { createChordTrackItem } from '../utils/createChordTrackItem'
import { BlueprintCard } from './ui/BlueprintCard'

interface SecondaryDominantPickerProps {
  musicKey: MusicKey
  onApply: (chord: ChordTrackItem) => void
}

// Excludes 1 (tonicizing the tonic is meaningless) and 7 (V/vii° tonicizes
// an already-diminished chord — harmonically valid but pedagogically
// unusual; easy to widen later).
const TARGET_DEGREES = [2, 3, 4, 5, 6]

/** Dominant-function chords that tonicize another diatonic degree (e.g.
 * "V/vi" resolving to vi), gated behind advanced mode. */
export function SecondaryDominantPicker({ musicKey, onApply }: SecondaryDominantPickerProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Secondary dominants</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {TARGET_DEGREES.map((degree) => {
          const target = getDiatonicChord(musicKey.tonic, musicKey.scale, degree)
          const dominant = getSecondaryDominantChord(musicKey.tonic, musicKey.scale, degree, 'triad', 0)
          return (
            <button
              key={degree}
              type="button"
              onClick={() => onApply(createChordTrackItem(degree, { kind: 'secondaryDominant' }))}
              className="text-left"
            >
              <BlueprintCard className="!py-2 transition-colors hover:border-accent">
                <div className="font-semibold text-slate-800">{dominant.rootName}</div>
                <div className="text-xs text-slate-400">V/{target.roman} · resolves to {target.roman}</div>
              </BlueprintCard>
            </button>
          )
        })}
      </div>
    </section>
  )
}
