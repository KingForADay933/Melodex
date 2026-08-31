import { KeyScalePicker } from '../components/KeyScalePicker'
import { ScreenHeader } from '../components/ScreenHeader'
import { GuidanceTip } from '../components/ui/GuidanceTip'
import type { MusicKey } from '../music-theory'
import type { HistoryControls } from '../navigation/types'

interface KeyScreenProps extends HistoryControls {
  musicKey: MusicKey
  onChange: (key: MusicKey) => void
  onContinue: () => void
}

export function KeyScreen({ musicKey, onChange, onContinue, ...history }: KeyScreenProps) {
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
    </div>
  )
}
