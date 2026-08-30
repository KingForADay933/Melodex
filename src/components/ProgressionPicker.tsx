import { COMMON_PROGRESSIONS, getProgressionChords } from '../music-theory'
import type { MusicKey } from '../music-theory'
import type { ChordTrackItem } from '../types/project'
import { createId } from '../utils/id'
import { BlueprintCard } from './ui/BlueprintCard'

interface ProgressionPickerProps {
  musicKey: MusicKey
  onApply: (chords: ChordTrackItem[]) => void
}

export function ProgressionPicker({ musicKey, onApply }: ProgressionPickerProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Progression presets
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {COMMON_PROGRESSIONS.map((preset) => {
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
                <div className="text-sm text-slate-500">{chords.map((c) => c.rootName).join(' – ')}</div>
              </BlueprintCard>
            </button>
          )
        })}
      </div>
    </section>
  )
}
