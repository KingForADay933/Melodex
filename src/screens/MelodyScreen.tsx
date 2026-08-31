import { PianoRoll } from '../components/PianoRoll'
import { ScreenHeader } from '../components/ScreenHeader'
import { GuidanceTip } from '../components/ui/GuidanceTip'
import type { MelodyNote, Project } from '../types/project'
import { formatScreenSubtitle } from '../utils/formatProject'

interface MelodyScreenProps {
  project: Project
  totalSteps: number
  onMelodyChange: (notes: MelodyNote[]) => void
  currentStep: number | null
}

export function MelodyScreen({ project, totalSteps, onMelodyChange, currentStep }: MelodyScreenProps) {
  return (
    <div className="space-y-5">
      <ScreenHeader title="Melody" subtitle={formatScreenSubtitle(project)} />
      <GuidanceTip>
        Filled squares are in your key — they&rsquo;ll always sound &ldquo;right.&rdquo; Grey
        diamonds are outside it — use them sparingly for tension.
      </GuidanceTip>
      <PianoRoll
        musicKey={project.key}
        chords={project.chords}
        notes={project.melody}
        totalSteps={totalSteps}
        onChange={onMelodyChange}
        currentStep={currentStep}
      />
    </div>
  )
}
