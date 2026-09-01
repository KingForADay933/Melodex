import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AdvancedModeProvider } from './advancedMode/AdvancedModeContext.tsx'
import App from './App.tsx'
import { GuidanceProvider } from './guidance/GuidanceContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GuidanceProvider>
      <AdvancedModeProvider>
        <App />
      </AdvancedModeProvider>
    </GuidanceProvider>
  </StrictMode>,
)
