import { useEffect, useState } from 'react'
import { useAudioEngine } from './audio/useAudioEngine'
import { BottomTabBar } from './components/BottomTabBar'
import { MiniTransportBar } from './components/MiniTransportBar'
import { STEPS_PER_BAR } from './constants'
import type { Screen } from './navigation/types'
import { hasSeenOnboarding, markOnboardingSeen } from './onboarding/onboardingStorage'
import { ChordsScreen } from './screens/ChordsScreen'
import { ExportScreen } from './screens/ExportScreen'
import { HomeScreen } from './screens/HomeScreen'
import { KeyScreen } from './screens/KeyScreen'
import { MelodyScreen } from './screens/MelodyScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { useProjectManager } from './storage/useProjectManager'
import { transposeProject } from './utils/transpose'

function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('home')
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding())
  const {
    projects,
    activeProject: project,
    updateActiveProject,
    canUndo,
    canRedo,
    undo,
    redo,
    createNewProject,
    switchToProject,
    renameProject,
    removeProject,
  } = useProjectManager()
  const { play, stop, previewNote, isPlaying, currentStep } = useAudioEngine()

  const totalSteps = Math.max(project.chords.length, 1) * STEPS_PER_BAR
  const activeChordIndex = currentStep !== null ? Math.floor(currentStep / STEPS_PER_BAR) : null
  const progress = currentStep !== null ? Math.min(1, currentStep / totalSteps) : 0
  const hasContent = project.chords.length > 0 || project.melody.length > 0
  const showMiniTransport = activeScreen === 'chords' || activeScreen === 'melody'
  const history = { canUndo, canRedo, onUndo: undo, onRedo: redo }

  function openProject(id: string) {
    switchToProject(id)
    setActiveScreen('chords')
  }

  function startNewProject() {
    createNewProject()
    setActiveScreen('key')
  }

  function finishOnboarding() {
    markOnboardingSeen()
    setShowOnboarding(false)
  }

  // Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (or +Y) for undo/redo, skipped while
  // typing so it doesn't fight a text field's own undo (e.g. renaming).
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      if (isTyping || !(event.ctrlKey || event.metaKey)) return

      const key = event.key.toLowerCase()
      if (key === 'z' && event.shiftKey) {
        event.preventDefault()
        redo()
      } else if (key === 'z') {
        event.preventDefault()
        undo()
      } else if (key === 'y') {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  if (showOnboarding) {
    return <OnboardingScreen onFinish={finishOnboarding} />
  }

  return (
    <div className="min-h-svh bg-surface">
      <div className={`mx-auto max-w-3xl px-4 pt-6 sm:pt-10 ${showMiniTransport ? 'pb-40' : 'pb-24'}`}>
        {activeScreen === 'home' && (
          <HomeScreen
            projects={projects}
            onOpen={openProject}
            onNew={startNewProject}
            onDelete={removeProject}
            onRename={renameProject}
            onReplayOnboarding={() => setShowOnboarding(true)}
          />
        )}

        {activeScreen === 'key' && (
          <KeyScreen
            key={project.id}
            project={project}
            onChange={(key) => updateActiveProject((p) => ({ ...p, key }))}
            onTranspose={(newKey) => updateActiveProject((p) => transposeProject(p, newKey))}
            onContinue={() => setActiveScreen('chords')}
            {...history}
          />
        )}

        {activeScreen === 'chords' && (
          <ChordsScreen
            key={project.id}
            project={project}
            onChordsChange={(chords) => updateActiveProject((p) => ({ ...p, chords }))}
            onInstrumentChange={(chordInstrument) => updateActiveProject((p) => ({ ...p, chordInstrument }))}
            activeIndex={isPlaying ? activeChordIndex : null}
            {...history}
          />
        )}

        {activeScreen === 'melody' && (
          <MelodyScreen
            key={project.id}
            project={project}
            totalSteps={totalSteps}
            onMelodyChange={(melody) => updateActiveProject((p) => ({ ...p, melody }))}
            onInstrumentChange={(melodyInstrument) => updateActiveProject((p) => ({ ...p, melodyInstrument }))}
            onPreviewNote={(pitch) => previewNote(pitch, project.melodyInstrument)}
            currentStep={isPlaying ? currentStep : null}
            {...history}
          />
        )}

        {activeScreen === 'export' && <ExportScreen key={project.id} project={project} />}
      </div>

      {showMiniTransport && (
        <MiniTransportBar
          isPlaying={isPlaying}
          progress={progress}
          disabled={!hasContent}
          tempo={project.tempo}
          onTempoChange={(tempo) => updateActiveProject((p) => ({ ...p, tempo }))}
          onPlay={() => play(project)}
          onStop={stop}
        />
      )}

      <BottomTabBar active={activeScreen} onNavigate={setActiveScreen} />
    </div>
  )
}

export default App
