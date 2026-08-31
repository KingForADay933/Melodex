import { useAudioEngine } from './audio/useAudioEngine'
import { ChordTrack } from './components/ChordTrack'
import { KeyScalePicker } from './components/KeyScalePicker'
import { PianoRoll } from './components/PianoRoll'
import { ProgressionPicker } from './components/ProgressionPicker'
import { ProjectSwitcher } from './components/ProjectSwitcher'
import { TransportControls } from './components/TransportControls'
import { GuidanceTip } from './components/ui/GuidanceTip'
import { GuidanceToggleButton } from './components/ui/GuidanceToggleButton'
import { STEPS_PER_BAR } from './constants'
import { downloadProjectMidi } from './export/midiExport'
import { useProjectManager } from './storage/useProjectManager'

const DISCORD_INVITE_URL = 'https://discord.gg/C5mWRfJZh'

function App() {
  const {
    projects,
    activeProject: project,
    updateActiveProject,
    createNewProject,
    switchToProject,
    renameActiveProject,
    removeProject,
  } = useProjectManager()
  const { play, stop, isPlaying, currentStep } = useAudioEngine()

  const totalSteps = Math.max(project.chords.length, 1) * STEPS_PER_BAR
  const activeChordIndex = currentStep !== null ? Math.floor(currentStep / STEPS_PER_BAR) : null

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Melodex</h1>
          <p className="text-sm text-slate-500">
            Pick a key, tap a progression, sketch a melody, then hit play or export it as MIDI.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ProjectSwitcher
            projects={projects}
            activeProject={project}
            onSwitch={switchToProject}
            onNew={createNewProject}
            onRename={renameActiveProject}
            onDelete={removeProject}
          />
          <GuidanceToggleButton />
        </div>
      </header>

      <div className="space-y-8">
        <div className="space-y-3">
          <GuidanceTip>
            Your key sets which notes and chords sound &ldquo;in tune&rdquo; together. Major keys
            tend to sound bright; minor keys sound moodier.
          </GuidanceTip>
          <KeyScalePicker value={project.key} onChange={(key) => updateActiveProject((p) => ({ ...p, key }))} />
        </div>

        <div className="space-y-3">
          <GuidanceTip>
            These are common chord sequences used across countless songs — a great starting
            point. Tap one to load it, then customize the chord track below.
          </GuidanceTip>
          <ProgressionPicker
            musicKey={project.key}
            onApply={(chords) => updateActiveProject((p) => ({ ...p, chords }))}
          />
        </div>

        <div className="space-y-3">
          <GuidanceTip>
            This is your song&rsquo;s chord sequence. Use the arrows to reorder, or tap a roman
            numeral below to add another chord from your key.
          </GuidanceTip>
          <ChordTrack
            musicKey={project.key}
            chords={project.chords}
            onChange={(chords) => updateActiveProject((p) => ({ ...p, chords }))}
            activeIndex={isPlaying ? activeChordIndex : null}
          />
        </div>

        <div className="space-y-3">
          <GuidanceTip>
            Filled squares are in your key — they&rsquo;ll always sound &ldquo;right.&rdquo; Grey
            diamonds are outside it — use them sparingly for tension.
          </GuidanceTip>
          <PianoRoll
            musicKey={project.key}
            chords={project.chords}
            notes={project.melody}
            totalSteps={totalSteps}
            onChange={(melody) => updateActiveProject((p) => ({ ...p, melody }))}
            currentStep={isPlaying ? currentStep : null}
          />
        </div>

        <div className="space-y-3">
          <GuidanceTip>
            Hit play to hear your chords and melody together. Happy with it? Export a MIDI file
            to open in any DAW and keep producing.
          </GuidanceTip>
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

      <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
          Got feedback? Join the Discord ↗
        </a>
      </footer>
    </div>
  )
}

export default App
