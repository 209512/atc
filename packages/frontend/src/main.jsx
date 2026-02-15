import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ATCProvider } from './contexts/ATCProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ATCProvider>
      <App />
    </ATCProvider>
  </StrictMode>,
)
