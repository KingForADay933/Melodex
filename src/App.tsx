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
import { SectionsScreen } from './screens/SectionsScreen'
import { useProjectManager } from './storage/useProjectManager'
import type { Project } from './types/project'
import { getActiveSection, getProjectTotalSteps, getSectionBarOffset, getSectionDisplaySteps } from './utils/sections'
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
    importProject,
    switchToProject,
    renameProject,
    duplicateProject,
    removeProject,
  } = useProjectManager()
  const { play, stop, previewNote, isPlaying, currentStep } = useAudioEngine()

  // Which section Chords/Melody are currently editing — view state, not
  // routed through updateActiveProject, so (like activeScreen) it stays
  // outside undo history. Resets to the first section whenever the active
  // project itself changes (adjusted during render, React's recommended
  // way to reset state on a prop change, rather than an effect — an effect
  // here would need `project.sections` in its deps to satisfy
  // exhaustive-deps, which would reset the selection on every edit, not
  // just on switching projects).
  const [activeSectionId, setActiveSectionId] = useState(project.sections[0].id)
  const [lastSeenProjectId, setLastSeenProjectId] = useState(project.id)
  if (project.id !== lastSeenProjectId) {
    setLastSeenProjectId(project.id)
    setActiveSectionId(project.sections[0].id)
  }

  const activeSection = getActiveSection(project, activeSectionId)
  const sectionDisplaySteps = getSectionDisplaySteps(activeSection)
  const songTotalSteps = getProjectTotalSteps(project.sections)
  const sectionBarOffset = getSectionBarOffset(project.sections, activeSection.id)
  const sectionStepOffset = sectionBarOffset * STEPS_PER_BAR

  // currentStep from useAudioEngine is song-wide (playback flattens every
  // section into one continuous timeline). Translate it back to "relative
  // to the section currently on screen" for the two live-position UI bits
  // that are section-scoped — null (no highlight) when playback's position
  // is in a different section than the one being viewed, rather than a
  // wrong/out-of-range highlight.
  const songActiveBarIndex = currentStep !== null ? Math.floor(currentStep / STEPS_PER_BAR) : null
  const activeChordIndex = (() => {
    if (songActiveBarIndex === null) return null
    const relative = songActiveBarIndex - sectionBarOffset
    return relative >= 0 && relative < activeSection.chords.length ? relative : null
  })()
  const sectionRelativeCurrentStep = (() => {
    if (currentStep === null) return null
    const relative = currentStep - sectionStepOffset
    return relative >= 0 && relative < sectionDisplaySteps ? relative : null
  })()

  const progress = currentStep !== null ? Math.min(1, currentStep / Math.max(songTotalSteps, 1)) : 0
  const hasContent = project.sections.some(
    (s) => s.chords.length > 0 || s.melody.length > 0 || s.bassline.length > 0 || s.harmonyMelody.length > 0,
  )
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

  function handleImportMidi(imported: Project) {
    importProject(imported)
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
            onImportMidi={handleImportMidi}
            onDelete={removeProject}
            onRename={renameProject}
            onDuplicate={duplicateProject}
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

        {activeScreen === 'sections' && (
          <SectionsScreen
            key={project.id}
            project={project}
            activeSectionId={activeSectionId}
            onSelectSection={setActiveSectionId}
            onSectionsChange={(sections) => updateActiveProject((p) => ({ ...p, sections }))}
            {...history}
          />
        )}

        {activeScreen === 'chords' && (
          <ChordsScreen
            key={project.id}
            project={project}
            section={activeSection}
            sections={project.sections}
            activeSectionId={activeSectionId}
            onSelectSection={setActiveSectionId}
            onChordsChange={(chords) =>
              updateActiveProject((p) => ({
                ...p,
                sections: p.sections.map((s) => (s.id === activeSectionId ? { ...s, chords } : s)),
              }))
            }
            onInstrumentChange={(chordInstrument) => updateActiveProject((p) => ({ ...p, chordInstrument }))}
            activeIndex={isPlaying ? activeChordIndex : null}
            {...history}
          />
        )}

        {activeScreen === 'melody' && (
          <MelodyScreen
            key={project.id}
            project={project}
            section={activeSection}
            sections={project.sections}
            activeSectionId={activeSectionId}
            onSelectSection={setActiveSectionId}
            totalSteps={sectionDisplaySteps}
            onMelodyChange={(melody) =>
              updateActiveProject((p) => ({
                ...p,
                sections: p.sections.map((s) => (s.id === activeSectionId ? { ...s, melody } : s)),
              }))
            }
            onBasslineChange={(bassline) =>
              updateActiveProject((p) => ({
                ...p,
                sections: p.sections.map((s) => (s.id === activeSectionId ? { ...s, bassline } : s)),
              }))
            }
            onHarmonyMelodyChange={(harmonyMelody) =>
              updateActiveProject((p) => ({
                ...p,
                sections: p.sections.map((s) => (s.id === activeSectionId ? { ...s, harmonyMelody } : s)),
              }))
            }
            onInstrumentChange={(melodyInstrument) => updateActiveProject((p) => ({ ...p, melodyInstrument }))}
            onBassInstrumentChange={(bassInstrument) => updateActiveProject((p) => ({ ...p, bassInstrument }))}
            onHarmonyInstrumentChange={(harmonyInstrument) => updateActiveProject((p) => ({ ...p, harmonyInstrument }))}
            onPreviewNote={(pitch, instrumentId) => previewNote(pitch, instrumentId)}
            currentStep={isPlaying ? sectionRelativeCurrentStep : null}
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
