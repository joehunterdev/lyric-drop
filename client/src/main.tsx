import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Self-hosted UI font (Poppins): 400 body, 500 labels, 600 headings, 800 logo
import '@fontsource/poppins/latin-400.css'
import '@fontsource/poppins/latin-500.css'
import '@fontsource/poppins/latin-600.css'
import '@fontsource/poppins/latin-800.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline support: cache the app after the first visit (production only, so dev HMR isn't cached)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {
      // Offline support is optional - the app works the same without it
    })
  })
}
