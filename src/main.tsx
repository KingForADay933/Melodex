import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GuidanceProvider } from './guidance/GuidanceContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GuidanceProvider>
      <App />
    </GuidanceProvider>
  </StrictMode>,
)
