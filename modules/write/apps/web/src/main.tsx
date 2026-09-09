import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeProvider } from './theme/ThemeProvider'
import { ToastProvider } from './components/ui/Toast'
import { AIProviderProvider } from './context/AIProviderContext'
import './styles/tokens.css'
import './styles/base.css'
import './styles/ui.css'
import './styles/ai.css'
import './styles/writing.css'
import './styles/writing-studio.css'
import './styles/realworld.css'
import './styles/layout.css'
import './styles/shell.css'
import './styles/dashboard.css'
import './styles/practice.css'
import './styles/vocabulary.css'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AIProviderProvider>
          <ToastProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ToastProvider>
        </AIProviderProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)