import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ExerciseView from '../components/ExerciseView'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { PageContainer } from '../components/layout/PageContainer'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import {
  getStoredPracticeConfig,
  type PracticeDefaultSettings,
} from '../components/practice/practiceConfig'
import { PageHeader } from '../components/layout/PageHeader'
import { PracticeHistoryArchive } from '../components/practice/PracticeHistoryArchive'
import { PracticeModeSelector, type PracticeMode } from '../components/practice/PracticeModeSelector'
import { RecommendedPracticePane } from '../components/practice/modes/RecommendedPracticePane'
import { ChallengePracticePane } from '../components/practice/modes/ChallengePracticePane'
import { CustomPracticePane } from '../components/practice/modes/CustomPracticePane'
import { ScenarioPracticePane } from '../components/practice/modes/ScenarioPracticePane'
import { RandomPracticePane } from '../components/practice/modes/RandomPracticePane'
import { useAsync } from '../hooks/useAsync'
import { useChallengeSession } from '../hooks/useChallengeSession'
import { useAIProvider } from '../context/AIProviderContext'
import { api } from '../services/api'
import type {
  Exercise,
  ExerciseGenerationRequest,
  ExerciseType,
  JlptLevel,
  LearningRecommendation,
  Register,
  TargetLength,
  WritingScenario,
} from '../types/api'

const EMPTY_PREFERENCE = ''

function buildPayloadWithProvider(base: ExerciseGenerationRequest, provider?: string, model?: string): ExerciseGenerationRequest {
  const payload: ExerciseGenerationRequest = { ...base }
  if (provider) payload.provider = provider
  if (model) payload.model = model
  return payload
}

function isPracticeMode(value: string | null): value is PracticeMode {
  return (
    value === 'recommended' ||
    value === 'custom' ||
    value === 'random' ||
    value === 'challenge' ||
    value === 'scenario'
  )
}

export default function PracticePage() {
  const { selectedProvider, selectedModel } = useAIProvider()
  const [exerciseList, setExerciseList] = useState<Exercise[]>([])
  const [totalExercises, setTotalExercises] = useState(0)
  const [loadingExercises, setLoadingExercises] = useState(true)
  const [loadingMoreExercises, setLoadingMoreExercises] = useState(false)
  const [exerciseError, setExerciseError] = useState<string | null>(null)

  const fetchInitialExercises = useCallback(async () => {
    setLoadingExercises(true)
    setExerciseError(null)
    try {
      const res = await api.listExercises({ limit: 18, skip: 0 })
      setExerciseList(res.items)
      setTotalExercises(res.total)
    } catch (err) {
      setExerciseError(err instanceof Error ? err.message : 'Không thể tải danh sách bài tập')
    } finally {
      setLoadingExercises(false)
    }
  }, [])

  useEffect(() => {
    void fetchInitialExercises()
  }, [fetchInitialExercises])

  const loadMoreExercises = useCallback(async () => {
    if (loadingMoreExercises || exerciseList.length >= totalExercises) return
    setLoadingMoreExercises(true)
    try {
      const res = await api.listExercises({ limit: 18, skip: exerciseList.length })
      setExerciseList((prev) => {
        const existingIds = new Set(prev.map((e) => e.id))
        const newItems = res.items.filter((e) => !existingIds.has(e.id))
        return [...prev, ...newItems]
      })
      setTotalExercises(res.total)
    } catch {
      // Keep existing list on pagination error
    } finally {
      setLoadingMoreExercises(false)
    }
  }, [exerciseList.length, loadingMoreExercises, totalExercises])

  const handleDeleteExercise = useCallback(async (exerciseId: string) => {
    await api.deleteExercise(exerciseId)
    setExerciseList((prev) => prev.filter((e) => e.id !== exerciseId))
    setTotalExercises((prev) => Math.max(0, prev - 1))
    setCurrent((curr) => (curr?.id === exerciseId ? null : curr))
  }, [])

  const handleDeleteAllExercises = useCallback(async () => {
    await api.deleteAllExercises()
    setExerciseList([])
    setTotalExercises(0)
    setCurrent(null)
  }, [])

  const recommendation = useAsync(() => api.getLearningRecommendation())
  const journeyContext = useAsync(() => api.getJourneyObjectiveContext())

  const [searchParams] = useSearchParams()
  const urlMode = searchParams.get('mode')
  const [mode, setMode] = useState<PracticeMode>(
    isPracticeMode(urlMode) ? urlMode : 'recommended',
  )

  const storedConfig = getStoredPracticeConfig()
  const [topic, setTopic] = useState(storedConfig.topic || '')
  const [savedDefaultSuccess, setSavedDefaultSuccess] = useState(false)
  const [exerciseType, setExerciseType] = useState<ExerciseType | ''>(
    storedConfig.exerciseType || EMPTY_PREFERENCE,
  )
  const [register, setRegister] = useState<Register | ''>(
    storedConfig.register || EMPTY_PREFERENCE,
  )
  const [jlptLevel, setJlptLevel] = useState<JlptLevel | ''>(
    storedConfig.jlptLevel || 'N4',
  )
  const [difficulty, setDifficulty] = useState<string>(
    String(storedConfig.difficulty || 5),
  )
  const [targetLength, setTargetLength] = useState<TargetLength | ''>(
    storedConfig.targetLength || EMPTY_PREFERENCE,
  )
  const [randomRegister, setRandomRegister] = useState<Register | ''>(EMPTY_PREFERENCE)
  const [randomDifficulty, setRandomDifficulty] = useState<string>(EMPTY_PREFERENCE)
  const [historyOpen, setHistoryOpen] = useState(true)

  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [current, setCurrent] = useState<Exercise | null>(null)
  const challengeSession = useChallengeSession()
  const [scenario, setScenario] = useState<WritingScenario | null>(null)
  const [startingScenario, setStartingScenario] = useState(false)

  const navigate = useNavigate()
  const recentScenarios = useAsync(() => api.listRecentScenarios({ limit: 10 }))

  const handleSaveDefault = () => {
    const config: PracticeDefaultSettings = {
      exerciseType: (exerciseType || 'sentence_translation') as ExerciseType,
      jlptLevel: (jlptLevel || 'N4') as JlptLevel,
      register: (register || 'polite') as Register,
      difficulty: Number(difficulty) || 5,
      targetLength: (targetLength || 'short_sentence') as TargetLength,
      topic: topic.trim() || undefined,
    }
    localStorage.setItem('practice:quick_settings:v1', JSON.stringify(config))
    setSavedDefaultSuccess(true)
    setTimeout(() => setSavedDefaultSuccess(false), 2500)
  }

  const generate = async (payload: ExerciseGenerationRequest) => {
    setGenerating(true)
    setGenerationError(null)
    try {
      const exercise = await api.generateExercise(
        buildPayloadWithProvider(payload, selectedProvider || undefined, selectedModel || undefined),
      )
      setCurrent(exercise)
      setExerciseList((prev) => [exercise, ...prev.filter((e) => e.id !== exercise.id)])
      setTotalExercises((prev) => prev + 1)
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tạo bài tập')
    } finally {
      setGenerating(false)
    }
  }

  const generateCustom = async () => {
    const base: ExerciseGenerationRequest = {}
    const trimmedTopic = topic.trim()
    if (trimmedTopic) base.topic = trimmedTopic
    if (exerciseType) base.exercise_type = exerciseType
    if (register) base.register = register
    if (jlptLevel) base.jlpt_level = jlptLevel
    if (difficulty) base.difficulty = Number(difficulty)
    if (targetLength) base.target_length = targetLength
    await generate(base)
  }

  const generateRandom = async () => {
    const base: ExerciseGenerationRequest = {}
    if (randomRegister) base.register = randomRegister
    if (randomDifficulty) base.difficulty = Number(randomDifficulty)
    await generate(base)
  }

  const refreshRecommendation = async () => {
    setGenerating(true)
    setGenerationError(null)
    try {
      await api.nextLearningRecommendation(
        buildPayloadWithProvider({}, selectedProvider || undefined, selectedModel || undefined) as unknown as Parameters<typeof api.nextLearningRecommendation>[0],
      )
      await recommendation.run()
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tạo gợi ý bài tập',
      )
    } finally {
      setGenerating(false)
    }
  }

  const openRecommended = async (rec: LearningRecommendation) => {
    setGenerating(true)
    setGenerationError(null)
    try {
      let target = rec
      if (!target.exercise) {
        try {
          target = await api.nextLearningRecommendation(
            buildPayloadWithProvider({}, selectedProvider || undefined, selectedModel || undefined) as unknown as Parameters<typeof api.nextLearningRecommendation>[0],
          )
          await recommendation.run()
        } catch {
          // Fall back to direct generation below
        }
      }
      if (target.exercise) {
        setCurrent(target.exercise as Exercise)
      } else {
        const payload = buildPayloadWithProvider(
          {
            exercise_type: rec.exercise_type,
            topic: rec.topic,
            register: rec.register,
            jlpt_level: rec.jlpt_level,
            difficulty: rec.difficulty,
            target_length: rec.target_length,
          },
          selectedProvider || undefined,
          selectedModel || undefined,
        )
        const exercise = await api.generateExercise(payload)
        setCurrent(exercise)
        setExerciseList((prev) => [exercise, ...prev.filter((e) => e.id !== exercise.id)])
        setTotalExercises((prev) => prev + 1)
      }
    } catch (err) {
      setGenerationError(
        err instanceof Error
          ? err.message
          : 'Không thể tạo bài tập cho gợi ý này. Vui lòng thử lại hoặc cấu hình API Key trong Cài đặt.',
      )
    } finally {
      setGenerating(false)
    }
  }

  const nextRecommended = async () => {
    setGenerating(true)
    setGenerationError(null)
    try {
      const rec = await api.nextLearningRecommendation(
        buildPayloadWithProvider({}, selectedProvider || undefined, selectedModel || undefined) as unknown as Parameters<typeof api.nextLearningRecommendation>[0],
      )
      await recommendation.run()
      if (rec.exercise) {
        setCurrent(rec.exercise as Exercise)
      } else {
        const payload = buildPayloadWithProvider(
          {
            exercise_type: rec.exercise_type,
            topic: rec.topic,
            register: rec.register,
            jlpt_level: rec.jlpt_level,
            difficulty: rec.difficulty,
            target_length: rec.target_length,
          },
          selectedProvider || undefined,
          selectedModel || undefined,
        )
        const exercise = await api.generateExercise(payload)
        setCurrent(exercise)
        setExerciseList((prev) => [exercise, ...prev.filter((e) => e.id !== exercise.id)])
        setTotalExercises((prev) => prev + 1)
      }
    } catch (err) {
      setGenerationError(
        err instanceof Error
          ? err.message
          : 'Không thể tạo bài tập cho gợi ý này. Vui lòng thử lại hoặc cấu hình API Key trong Cài đặt.',
      )
    } finally {
      setGenerating(false)
    }
  }

  const generateChallenge = async () => {
    setGenerating(true)
    setGenerationError(null)
    try {
      await challengeSession.generate({ provider: selectedProvider, model: selectedModel })
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tạo thử thách')
    } finally {
      setGenerating(false)
    }
  }

  const generateScenario = async () => {
    setGenerating(true)
    setGenerationError(null)
    try {
      const created = await api.generateScenario({})
      setScenario(created)
      void recentScenarios.run()
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tạo tình huống')
    } finally {
      setGenerating(false)
    }
  }

  const startScenario = async (scenarioId: string) => {
    setStartingScenario(true)
    setGenerationError(null)
    try {
      const exercise = await api.createScenarioExercise(scenarioId)
      navigate(`/free-writing?exercise=${exercise.id}&scenario=${scenarioId}`)
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tạo bài tập tình huống',
      )
    } finally {
      setStartingScenario(false)
    }
  }


  const recommended = recommendation.data

  return (
    <PageContainer size="default">
      {/* Page Header */}
      <PageHeader
        title="Luyện tập tiếng Nhật"
        description="Thực hành dịch Việt – Nhật với các bài tập do AI tạo."
      />

      {!current ? (
        <>
          {/* Main Mode Showcase Hub */}
      <Card className="jw-mb-lg">
        <CardHeader
          title={
            <div className="jw-card-eyebrow-group jw-inline jw-gap-xs" style={{ alignItems: 'center' }}>
              <span className="jw-card-eyebrow">
                Chế độ luyện tập
              </span>
            </div>
          }
        />
        <CardContent>
          <PracticeModeSelector
            currentMode={mode}
            onSelectMode={(selected) => setMode(selected)}
          />

          {/* MODE: RECOMMENDED */}
          {mode === 'recommended' ? (
            <RecommendedPracticePane
              journeyContext={journeyContext}
              recommendation={recommendation}
              recommended={recommended}
              generating={generating}
              onOpenRecommended={(rec) => void openRecommended(rec)}
              onRefreshRecommendation={() => void refreshRecommendation()}
            />
          ) : null}

          {/* MODE: CHALLENGE */}
          {mode === 'challenge' ? (
            <ChallengePracticePane
              challengeSession={challengeSession}
              generating={generating}
              onGenerateChallenge={() => void generateChallenge()}
              onOpenChallengeFull={() => navigate('/challenge')}
            />
          ) : null}

          {/* MODE: CUSTOM */}
          {mode === 'custom' ? (
            <CustomPracticePane
              topic={topic}
              setTopic={setTopic}
              jlptLevel={jlptLevel}
              setJlptLevel={setJlptLevel}
              register={register}
              setRegister={setRegister}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              exerciseType={exerciseType}
              setExerciseType={setExerciseType}
              targetLength={targetLength}
              setTargetLength={setTargetLength}
              generating={generating}
              onGenerateCustom={() => void generateCustom()}
              onSaveDefault={handleSaveDefault}
              savedDefaultSuccess={savedDefaultSuccess}
            />
          ) : null}

          {/* MODE: RANDOM */}
          {mode === 'random' ? (
            <RandomPracticePane
              randomRegister={randomRegister}
              setRandomRegister={setRandomRegister}
              randomDifficulty={randomDifficulty}
              setRandomDifficulty={setRandomDifficulty}
              generating={generating}
              onGenerateRandom={() => void generateRandom()}
            />
          ) : null}

          {/* MODE: SCENARIO */}
          {mode === 'scenario' ? (
            <ScenarioPracticePane
              scenario={scenario}
              startingScenario={startingScenario}
              onStartScenario={(id) => void startScenario(id)}
              onNavigateToSimulation={(id) => navigate(`/simulation?scenario=${id}`)}
              onNavigateToScenarioFull={() => navigate('/scenario')}
              onGenerateScenario={() => void generateScenario()}
              generating={generating}
              recentScenarios={recentScenarios}
            />
          ) : null}

          {generationError ? (
            <Alert tone="error" title="Không thể tạo bài tập" className="jw-mt-md">
              {generationError}
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {/* PRACTICE ARCHIVE & HISTORY */}
      <Card className="jw-mb-lg">
        <CardHeader
          title="Bài tập đã lưu & Lịch sử"
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {totalExercises ? (
                <Badge tone="accent">
                  {totalExercises} bài tập
                </Badge>
              ) : undefined}
              <Button
                variant="ghost"
                size="sm"
                icon={historyOpen ? 'chevron-up' : 'chevron-down'}
                onClick={() => setHistoryOpen((v) => !v)}
                style={{ fontSize: '12px', height: '28px', padding: '0 8px' }}
              >
                {historyOpen ? 'Thu gọn' : 'Mở rộng'}
              </Button>
            </div>
          }
        />
        {historyOpen && (
          <CardContent>
            {loadingExercises ? (
              <LoadingSpinner label="Đang tải danh sách bài tập..." />
            ) : exerciseError ? (
              <Alert tone="error">Không thể tải danh sách bài tập: {exerciseError}</Alert>
            ) : (
              <PracticeHistoryArchive
                exercises={exerciseList}
                totalCount={totalExercises}
                hasMore={exerciseList.length < totalExercises}
                loadingMore={loadingMoreExercises}
                onLoadMore={loadMoreExercises}
                onSelectExercise={(ex) => setCurrent(ex)}
                onDeleteExercise={handleDeleteExercise}
                onDeleteAll={handleDeleteAllExercises}
                onOpenSettings={() => {
                  setCurrent(null)
                  setMode('custom')
                }}
              />
            )}
          </CardContent>
        )}
      </Card>
    </>
  ) : (
    /* ACTIVE EXERCISE VIEW */
    <Card className="jw-mb-lg">
      <CardHeader
        title="Bài tập của bạn"
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon="arrow-left"
            onClick={() => setCurrent(null)}
          >
            ← Chọn bài khác
          </Button>
        }
      />
      <CardContent>
        <ExerciseView
          exercise={current}
          onBack={() => setCurrent(null)}
          onNext={() => void nextRecommended()}
          nextPending={generating}
          onOpenSettings={() => {
            setCurrent(null)
            setMode('custom')
          }}
        />
      </CardContent>
    </Card>
  )}

  {generating && !current ? (
    <LoadingSpinner label="AI đang tạo bài tập..." />
  ) : null}
</PageContainer>
)
}