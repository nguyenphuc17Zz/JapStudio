import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Agentation } from 'agentation'
import AppShell from './layouts/AppShell'
import DashboardPage from './pages/DashboardPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LoadingSpinner } from './components/LoadingSpinner'

import { SeasonProvider } from './context/SeasonContext'
import { FuriganaProvider } from './context/FuriganaContext'

const AiQualityPage = lazy(() => import('./pages/AiQualityPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const ChallengePage = lazy(() => import('./pages/ChallengePage'))
const FreeWritingPage = lazy(() => import('./pages/FreeWritingPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const JourneyPage = lazy(() => import('./pages/JourneyPage'))
const KanjiStudioPage = lazy(() => import('./pages/KanjiStudioPage'))
const MemoryPage = lazy(() => import('./pages/MemoryPage'))
const PracticePage = lazy(() => import('./pages/PracticePage'))
const RewriteLabPage = lazy(() => import('./pages/RewriteLabPage'))
const ScenarioPage = lazy(() => import('./pages/ScenarioPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const SimulationPage = lazy(() => import('./pages/SimulationPage'))
const VocabularyDetailPage = lazy(() => import('./pages/VocabularyDetailPage'))
const VocabularyPage = lazy(() => import('./pages/VocabularyPage'))
const WritingIntelligencePage = lazy(() => import('./pages/WritingIntelligencePage'))

const DesignSystemPage = import.meta.env.DEV
  ? lazy(() => import('./pages/DesignSystemPage'))
  : null

function RouteBoundary({ name, children }: { name: string; children: React.ReactNode }) {
  return <ErrorBoundary resetKey={name}>{children}</ErrorBoundary>
}

export default function App() {
  return (
    <SeasonProvider>
      <FuriganaProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="dashboard" element={<Navigate to="/" replace />} />
              <Route path="practice" element={<RouteBoundary name="practice"><PracticePage /></RouteBoundary>} />
              <Route path="rewrite-lab" element={<RouteBoundary name="rewrite-lab"><RewriteLabPage /></RouteBoundary>} />
              <Route path="kanji" element={<RouteBoundary name="kanji"><KanjiStudioPage /></RouteBoundary>} />
              <Route path="journey" element={<RouteBoundary name="journey"><JourneyPage /></RouteBoundary>} />
              <Route path="intelligence" element={<RouteBoundary name="intelligence"><WritingIntelligencePage /></RouteBoundary>} />
              <Route path="free-writing" element={<RouteBoundary name="free-writing"><FreeWritingPage /></RouteBoundary>} />
              <Route path="scenario" element={<RouteBoundary name="scenario"><ScenarioPage /></RouteBoundary>} />
              <Route path="challenge" element={<RouteBoundary name="challenge"><ChallengePage /></RouteBoundary>} />
              <Route path="simulation" element={<RouteBoundary name="simulation"><SimulationPage /></RouteBoundary>} />
              <Route path="vocabulary" element={<RouteBoundary name="vocabulary"><VocabularyPage /></RouteBoundary>} />
              <Route path="vocabulary/:id" element={<RouteBoundary name="vocabulary-detail"><VocabularyDetailPage /></RouteBoundary>} />
              <Route path="history" element={<RouteBoundary name="history"><HistoryPage /></RouteBoundary>} />
              <Route path="memory" element={<RouteBoundary name="memory"><MemoryPage /></RouteBoundary>} />
              <Route path="ai-quality" element={<RouteBoundary name="ai-quality"><AiQualityPage /></RouteBoundary>} />
              <Route path="analytics" element={<RouteBoundary name="analytics"><AnalyticsPage /></RouteBoundary>} />
              <Route path="settings" element={<RouteBoundary name="settings"><SettingsPage /></RouteBoundary>} />
              {DesignSystemPage ? (
                <Route
                  path="design-system"
                  element={
                    <RouteBoundary name="design-system">
                      <DesignSystemPage />
                    </RouteBoundary>
                  }
                />
              ) : null}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
        {import.meta.env.DEV && <Agentation endpoint="http://localhost:4747" />}
      </FuriganaProvider>
    </SeasonProvider>
  )
}