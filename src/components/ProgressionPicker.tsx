import { COMMON_PROGRESSIONS, getProgressionChords } from '../music-theory'
import type { MusicKey, ProgressionGenre } from '../music-theory'
import type { ChordTrackItem } from '../types/project'
import { createId } from '../utils/id'
import { BlueprintCard } from './ui/BlueprintCard'

interface ProgressionPickerProps {
  musicKey: MusicKey
  onApply: (chords: ChordTrackItem[]) => void
}

const GENRE_LABELS: Record<ProgressionGenre, string> = {
  pop: 'Pop',
  rock: 'Rock',
  jazz: 'Jazz',
  lofi: 'Lo-fi / Chill',
  emotional: 'Emotional / Ballad',
}

const GENRE_ORDER: ProgressionGenre[] = ['pop', 'rock', 'jazz', 'lofi', 'emotional']

export function ProgressionPicker({ musicKey, onApply }: ProgressionPickerProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Progression presets
      </h2>

      {GENRE_ORDER.map((genre) => {
        const presets = COMMON_PROGRESSIONS.filter((preset) => preset.genre === genre)
        if (presets.length === 0) return null

        return (
          <div key={genre} className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {GENRE_LABELS[genre]}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {presets.map((preset) => {
                const chords = getProgressionChords(musicKey.tonic, musicKey.scale, preset.pattern)
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      onApply(preset.pattern.map((degree) => ({ id: createId('chord'), degree })))
                    }
                    className="text-left"
                  >
                    <BlueprintCard className="transition-colors hover:border-accent">
                      <div className="font-semibold text-slate-800">{preset.name}</div>
                      <div className="text-xs text-slate-400">{chords.map((c) => c.roman).join(' – ')}</div>
                      <div className="text-sm text-slate-500">{chords.map((c) => c.rootName).join(' – ')}</div>
                    </BlueprintCard>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}
