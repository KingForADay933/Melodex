import { useState } from 'react'
import { ChordTrack } from '../components/ChordTrack'
import { ProgressionPicker } from '../components/ProgressionPicker'
import { ScreenHeader } from '../components/ScreenHeader'
import { GuidanceTip } from '../components/ui/GuidanceTip'
import type { ChordTrackItem, Project } from '../types/project'
import { formatScreenSubtitle } from '../utils/formatProject'

interface ChordsScreenProps {
  project: Project
  onChordsChange: (chords: ChordTrackItem[]) => void
  activeIndex: number | null
}

export function ChordsScreen({ project, onChordsChange, activeIndex }: ChordsScreenProps) {
  const [showPicker, setShowPicker] = useState(project.chords.length === 0)

  return (
    <div className="space-y-5">
      <ScreenHeader title="Chord Track" subtitle={formatScreenSubtitle(project)} />
      <GuidanceTip>
        This is your song&rsquo;s chord sequence. Use the arrows to reorder, or tap a roman
        numeral below to add another chord from your key.
      </GuidanceTip>

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
