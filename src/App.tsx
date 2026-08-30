import { useState } from 'react'
import { useAudioEngine } from './audio/useAudioEngine'
import { ChordTrack } from './components/ChordTrack'
import { KeyScalePicker } from './components/KeyScalePicker'
import { PianoRoll } from './components/PianoRoll'
import { ProgressionPicker } from './components/ProgressionPicker'
import { TransportControls } from './components/TransportControls'
import { STEPS_PER_BAR } from './constants'
import { downloadProjectMidi } from './export/midiExport'
import type { Project } from './types/project'

const INITIAL_PROJECT: Project = {
  key: { tonic: 0, scale: 'major' }, // C major
  chords: [],
  melody: [],
}

function App() {
  const [project, setProject] = useState<Project>(INITIAL_PROJECT)
  const { play, stop, isPlaying, currentStep } = useAudioEngine()

  const totalSteps = Math.max(project.chords.length, 1) * STEPS_PER_BAR
  const activeChordIndex = currentStep !== null ? Math.floor(currentStep / STEPS_PER_BAR) : null

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900">Melodex</h1>
        <p className="text-sm text-slate-500">
          Pick a key, tap a progression, sketch a melody, then hit play or export it as MIDI.
        </p>
      </header>

      <div className="space-y-8">
        <KeyScalePicker value={project.key} onChange={(key) => setProject((p) => ({ ...p, key }))} />

        <ProgressionPicker
          musicKey={project.key}
          onApply={(chords) => setProject((p) => ({ ...p, chords }))}
        />

        <ChordTrack
          musicKey={project.key}
          chords={project.chords}
          onChange={(chords) => setProject((p) => ({ ...p, chords }))}
          activeIndex={isPlaying ? activeChordIndex : null}
        />

        <PianoRoll
          musicKey={project.key}
          chords={project.chords}
          notes={project.melody}
          totalSteps={totalSteps}
          onChange={(melody) => setProject((p) => ({ ...p, melody }))}
          currentStep={isPlaying ? currentStep : null}
        />

        <TransportControls
          project={project}
          isPlaying={isPlaying}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onPlay={() => play(project)}
          onStop={stop}
          onExport={() => downloadProjectMidi(project)}
        />
      </div>
    </div>
  )
}

export default App
