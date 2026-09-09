import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { PageHeader } from '../components/layout/PageHeader'
import { PageContainer } from '../components/layout/PageContainer'
import { SimulationCoachPanel } from '../components/realworld/simulation/SimulationCoachPanel'
import { SimulationComposer } from '../components/realworld/simulation/SimulationComposer'
import { SimulationGoal } from '../components/realworld/simulation/SimulationGoal'
import { SimulationHeader } from '../components/realworld/simulation/SimulationHeader'
import { SimulationHistory } from '../components/realworld/simulation/SimulationHistory'
import { SimulationSetup } from '../components/realworld/simulation/SimulationSetup'
import { SimulationSummary } from '../components/realworld/simulation/SimulationSummary'
import { SimulationThread } from '../components/realworld/simulation/SimulationThread'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { useAsync } from '../hooks/useAsync'
import { useMediaQuery } from '../lib/useMediaQuery'
import { useSimulationSession } from '../hooks/useSimulationSession'
import { AIModelPicker } from '../components/ai/AIModelPicker'
import { useAIProvider } from '../context/AIProviderContext'
import { api } from '../services/api'
import type { SimulationMode, WritingScenario } from '../types/api'

export default function SimulationPage() {
  const { selectedProvider, selectedModel } = useAIProvider()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const sim = useSimulationSession()

  const [scenario, setScenario] = useState<WritingScenario | null>(null)
  const [scenarioLoading, setScenarioLoading] = useState(false)
  const [mode, setMode] = useState<SimulationMode>('guided')

  const history = useAsync(() => api.listSimulations({ limit: 10 }), [])
  const recentScenarios = useAsync(() => api.listRecentScenarios({ limit: 10 }), [])

  const { openSession } = sim

  useEffect(() => {
    const sessionId = searchParams.get('session')
    if (sessionId) {
      void openSession(sessionId)
      return
    }

    const scenarioId = searchParams.get('scenario')
    if (!scenarioId) return
    let cancelled = false
    setScenarioLoading(true)
    void (async () => {
      try {
        const loaded = await api.getScenario(scenarioId)
        if (!cancelled) setScenario(loaded)
      } catch {
        if (!cancelled) setScenario(null)
      } finally {
        if (!cancelled) setScenarioLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams, openSession])

  useEffect(() => {
    if (sim.session?.status === 'active') {
      void history.run()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.session?.id])

  const start = () => {
    if (!scenario) return
    void sim.createSession(scenario.id, mode, {
      provider: selectedProvider,
      model: selectedModel,
    })
  }

  const startWithScenario = (scenarioId: string) => {
    void sim.createSession(scenarioId, mode, {
      provider: selectedProvider,
      model: selectedModel,
    })
  }

  const generateScenario = async () => {
    try {
      const created = await api.generateScenario({
        provider: selectedProvider,
        model: selectedModel,
      })
      setScenario(created)
    } catch {
      setScenario(null)
    }
  }

  const renderBody = () => {
    if (sim.phase === 'starting' || (sim.phase === 'setup' && !sim.session)) {
      if (sim.phase === 'starting') {
        return <LoadingSpinner label="Đang bắt đầu mô phỏng..." />
      }
    }
    if (!sim.session) {
      return (
        <SimulationSetup
          scenario={scenario}
          scenarioLoading={scenarioLoading}
          mode={mode}
          onModeChange={setMode}
          starting={false}
          error={sim.error}
          onStart={start}
          onGenerateRandom={generateScenario}
        />
      )
    }
    if (sim.phase === 'completed' || sim.phase === 'summary') {
      return (
        <SimulationSummary
          summary={sim.summary ?? null}
          loading={sim.summaryLoading}
          onNew={() => sim.reset()}
          onSuggestedChallenge={(challengeId) =>
            navigate(`/challenge?challenge=${challengeId}`)
          }
        />
      )
    }
    return (
      <div className="jw-sim-conversation">
        <SimulationHeader
          persona={sim.persona}
          objective={sim.session.objective_vi}
          stage={sim.session.state.current_stage}
          turn={sim.session.current_turn}
          maxTurns={sim.session.max_turns}
          goalProgress={sim.goalProgress}
          pressure={sim.session.pressure_condition}
        />
        <div className="jw-sim-layout">
          {!isMobile ? (
            <SimulationGoal
              objective={sim.session.objective_vi}
              completedItems={sim.session.state.completed_items}
              unresolvedItems={sim.session.state.unresolved_items}
              nextGoal={sim.session.state.next_goal}
              progress={sim.goalProgress}
            />
          ) : null}
          <div className="jw-sim-main">
            <SimulationThread
              session={sim.session}
              persona={sim.persona}
              guided={sim.session.mode === 'guided'}
              explaining={sim.explaining}
              explanations={sim.explanations}
              onExplain={(turnId) => sim.explain(turnId)}
            />
            {sim.session.status === 'active' ? (
              <>
                <SimulationComposer
                  draft={sim.draft}
                  onDraftChange={sim.setDraft}
                  sending={sim.phase === 'submitting_turn'}
                  draftSaved={sim.draftSaved}
                  prompt_vi={sim.session.objective_vi || sim.session.state?.objective || 'Hội thoại tiếng Nhật'}
                  context_vi={sim.session.state?.next_goal || sim.session.state?.emotional_context}
                  onSend={() =>
                    void sim.submitTurn(sim.draft, false, {
                      provider: selectedProvider,
                      model: selectedModel,
                    })
                  }
                  onEndEarly={() =>
                    void sim.submitTurn(sim.draft, true, {
                      provider: selectedProvider,
                      model: selectedModel,
                    })
                  }
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="sparkles"
                    onClick={() => sim.setCoachOpen(!sim.coachOpen)}
                    aria-expanded={sim.coachOpen}
                  >
                    {sim.coachOpen ? 'Đóng AI Coach' : 'Hỏi AI Coach'}
                  </Button>
                  <AIModelPicker variant="compact" />
                </div>
                {sim.coachOpen ? (
                  <SimulationCoachPanel
                    answer={sim.coachAnswer}
                    loading={sim.coachLoading}
                    error={sim.coachError}
                    onAsk={(question) =>
                      sim.askCoach(question, {
                        provider: selectedProvider,
                        model: selectedModel,
                      })
                    }
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        {sim.error ? (
          <div className="jw-sim-error">
            <Alert tone="error" title="Không thể tiếp tục mô phỏng. Nội dung trước đó vẫn được giữ lại.">
              {sim.error}
            </Alert>
          </div>
        ) : null}
      </div>
    )
  }

  const showSetup = !sim.session

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Mô phỏng giao tiếp"
        description="Trò chuyện nhiều lượt với AI trong các tình huống thực tế và nhận phản hồi từng lượt."
      />

      <div className="jw-sim-page">
        <div className="jw-sim-main-col">{renderBody()}</div>
        {isMobile ? (
          <div className="jw-sim-mobile-panels">
            {!showSetup ? (
              <SimulationHistory
                items={history.data?.items ?? []}
                loading={history.loading}
                currentId={sim.session?.id ?? null}
                onOpen={(sessionId) => void sim.openSession(sessionId)}
                onNavigatePractice={() => navigate('/practice')}
              />
            ) : null}
            {scenario ? null : (
              <div className="jw-sim-pick">
                <h3>Chọn tình huống</h3>
                {recentScenarios.loading ? (
                  <LoadingSpinner label="Đang tải..." />
                ) : recentScenarios.data?.items.length ? (
                  <ul className="jw-sim-pick-list">
                    {recentScenarios.data.items.map((item) => (
                      <li key={item.scenario_id}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startWithScenario(item.scenario_id)}
                        >
                          {item.genre} · {item.purpose}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <Button variant="secondary" size="sm" icon="sparkles" onClick={() => void generateScenario()}>
                  Tạo tình huống mới
                </Button>
              </div>
            )}
          </div>
        ) : (
          <SimulationHistory
            items={history.data?.items ?? []}
            loading={history.loading}
            currentId={sim.session?.id ?? null}
            onOpen={(sessionId) => void sim.openSession(sessionId)}
            onNavigatePractice={() => navigate('/practice')}
          />
        )}
      </div>
    </PageContainer>
  )
}