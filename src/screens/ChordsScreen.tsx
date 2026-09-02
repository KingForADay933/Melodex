import { useState } from 'react'
import { useAdvancedMode } from '../advancedMode/AdvancedModeContext'
import type { InstrumentId } from '../audio/instruments'
import { BorrowedChordPicker } from '../components/BorrowedChordPicker'
import { ChordTrack } from '../components/ChordTrack'
import { InstrumentPicker } from '../components/InstrumentPicker'
import { ProgressionPicker } from '../components/ProgressionPicker'
import { ScreenHeader } from '../components/ScreenHeader'
import { SecondaryDominantPicker } from '../components/SecondaryDominantPicker'
import { SectionSwitcher } from '../components/SectionSwitcher'
import { GuidanceTip } from '../components/ui/GuidanceTip'
import type { HistoryControls } from '../navigation/types'
import type { ChordTrackItem, Project, Section } from '../types/project'
import { formatScreenSubtitle } from '../utils/formatProject'

interface ChordsScreenProps extends HistoryControls {
  project: Project
  section: Section
  sections: Section[]
  activeSectionId: string
  onSelectSection: (id: string) => void
  onChordsChange: (chords: ChordTrackItem[]) => void
  onInstrumentChange: (instrument: InstrumentId) => void
  activeIndex: number | null
}

export function ChordsScreen({
  project,
  section,
  sections,
  activeSectionId,
  onSelectSection,
  onChordsChange,
  onInstrumentChange,
  activeIndex,
  ...history
}: ChordsScreenProps) {
  const [showPicker, setShowPicker] = useState(section.chords.length === 0)
  const [showBorrowed, setShowBorrowed] = useState(false)
  const [showSecondaryDominants, setShowSecondaryDominants] = useState(false)
  const { enabled: advancedMode, toggle: toggleAdvancedMode } = useAdvancedMode()

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Chord Track"
        subtitle={formatScreenSubtitle(project, section)}
        updatedAt={project.updatedAt}
        {...history}
      />
      <GuidanceTip>
        This is your song&rsquo;s chord sequence. Use the arrows to reorder, or tap a roman
        numeral below to add another chord from your key.
      </GuidanceTip>

      <SectionSwitcher sections={sections} activeSectionId={activeSectionId} onSelect={onSelectSection} />

      <InstrumentPicker label="Sound" value={project.chordInstrument} onChange={onInstrumentChange} />

      <ChordTrack
        musicKey={project.key}
        chords={section.chords}
        onChange={onChordsChange}
        activeIndex={activeIndex}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className="text-sm font-medium text-accent hover:underline"
        >
          {showPicker ? 'Hide progression presets' : 'Try another progression'}
        </button>
        <button
          type="button"
          onClick={() => setShowBorrowed((v) => !v)}
          className="text-sm font-medium text-accent hover:underline"
        >
          {showBorrowed ? 'Hide borrowed chords' : 'Borrowed chords'}
        </button>
        <button
          type="button"
          onClick={toggleAdvancedMode}
          aria-pressed={advancedMode}
          className={`rounded-md px-2 py-1 text-xs font-medium ${
            advancedMode ? 'bg-accent text-white' : 'border border-slate-200 text-slate-500 hover:bg-accent-soft'
          }`}
        >
          Advanced mode
        </button>
      </div>

      {showPicker && (
        <ProgressionPicker
          musicKey={project.key}
          onApply={(chords) => {
            onChordsChange(chords)
            setShowPicker(false)
          }}
        />
      )}

      {showBorrowed && (
        <BorrowedChordPicker
          musicKey={project.key}
          onApply={(chord) => onChordsChange([...section.chords, chord])}
        />
      )}

      {advancedMode && (
        <>
          <button
            type="button"
            onClick={() => setShowSecondaryDominants((v) => !v)}
            className="text-sm font-medium text-accent hover:underline"
          >
            {showSecondaryDominants ? 'Hide secondary dominants' : 'Secondary dominants'}
          </button>
          {showSecondaryDominants && (
            <SecondaryDominantPicker
              musicKey={project.key}
              onApply={(chord) => onChordsChange([...section.chords, chord])}
            />
          )}
        </>
      )}
    </div>
  )
}
