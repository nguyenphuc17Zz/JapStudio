import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { PageHeader } from '../components/layout/PageHeader'
import { PageContainer } from '../components/layout/PageContainer'
import { MissionCategoryPicker } from '../components/realworld/mission/MissionCategoryPicker'
import { MissionPromptModeSelector } from '../components/realworld/mission/MissionPromptModeSelector'
import { MissionBriefingCard } from '../components/realworld/mission/MissionBriefingCard'
import { MissionWritingDesk } from '../components/realworld/mission/MissionWritingDesk'
import { MissionEvaluationDashboard } from '../components/realworld/mission/MissionEvaluationDashboard'
import { ScenarioParametersCard } from '../components/realworld/scenario/ScenarioParametersCard'
import { RecentMissionsCard } from '../components/realworld/scenario/RecentMissionsCard'
import { DEFAULT_TAXONOMY } from '../components/realworld/scenario/scenarioConstants'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useAIProvider } from '../context/AIProviderContext'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'
import type {
  JlptLevel,
  MissionCategory,
  MissionEvaluationResponse,
  MissionTaxonomyResponse,
  PromptMode,
  RealWorldMission,
  Register,
} from '../types/api'

export default function ScenarioPage() {
  const { selectedProvider, selectedModel, setProvider, setModel } = useAIProvider()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Taxonomy & Setup state
  const [taxonomy, setTaxonomy] = useState<MissionTaxonomyResponse>(DEFAULT_TAXONOMY)
  const [category, setCategory] = useState<MissionCategory>('work')
  const [actionType, setActionType] = useState<string>('progress_update')
  const [promptMode, setPromptMode] = useState<PromptMode>('vietnamese_scenario')
  const [register, setRegister] = useState<Register | ''>('')
  const [jlptLevel, setJlptLevel] = useState<JlptLevel | ''>('N3')
  const [difficulty, setDifficulty] = useState('6')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Mission Lifecycle State
  const [mission, setMission] = useState<RealWorldMission | null>(null)
  const [learnerText, setLearnerText] = useState<string>('')
  const [evaluation, setEvaluation] = useState<MissionEvaluationResponse | null>(null)
  const [showVocab, setShowVocab] = useState(false)

  // Loading & Error states
  const [generating, setGenerating] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const history = useAsync(() => api.listRecentScenarios({ limit: 10 }), [])

  // Load Taxonomy on mount
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const tax = await api.getMissionTaxonomy()
        if (!cancelled && tax && Array.isArray(tax.actions)) {
          setTaxonomy(tax)
          const workActions = tax.actions.filter((a) => a.category === 'work')
          if (workActions.length > 0) {
            setActionType(workActions[0].action_type)
          }
        }
      } catch (err) {
        if (!cancelled) {
          // Keep DEFAULT_TAXONOMY silently so user can still see UI if offline
          console.warn('Could not fetch dynamic taxonomy, using default taxonomy:', err)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-switch action when category changes
  const handleCategoryChange = (newCat: MissionCategory) => {
    setCategory(newCat)
    if (taxonomy) {
      const catActions = taxonomy.actions.filter((a) => a.category === newCat)
      if (catActions.length > 0) {
        setActionType(catActions[0].action_type)
      }
    }
  }

  // Load scenario from URL param if present
  useEffect(() => {
    const scenarioId = searchParams.get('scenario')
    if (!scenarioId) return
    let cancelled = false
    setLoadingId(scenarioId)
    void (async () => {
      try {
        const loaded = await api.getScenario(scenarioId)
        if (!cancelled && loaded) {
          const genMeta = loaded.generation_metadata || {}
          setMission({
            id: loaded.id,
            category: (genMeta.mission_category as MissionCategory) || 'work',
            action_type: (genMeta.mission_action_type as string) || loaded.purpose || 'writing_task',
            prompt_mode: (genMeta.prompt_mode as PromptMode) || 'vietnamese_scenario',
            role: (genMeta.role as string) || 'Người viết',
            recipient: (genMeta.recipient as string) || loaded.audience || 'Người nhận',
            relationship: loaded.relationship || 'Đồng nghiệp',
            objective: loaded.purpose || loaded.situation_vi,
            situation_vi: loaded.situation_vi,
            context_vi: loaded.context_vi,
            situation_ja: (genMeta.situation_ja as string) || null,
            context_ja: (genMeta.context_ja as string) || null,
            incoming_message: (genMeta.incoming_message as string) || null,
            constraints: (genMeta.constraints as string[]) || loaded.forbidden_patterns || [],
            required_points: (loaded.required_points || []).map((rp, i) =>
              typeof rp === 'string' ? { id: `pt_${i}`, description: rp } : rp,
            ),
            target_register: (loaded.register as Register) || 'polite',
            optional_vocabulary: (genMeta.optional_vocabulary as any) || [],
            success_conditions: (genMeta.success_conditions as any) || [],
            difficulty: loaded.difficulty,
            jlpt_level: (genMeta.jlpt_level as JlptLevel) || 'N3',
            pedagogical_target_summary: (genMeta.pedagogical_target_summary as string) || null,
            created_at: loaded.created_at,
          })
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Không thể tải tình huống')
        }
      } finally {
        if (!cancelled) setLoadingId(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams])

  // Generate Mission Handler
  const handleGenerateMission = async () => {
    setGenerating(true)
    setError(null)
    setEvaluation(null)
    try {
      const created = await api.generateRealWorldMission({
        category,
        action_type: actionType,
        prompt_mode: promptMode,
        register: register || undefined,
        jlpt_level: jlptLevel || undefined,
        difficulty: difficulty ? Number(difficulty) : undefined,
        provider: selectedProvider,
        model: selectedModel,
      })
      setMission(created)
      setLearnerText('')
      void history.run()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo nhiệm vụ lúc này.')
    } finally {
      setGenerating(false)
    }
  }

  // Random Action Picker in UI
  const handleRandomSelect = () => {
    if (!taxonomy || !taxonomy.actions.length) return
    const matching = jlptLevel
      ? taxonomy.actions.filter((a) => a.recommended_jlpt.includes(jlptLevel as string))
      : []
    const pool = matching.length > 0 ? matching : taxonomy.actions
    const picked = pool[Math.floor(Math.random() * pool.length)]
    setCategory(picked.category)
    setActionType(picked.action_type)
  }

  // 1-Click AI Surprise / Smart Curated Mission
  const handleSurpriseMission = async () => {
    setGenerating(true)
    setError(null)
    setEvaluation(null)
    try {
      const created = await api.generateRealWorldMission({
        category: 'random',
        action_type: 'random',
        prompt_mode: 'random',
        jlpt_level: jlptLevel || undefined,
        register: register || undefined,
        difficulty: difficulty ? Number(difficulty) : undefined,
        provider: selectedProvider,
        model: selectedModel,
      })
      setMission(created)
      setLearnerText('')
      void history.run()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo nhiệm vụ ngẫu nhiên lúc này.')
    } finally {
      setGenerating(false)
    }
  }

  // Submit & 10-Dimension Evaluation Handler
  const handleSubmitEvaluation = async (text: string, provider?: string, model?: string) => {
    if (!mission) return
    setEvaluating(true)
    setError(null)
    setLearnerText(text)
    try {
      const evalResult = await api.evaluateRealWorldMission({
        scenario_id: mission.id,
        text,
        provider: provider || selectedProvider,
        model: model || selectedModel,
      })
      setEvaluation(evalResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đánh giá bài viết lúc này.')
    } finally {
      setEvaluating(false)
    }
  }

  // Transition to Interactive Simulation
  const handleTransitionToSimulation = async () => {
    if (!mission) return
    setTransitioning(true)
    setError(null)
    try {
      const simResp = await api.transitionMissionToSimulation(
        mission.id,
        learnerText || 'こんにちは。',
        { provider: selectedProvider, model: selectedModel },
      )
      navigate(`/simulation?session=${simResp.session_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể chuyển sang mô phỏng lúc này.')
      setTransitioning(false)
    }
  }

  // Transition to Rewrite Lab
  const handleTransitionToRewriteLab = () => {
    if (!learnerText) return
    navigate(
      `/rewrite-lab?text=${encodeURIComponent(learnerText)}&context=${encodeURIComponent(
        mission?.objective || '',
      )}`,
    )
  }

  // Reset / Retry
  const handleRetryWriting = () => {
    setEvaluation(null)
  }

  const handleNewMission = () => {
    setMission(null)
    setEvaluation(null)
    setLearnerText('')
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Nhiệm vụ Viết Thực tế (Real-World Writing Missions)"
        description="Luyện viết tiếng Nhật ứng dụng trực tiếp vào công việc, đời sống, dịch vụ và xã hội Nhật Bản với đánh giá 10 chiều chuyên sâu."
        actions={
          !mission && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleSurpriseMission()}
              loading={generating}
              icon="sparkles"
            >
              🎲 Thử thách Bất ngờ
            </Button>
          )
        }
      />

      {error && (
        <Alert tone="error" title="Đã xảy ra lỗi" className="jw-mb-lg">
          {error}
        </Alert>
      )}

      {generating || loadingId ? (
        <LoadingSpinner label="AI đang thiết kế nhiệm vụ giao tiếp thực tế..." />
      ) : evaluation && mission ? (
        /* Evaluation Dashboard View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button variant="ghost" size="sm" onClick={handleNewMission}>
              ← Chọn nhiệm vụ khác
            </Button>
            <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-muted)' }}>
              Nhiệm vụ: <strong>{mission.objective}</strong>
            </span>
          </div>

          <MissionEvaluationDashboard
            evaluation={evaluation}
            learnerText={learnerText}
            onTransitionToSimulation={handleTransitionToSimulation}
            onTransitionToRewriteLab={handleTransitionToRewriteLab}
            onRetry={handleRetryWriting}
            isTransitioning={transitioning}
          />
        </div>
      ) : mission ? (
        /* Mission Briefing & Writing Workspace View — Dual-Column Studio */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', height: '100%', minHeight: 0 }}>
          <div className="jw-studio-subbar">
            <Button variant="ghost" size="sm" onClick={handleNewMission}>
              ← Đổi nhiệm vụ khác
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void handleGenerateMission()}>
              Tạo biến thể mới
            </Button>
          </div>

          <div className="jw-studio-layout jw-studio-layout--editor-focus" style={{ minHeight: 0, flex: 1 }}>
            {/* Left Briefing Pane */}
            <div className="jw-studio-pane">
              <div className="jw-studio-pane-header">
                <span className="jw-studio-pane-title">Bối cảnh & Nhiệm vụ</span>
                <Badge tone="accent">{mission.category || 'Tình huống'}</Badge>
              </div>
              <div className="jw-studio-pane-content">
                <MissionBriefingCard
                  mission={mission}
                  showVocab={showVocab}
                  onToggleVocab={() => setShowVocab(!showVocab)}
                />
              </div>
            </div>

            {/* Right Writing Desk Pane */}
            <div className="jw-studio-pane">
              <div className="jw-studio-pane-header">
                <span className="jw-studio-pane-title">Soạn thảo phản hồi</span>
              </div>
              <div className="jw-studio-pane-content">
                <MissionWritingDesk
                  initialText={learnerText}
                  onSubmit={handleSubmitEvaluation}
                  isSubmitting={evaluating}
                  selectedProvider={selectedProvider}
                  selectedModel={selectedModel}
                  onProviderChange={setProvider}
                  onModelChange={setModel}
                  prompt_vi={mission.objective || mission.situation_vi}
                  context_vi={mission.context_vi || mission.situation_vi}
                  jlpt_level={mission.jlpt_level}
                  register={mission.target_register}
                  genre={mission.category}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Mission Taxonomy Studio & Setup View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Step 1: Category & Action Picker */}
          {taxonomy && (
            <MissionCategoryPicker
              categories={taxonomy.categories}
              actions={taxonomy.actions}
              selectedCategory={category}
              selectedAction={actionType}
              onSelectCategory={handleCategoryChange}
              onSelectAction={setActionType}
              onRandomSelect={handleRandomSelect}
              disabled={generating}
            />
          )}

          {/* Step 2: Prompt Mode Selector */}
          {taxonomy && (
            <MissionPromptModeSelector
              promptModes={taxonomy.prompt_modes}
              selectedMode={promptMode}
              onSelectMode={setPromptMode}
              disabled={generating}
            />
          )}

          {/* Step 3: Parameters & Fast Launch */}
          <ScenarioParametersCard
            jlptLevel={jlptLevel}
            onJlptChange={setJlptLevel}
            register={register}
            onRegisterChange={setRegister}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            showAdvanced={showAdvanced}
            onToggleAdvanced={() => setShowAdvanced((v) => !v)}
            selectedProvider={selectedProvider}
            selectedModel={selectedModel}
            onProviderChange={(p) => void setProvider(p)}
            onModelChange={setModel}
            generating={generating}
            onGenerate={() => void handleGenerateMission()}
          />

          {/* Recent Mission History */}
          <RecentMissionsCard
            items={history.data?.items ?? []}
            loadingId={loadingId}
            onSelectScenario={(scenarioId) => {
              const params = new URLSearchParams()
              params.set('scenario', scenarioId)
              navigate(`/scenarios?${params.toString()}`)
            }}
          />
        </div>
      )}
    </PageContainer>
  )
}