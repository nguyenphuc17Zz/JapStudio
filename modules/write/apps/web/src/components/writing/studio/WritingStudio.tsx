import { useEffect, useRef, useState } from 'react'
import { useWritingSession, type WorkspaceTab } from '../../../hooks/useWritingSession'
import { useMediaQuery } from '../../../lib/useMediaQuery'
import { cx } from '../../../lib/cx'
import { api } from '../../../services/api'
import type { Exercise, WritingScenario } from '../../../types/api'
import { LoadingSpinner } from '../../LoadingSpinner'
import { Button } from '../../ui/Button'
import { Tabs } from '../../ui/Tabs'
import { AIModelPicker } from '../../ai/AIModelPicker'
import { useAIProvider } from '../../../context/AIProviderContext'
import { CoachWorkspace } from './CoachPane'
import { ReviewPane } from './ReviewPane'
import { RevisionsPane } from './RevisionsPane'
import { ScenarioCompleteBanner } from './ScenarioCompleteBanner'
import { TopicPane } from './TopicPane'

export interface WritingStudioProps {
  exercise: Exercise
  scenario: WritingScenario | null
  generating: boolean
  onNewTopic: () => void
  newTopicLabel?: string
}

export function WritingStudio({
  exercise,
  scenario,
  generating,
  onNewTopic,
  newTopicLabel = 'Đề tài mới',
}: WritingStudioProps) {
  const { selectedProvider, selectedModel } = useAIProvider()
  const session = useWritingSession(exercise, {
    provider: selectedProvider,
    model: selectedModel,
  })
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [focusMode, setFocusMode] = useState(false)

  const baselineXpRef = useRef<number | null>(null)
  const trackedSubmissionRef = useRef<string | null>(null)
  const [scenarioXp, setScenarioXp] = useState<number | null>(null)

  useEffect(() => {
    if (!scenario) return
    baselineXpRef.current = null
    trackedSubmissionRef.current = null
    setScenarioXp(null)
    api
      .getGamificationToday()
      .then((gamification) => {
        baselineXpRef.current = gamification.summary.today_xp
      })
      .catch(() => {
        baselineXpRef.current = null
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario?.id])

  useEffect(() => {
    if (!scenario || !session.evaluation) return
    if (trackedSubmissionRef.current === session.evaluation.submission_id) return
    if (baselineXpRef.current === null) return
    trackedSubmissionRef.current = session.evaluation.submission_id
    api
      .getGamificationToday()
      .then((gamification) => {
        const gained = Math.max(0, gamification.summary.today_xp - (baselineXpRef.current ?? 0))
        if (gained > 0) setScenarioXp(gained)
      })
      .catch(() => {
        trackedSubmissionRef.current = null
      })
  }, [scenario, session.evaluation])

  useEffect(() => {
    if (!focusMode) return
    document.body.classList.add('jw-focus-mode')
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocusMode(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('jw-focus-mode')
      document.removeEventListener('keydown', onKey)
    }
  }, [focusMode])

  useEffect(() => {
    if (!(isMobile && session.phase === 'coach')) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') session.setTab('review')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isMobile, session.phase, session])

  const { phase, tab, evaluation, submission, compare } = session

  const showOverlay =
    phase === 'submitting' || phase === 'evaluating' || phase === 'revising'
  const preSubmit = phase === 'draft' || phase === 'error'

  const writeNode = (
    <TopicPane
      exercise={exercise}
      scenario={scenario}
      answer={session.answer}
      onChange={session.setAnswer}
      draftSaved={session.draftSaved}
      revisionMode={session.revisionMode}
      latestRevisionNumber={session.latestRevisionNumber}
      submitError={session.submitError}
      actionError={session.actionError}
      retryAction={session.retryAction}
      onSubmit={session.revisionMode ? session.revise : session.submit}
      onRetry={session.retry}
      onCancelRevision={session.cancelRevision}
      structure={evaluation?.structure_suggestion ?? null}
      improvedStructure={evaluation?.improved_structure ?? null}
    />
  )

  const reviewNode = evaluation ? (
    <ReviewPane
      evaluation={evaluation}
      scenarioMode={scenario !== null}
      hints={session.hints}
      hintsTotal={session.hintsTotal}
      revealAvailable={session.revealAvailable}
      revealed={session.revealed}
      hintPending={session.hintPending}
      revealPending={session.revealPending}
      actionError={session.actionError}
      onNextHint={session.requestHint}
      onReveal={session.reveal}
    />
  ) : null

  const revisionsNode = submission ? (
    <RevisionsPane
      submission={submission}
      compare={phase === 'compare' ? compare : null}
      actionError={phase === 'compare' ? session.actionError : null}
      review={reviewNode}
      onSelectRevision={session.selectRevision}
      onBackToLatest={session.backToLatest}
    />
  ) : null

  const coachNode = evaluation ? (
    <CoachWorkspace
      evaluation={evaluation}
      thread={session.coachThread}
      question={session.coachQuestion}
      onQuestionChange={session.setCoachQuestion}
      loading={session.coachLoading}
      error={session.coachError}
      onAsk={session.askCoach}
    />
  ) : null

  const toolbarItems = preSubmit
    ? [{ id: 'write' as const, label: 'Viết', content: writeNode }]
    : [
        { id: 'review' as const, label: 'Đánh giá', content: reviewNode },
        {
          id: 'revisions' as const,
          label: phase === 'compare' ? 'So sánh' : 'Bản sửa',
          content: revisionsNode,
        },
        { id: 'coach' as const, label: 'AI Coach', content: coachNode },
      ]

  const activeTab: WorkspaceTab = preSubmit ? 'write' : tab

  return (
    <div className={cx('jw-studio', focusMode && 'jw-studio--focus')}>
      {showOverlay ? (
        <div className="jw-studio-overlay">
          <LoadingSpinner label="✦ AI đang đánh giá bài viết của bạn…" />
        </div>
      ) : (
        <>
          {scenario && evaluation ? (
            <ScenarioCompleteBanner
              score={evaluation.scores.scenario_fit ?? null}
              xp={scenarioXp}
            />
          ) : null}
          <div className="jw-studio-toolbar-row">
            <Tabs
              className="jw-studio-toolbar-tabs"
              value={activeTab}
              onChange={(id) => session.setTab(id as WorkspaceTab)}
              items={toolbarItems.map((item) => ({ ...item, content: null }))}
            />
            <div className="jw-studio-actions">
              <AIModelPicker variant="compact" />
              {!preSubmit ? (
                <Button
                  variant="ghost"
                  size="sm"
                  icon="edit"
                  onClick={session.startRevision}
                  disabled={phase === 'compare'}
                >
                  Viết lại
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                icon="refresh"
                onClick={onNewTopic}
                loading={generating}
              >
                {newTopicLabel}
              </Button>
              {session.answer.trim().length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  href={`/rewrite-lab?text=${encodeURIComponent(session.answer.trim())}&context=${encodeURIComponent(exercise.prompt_vi || '')}`}
                  aria-label="Chuyển sang Rewrite Lab"
                >
                  🧪 Rewrite Lab
                </Button>
              )}
              {!isMobile ? (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={focusMode ? 'eye-off' : 'eye'}
                  onClick={() => setFocusMode((mode) => !mode)}
                >
                  {focusMode ? 'Thoát tập trung' : 'Tập trung'}
                </Button>
              ) : null}
            </div>
          </div>
          <div className="jw-studio-content">
            {toolbarItems.find((item) => item.id === activeTab)?.content}
          </div>
        </>
      )}
    </div>
  )
}