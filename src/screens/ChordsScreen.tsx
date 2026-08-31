import { useState } from 'react'
import type { InstrumentId } from '../audio/instruments'
import { ChordTrack } from '../components/ChordTrack'
import { InstrumentPicker } from '../components/InstrumentPicker'
import { ProgressionPicker } from '../components/ProgressionPicker'
import { ScreenHeader } from '../components/ScreenHeader'
import { GuidanceTip } from '../components/ui/GuidanceTip'
import type { HistoryControls } from '../navigation/types'
import type { ChordTrackItem, Project } from '../types/project'
import { formatScreenSubtitle } from '../utils/formatProject'

interface ChordsScreenProps extends HistoryControls {
  project: Project
  onChordsChange: (chords: ChordTrackItem[]) => void
  onInstrumentChange: (instrument: InstrumentId) => void
  activeIndex: number | null
}

export function ChordsScreen({
  project,
  onChordsChange,
  onInstrumentChange,
  activeIndex,
  ...history
}: ChordsScreenProps) {
  const [showPicker, setShowPicker] = useState(project.chords.length === 0)

  return (
    <div className="space-y-5">
      <ScreenHeader title="Chord Track" subtitle={formatScreenSubtitle(project)} {...history} />
      <GuidanceTip>
        This is your song&rsquo;s chord sequence. Use the arrows to reorder, or tap a roman
        numeral below to add another chord from your key.
      </GuidanceTip>

      <InstrumentPicker label="Sound" value={project.chordInstrument} onChange={onInstrumentChange} />

      <ChordTrack
        musicKey={project.key}
        chords={project.chords}
        onChange={onChordsChange}
        activeIndex={activeIndex}
      />

      <button
        type="button"
        onClick={() => setShowPicker((v) => !v)}
        className="text-sm font-medium text-accent hover:underline"
      >
        {showPicker ? 'Hide progression presets' : 'Try another progression'}
      </button>

      {showPicker && (
        <ProgressionPicker
          musicKey={project.key}
          onApply={(chords) => {
            onChordsChange(chords)
            setShowPicker(false)
          }}
        />
      )}
    </div>
  )
}
