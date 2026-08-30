import { COMMON_PROGRESSIONS, getProgressionChords } from '../music-theory'
import type { MusicKey } from '../music-theory'
import type { ChordTrackItem } from '../types/project'
import { createId } from '../utils/id'

interface ProgressionPickerProps {
  musicKey: MusicKey
  onApply: (chords: ChordTrackItem[]) => void
}

export function ProgressionPicker({ musicKey, onApply }: ProgressionPickerProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Progression presets
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {COMMON_PROGRESSIONS.map((preset) => {
          const chords = getProgressionChords(musicKey.tonic, musicKey.scale, preset.pattern)
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                onApply(preset.pattern.map((degree) => ({ id: createId('chord'), degree })))
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:bg-slate-100"
            >
              <div className="font-medium text-slate-800">{preset.name}</div>
              <div className="text-slate-500">{chords.map((c) => c.rootName).join(' – ')}</div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
