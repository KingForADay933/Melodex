import { useState } from 'react'
import { KeyScalePicker } from '../components/KeyScalePicker'
import { ScreenHeader } from '../components/ScreenHeader'
import { GuidanceTip } from '../components/ui/GuidanceTip'
import type { MusicKey } from '../music-theory'
import type { HistoryControls } from '../navigation/types'
import type { Project } from '../types/project'
import { formatKeyLabel } from '../utils/formatProject'

interface KeyScreenProps extends HistoryControls {
  project: Project
  onChange: (key: MusicKey) => void
  onTranspose: (key: MusicKey) => void
  onContinue: () => void
}

export function KeyScreen({ project, onChange, onTranspose, onContinue, ...history }: KeyScreenProps) {
  const musicKey = project.key
  const [targetKey, setTargetKey] = useState<MusicKey>(musicKey)
  const hasContent = project.sections.some((s) => s.chords.length > 0 || s.melody.length > 0)
  const isSameKey = targetKey.tonic === musicKey.tonic && targetKey.scale === musicKey.scale

  return (
    <div className="space-y-5">
      <ScreenHeader title="Choose a Key" {...history} />
      <GuidanceTip>
        Your key sets which notes and chords sound &ldquo;in tune&rdquo; together. Major keys tend
        to sound bright; minor keys sound moodier.
      </GuidanceTip>
      <KeyScalePicker value={musicKey} onChange={onChange} />
      <button
        type="button"
        onClick={onContinue}
        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        Continue
      </button>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Transpose existing song</h2>
          <p className="text-xs text-slate-400">
            Pick a different key to shift your written melody and re-voice your chords, without
            starting over.
          </p>
        </div>
        <KeyScalePicker value={targetKey} onChange={setTargetKey} />
        <button
          type="button"
          onClick={() => onTranspose(targetKey)}
          disabled={isSameKey || !hasContent}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-accent-soft disabled:opacity-40"
        >
          Transpose to {formatKeyLabel({ ...project, key: targetKey })}
        </button>
      </div>
    </div>
  )
}
