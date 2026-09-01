import { useState } from 'react'
import type { InstrumentId } from '../audio/instruments'
import { InstrumentPicker } from '../components/InstrumentPicker'
import { PianoRoll } from '../components/PianoRoll'
import { ScreenHeader } from '../components/ScreenHeader'
import { GuidanceTip } from '../components/ui/GuidanceTip'
import { ARPEGGIO_PATTERNS, generateArpeggio, RHYTHM_TEMPLATES } from '../melody/arpeggiator'
import type { ArpeggioPattern, RhythmTemplate } from '../melody/arpeggiator'
import type { HistoryControls } from '../navigation/types'
import type { MelodyNote, Project } from '../types/project'
import { formatScreenSubtitle } from '../utils/formatProject'

interface MelodyScreenProps extends HistoryControls {
  project: Project
  totalSteps: number
  onMelodyChange: (notes: MelodyNote[]) => void
  onInstrumentChange: (instrument: InstrumentId) => void
  onPreviewNote: (pitch: number) => void
  currentStep: number | null
}

export function MelodyScreen({
  project,
  totalSteps,
  onMelodyChange,
  onInstrumentChange,
  onPreviewNote,
  currentStep,
  ...history
}: MelodyScreenProps) {
  const [scaleLock, setScaleLock] = useState(false)
  const [rhythm, setRhythm] = useState<RhythmTemplate>(RHYTHM_TEMPLATES[0])

  function applyArpeggio(pattern: ArpeggioPattern) {
    if (project.chords.length === 0) return
    if (project.melody.length > 0 && !window.confirm('Replace the current melody with a generated arpeggio?')) {
      return
    }
    onMelodyChange(generateArpeggio(project, pattern, rhythm))
  }

  return (
    <div className="space-y-5">
      <ScreenHeader title="Melody" subtitle={formatScreenSubtitle(project)} {...history} />
      <GuidanceTip>
        Filled squares are in your key — they&rsquo;ll always sound &ldquo;right.&rdquo; Grey
        diamonds are outside it — use them sparingly for tension.
      </GuidanceTip>

      <InstrumentPicker label="Sound" value={project.melodyInstrument} onChange={onInstrumentChange} />

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-slate-400">Auto-fill melody:</span>
        {ARPEGGIO_PATTERNS.map((pattern) => (
          <button
            key={pattern.id}
            type="button"
            onClick={() => applyArpeggio(pattern.id)}
            disabled={project.chords.length === 0}
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
        chords={project.chords}
        notes={project.melody}
        totalSteps={totalSteps}
        onChange={onMelodyChange}
        onPreviewNote={onPreviewNote}
        currentStep={currentStep}
        scaleLock={scaleLock}
        onToggleScaleLock={() => setScaleLock((v) => !v)}
      />
    </div>
  )
}
