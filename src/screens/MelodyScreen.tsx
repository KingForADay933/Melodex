import { useState } from 'react'
import type { InstrumentId } from '../audio/instruments'
import { InstrumentPicker } from '../components/InstrumentPicker'
import { LayerSwitcher } from '../components/LayerSwitcher'
import type { MelodyLayerId } from '../components/LayerSwitcher'
import { PianoRoll } from '../components/PianoRoll'
import { ScreenHeader } from '../components/ScreenHeader'
import { SectionSwitcher } from '../components/SectionSwitcher'
import { GuidanceTip } from '../components/ui/GuidanceTip'
import { ARPEGGIO_PATTERNS, generateArpeggio, generateBassline, RHYTHM_TEMPLATES } from '../melody/arpeggiator'
import type { ArpeggioPattern, RhythmTemplate } from '../melody/arpeggiator'
import type { HistoryControls } from '../navigation/types'
import type { MelodyNote, Project, Section } from '../types/project'
import { formatScreenSubtitle } from '../utils/formatProject'

interface MelodyScreenProps extends HistoryControls {
  project: Project
  section: Section
  sections: Section[]
  activeSectionId: string
  onSelectSection: (id: string) => void
  totalSteps: number
  onMelodyChange: (notes: MelodyNote[]) => void
  onBasslineChange: (notes: MelodyNote[]) => void
  onHarmonyMelodyChange: (notes: MelodyNote[]) => void
  onInstrumentChange: (instrument: InstrumentId) => void
  onBassInstrumentChange: (instrument: InstrumentId) => void
  onHarmonyInstrumentChange: (instrument: InstrumentId) => void
  onPreviewNote: (pitch: number, instrumentId: InstrumentId) => void
  currentStep: number | null
}

interface LayerConfig {
  label: string
  notes: MelodyNote[]
  onChange: (notes: MelodyNote[]) => void
  instrument: InstrumentId
  onInstrumentChange: (instrument: InstrumentId) => void
  generate: (chords: Section['chords'], key: Project['key'], pattern: ArpeggioPattern, rhythm: RhythmTemplate) => MelodyNote[]
}

export function MelodyScreen({
  project,
  section,
  sections,
  activeSectionId,
  onSelectSection,
  totalSteps,
  onMelodyChange,
  onBasslineChange,
  onHarmonyMelodyChange,
  onInstrumentChange,
  onBassInstrumentChange,
  onHarmonyInstrumentChange,
  onPreviewNote,
  currentStep,
  ...history
}: MelodyScreenProps) {
  const [scaleLock, setScaleLock] = useState(false)
  const [rhythm, setRhythm] = useState<RhythmTemplate>(RHYTHM_TEMPLATES[0])
  const [activeLayer, setActiveLayer] = useState<MelodyLayerId>('lead')

  const layerConfig: Record<MelodyLayerId, LayerConfig> = {
    lead: {
      label: 'melody',
      notes: section.melody,
      onChange: onMelodyChange,
      instrument: project.melodyInstrument,
      onInstrumentChange,
      generate: generateArpeggio,
    },
    harmony: {
      label: 'harmony line',
      notes: section.harmonyMelody,
      onChange: onHarmonyMelodyChange,
      instrument: project.harmonyInstrument,
      onInstrumentChange: onHarmonyInstrumentChange,
      generate: generateArpeggio,
    },
    bass: {
      label: 'bassline',
      notes: section.bassline,
      onChange: onBasslineChange,
      instrument: project.bassInstrument,
      onInstrumentChange: onBassInstrumentChange,
      generate: generateBassline,
    },
  }
  const active = layerConfig[activeLayer]

  function applyGenerator(pattern: ArpeggioPattern) {
    if (section.chords.length === 0) return
    if (active.notes.length > 0 && !window.confirm(`Replace the current ${active.label} with a generated one?`)) {
      return
    }
    active.onChange(active.generate(section.chords, project.key, pattern, rhythm))
  }

  return (
    <div className="space-y-5">
      <ScreenHeader title="Melody" subtitle={formatScreenSubtitle(project, section)} {...history} />
      <GuidanceTip>
        Filled squares are in your key — they&rsquo;ll always sound &ldquo;right.&rdquo; Grey
        diamonds are outside it — use them sparingly for tension.
      </GuidanceTip>

      <SectionSwitcher sections={sections} activeSectionId={activeSectionId} onSelect={onSelectSection} />
      <LayerSwitcher activeLayer={activeLayer} onSelect={setActiveLayer} />

      <InstrumentPicker label="Sound" value={active.instrument} onChange={active.onInstrumentChange} />

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-slate-400">Auto-fill {active.label}:</span>
        {ARPEGGIO_PATTERNS.map((pattern) => (
          <button
            key={pattern.id}
            type="button"
            onClick={() => applyGenerator(pattern.id)}
            disabled={section.chords.length === 0}
            className="rounded-md border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-500 hover:border-accent hover:text-accent disabled:opacity-40"
          >
            {pattern.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-slate-400">Rhythm:</span>
        {RHYTHM_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => setRhythm(template)}
            aria-pressed={rhythm.id === template.id}
            className={`rounded-md border px-2.5 py-1 text-xs ${
              rhythm.id === template.id
                ? 'border-accent bg-accent text-white'
                : 'border-dashed border-slate-300 text-slate-500 hover:border-accent hover:text-accent'
            }`}
          >
            {template.label}
          </button>
        ))}
      </div>

      <PianoRoll
        musicKey={project.key}
        chords={section.chords}
        notes={active.notes}
        totalSteps={totalSteps}
        onChange={active.onChange}
        onPreviewNote={(pitch) => onPreviewNote(pitch, active.instrument)}
        currentStep={currentStep}
        scaleLock={scaleLock}
        onToggleScaleLock={() => setScaleLock((v) => !v)}
      />
    </div>
  )
}
