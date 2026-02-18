// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App'
import { ATCProvider } from '@/contexts/ATCProvider'
import { UIProvider } from '@/contexts/UIProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UIProvider>
      <ATCProvider>
        <App />
      </ATCProvider>
    </UIProvider>
  </StrictMode>,
)