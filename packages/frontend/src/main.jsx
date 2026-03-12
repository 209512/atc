// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App'
import { ATCProvider } from '@/contexts/ATCProvider'
import { UIProvider } from '@/contexts/UIProvider'

async function enableMocking() {
  if (import.meta.env.DEV || window.location.hostname.includes('vercel.app')) {
    const { worker } = await import('./mocks/browser')
    return worker.start({
      onUnhandledRequest: 'bypass',
    })
  }
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <UIProvider>
        <ATCProvider>
          <App />
        </ATCProvider>
      </UIProvider>
    </StrictMode>,
  )
})