import { useEffect, useMemo, useRef } from 'react'
import { usePracticeSession } from '../hooks/usePracticeSession'
import type { Exercise } from '../types/api'
import { Alert } from './ui/Alert'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { ErrorState } from './ui/ErrorState'
import { Spinner } from './ui/Spinner'
import { WritingEditorShell } from './writing/WritingEditorShell'
import { CharacterCounter, type CharacterCounterState } from './writing/CharacterCounter'
import { EvaluationResultView } from './feedback/EvaluationResultView'
import { CompletionCard } from './feedback/CompletionCard'
import { useAIProvider } from '../context/AIProviderContext'
import { KeyVocabularyAssist } from './practice/KeyVocabularyAssist'
import type { VocabularyHint } from '../types/api'
import { Popover } from './ui/Popover'
import { AIWritingAssistantDrawer } from './ai/AIWritingAssistantDrawer'
import {
  EXERCISE_TYPE_LABELS,
  TARGET_CHARS,
  TARGET_LENGTH_LABELS,
  registerLabel,
} from './feedback/labels'

export interface ExerciseViewProps {
  exercise: Exercise
  editorLabel?: string
  editorPlaceholder?: string
  onBack: () => void
  onNext: () => void
  nextPending: boolean
  onOpenSettings?: () => void
}

function draftKey(exerciseId: string): string {
  return `draft:practice:${exerciseId}`
}

export default function ExerciseView({
  exercise,
  editorLabel = 'Câu trả lời tiếng Nhật của bạn',
  editorPlaceholder = 'Viết câu trả lời tiếng Nhật ở đây...',
  onBack,
  onNext,
  nextPending,
  onOpenSettings,
}: ExerciseViewProps) {
  const { selectedProvider, selectedModel } = useAIProvider()
  const session = usePracticeSession(exercise, {
    provider: selectedProvider,
    model: selectedModel,
  })
  const {
    phase,
    answer,
    setAnswer,
    evaluation,
    previousEvaluation,
    hints,
    hintsTotal,
    revealAvailable,
    revealed,
    hintPending,
    revealPending,
    submitError,
    actionError,
    vocabulary,
    xpGained,
    missionCompleted,
    dailyGoal,
    submitted,
  } = session

  const feedbackRef = useRef<HTMLDivElement>(null)

  const count = useMemo(() => [...answer].length, [answer])
  const targetChars = TARGET_CHARS[exercise.target_length] ?? 80
  const targetMin = Math.round(targetChars * 0.8)
  const targetMax = Math.round(targetChars * 1.2)

  const counterState: CharacterCounterState =
    targetMax !== undefined && count > targetMax
      ? 'above'
      : targetMin !== undefined && count < targetMin
        ? 'below'
        : 'within'

  const charHintText =
    counterState === 'below'
      ? 'Thêm một chút nữa nhé'
      : counterState === 'within'
        ? 'Độ dài phù hợp'
        : 'Đang vượt độ dài đề xuất'

  useEffect(() => {
    if (phase === 'result') {
      feedbackRef.current?.focus()
    }
  }, [phase])

  useEffect(() => {
    const saved = localStorage.getItem(draftKey(exercise.id))
    if (saved) setAnswer(saved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id])

  useEffect(() => {
    if (phase === 'writing') {
      localStorage.setItem(draftKey(exercise.id), answer)
    }
  }, [answer, phase, exercise.id])

  useEffect(() => {
    if (submitted) {
      localStorage.removeItem(draftKey(exercise.id))
    }
  }, [submitted, exercise.id])

  const previousNote = evaluation
    ? `Lần thử trước: ${evaluation.scores.overall_score}/100 (lần ${evaluation.attempt_number}). Bạn có thể sửa tiếp và gửi lại.`
    : null

  const keyVocabList = useMemo<VocabularyHint[]>(() => {
    if (exercise.key_vocabulary && exercise.key_vocabulary.length > 0) {
      return exercise.key_vocabulary
    }
    const meta = exercise.generation_metadata as { key_vocabulary?: VocabularyHint[] } | null
    if (meta?.key_vocabulary && meta.key_vocabulary.length > 0) {
      return meta.key_vocabulary
    }
    return []
  }, [exercise])

  const header = (
    <div className="jw-inline jw-gap-xs jw-mb-md" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
      <div className="jw-inline jw-gap-xs" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
        <Badge tone="accent">
          {EXERCISE_TYPE_LABELS[exercise.exercise_type] ?? exercise.exercise_type}
        </Badge>
        <Badge tone="neutral">JLPT {exercise.jlpt_level}</Badge>
        <Badge tone="neutral">{registerLabel(exercise.register)}</Badge>
        <Badge tone="neutral">Độ khó {exercise.difficulty}/10</Badge>
        <Popover
          trigger={
            <button type="button" className="jw-details-trigger">
              Chi tiết
            </button>
          }
        >
          <ul className="jw-details-list">
            <li>
              Chủ đề: {exercise.topic}
              {exercise.subtopic ? ` › ${exercise.subtopic}` : ''}
            </li>
            <li>
              Độ dài mục tiêu: {TARGET_LENGTH_LABELS[exercise.target_length] ?? exercise.target_length}
            </li>
          </ul>
        </Popover>
      </div>

      {onOpenSettings ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onOpenSettings}
          icon="settings"
          style={{ fontSize: '12px', height: '26px', padding: '0 8px' }}
        >
          Cấu hình
        </Button>
      ) : null}
    </div>
  )

  if (phase === 'completed') {
    return (
      <div className="jw-practice-exercise">
        {header}
        <CompletionCard
          score={evaluation?.scores.overall_score ?? 0}
          xpGained={xpGained}
          missionCompleted={missionCompleted}
          dailyGoal={dailyGoal}
          nextPending={nextPending}
          onNext={onNext}
          onBack={onBack}
        />
      </div>
    )
  }

  const editor = (
    <div className="jw-editor-zone">
      {previousNote && (phase === 'writing' || phase === 'error') ? (
        <div
          className="jw-prev-note"
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(168, 85, 247, 0.12)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            marginBottom: 'var(--space-sm)',
            fontSize: '13px',
            color: 'var(--color-foreground)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>🎯</span>
          <strong>{previousNote}</strong>
        </div>
      ) : null}
      <WritingEditorShell
        value={answer}
        onChange={setAnswer}
        placeholder={editorPlaceholder}
        textareaProps={{ 'aria-label': editorLabel, rows: 6, lang: 'ja' }}
        footerLeft={
          <span className={`jw-char-hint jw-char-hint--${counterState}`}>{charHintText}</span>
        }
        footerRight={
          <CharacterCounter current={count} targetMin={targetMin} targetMax={targetMax} />
        }
      />
      {phase === 'submitting' ? (
        <div className="jw-ai-reviewing" role="status">
          <Spinner size={16} />
          <span>AI đang phân tích và đánh giá bài viết của bạn…</span>
        </div>
      ) : null}
      <div className="jw-submit-row jw-mt-md" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
        <Button
          onClick={session.submit}
          disabled={count === 0 || phase === 'submitting'}
          variant="primary"
          size="md"
          icon="send"
          style={{ minWidth: '120px' }}
        >
          Gửi bài
        </Button>
      </div>
      {phase === 'error' ? (
        <ErrorState
          title="Không thể hoàn tất đánh giá AI"
          message="Chúng tôi không thể hoàn tất đánh giá AI. Bài viết của bạn vẫn được giữ lại."
          retryLabel="Thử lại"
          onRetry={session.submit}
        />
      ) : null}
      {phase === 'error' ? (
        <div className="jw-submit-row jw-mt-sm">
          <Button variant="secondary" onClick={onBack}>
            Lưu và quay lại
          </Button>
        </div>
      ) : null}
    </div>
  )

  if (phase === 'result' && evaluation) {
    return (
      <div className="jw-practice-exercise" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        {header}
        <div className="jw-studio-layout jw-studio-layout--editor-focus" style={{ minHeight: 0, flex: 1 }}>
          {/* Left Reference Pane */}
          <div className="jw-studio-pane">
            <div className="jw-studio-pane-header">
              <span className="jw-studio-pane-title">📖 Đề bài & Bối cảnh</span>
            </div>
            <div className="jw-studio-pane-content">
              {exercise.context ? <p className="jw-exercise-context jw-mb-sm">{exercise.context}</p> : null}
              <p className="jw-exercise-prompt jw-mb-md">{exercise.prompt_vi}</p>
              <KeyVocabularyAssist vocabulary={keyVocabList} />
            </div>
          </div>

          {/* Right AI Evaluation Pane */}
          <div className="jw-studio-pane">
            <div className="jw-studio-pane-header">
              <span className="jw-studio-pane-title">✨ Kết quả & Đánh giá AI</span>
              <Badge tone="accent">Điểm: {evaluation.scores.overall_score}/100</Badge>
            </div>
            <div
              className="jw-studio-pane-content"
              ref={feedbackRef}
              tabIndex={-1}
              role="region"
              aria-label="Đánh giá AI của bạn"
            >
              <EvaluationResultView
                exercise={exercise}
                evaluation={evaluation}
                previousEvaluation={previousEvaluation}
                hints={hints}
                hintsTotal={hintsTotal}
                revealAvailable={revealAvailable}
                revealed={revealed}
                hintPending={hintPending}
                revealPending={revealPending}
                actionError={actionError}
                vocabulary={vocabulary}
                xpGained={xpGained}
                dailyGoal={dailyGoal}
                nextPending={nextPending}
                onRequestHint={session.requestHint}
                onReveal={session.reveal}
                onRetry={session.retry}
                onComplete={session.complete}
                onNext={onNext}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="jw-practice-exercise" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {header}
      <div className="jw-studio-layout jw-studio-layout--editor-focus" style={{ minHeight: 0, flex: 1 }}>
        {/* Left Reference Pane */}
        <div className="jw-studio-pane">
          <div className="jw-studio-pane-header">
            <span className="jw-studio-pane-title">📖 Đề bài & Trợ lực AI</span>
          </div>
          <div className="jw-studio-pane-content">
            {exercise.context ? <p className="jw-exercise-context jw-mb-sm">{exercise.context}</p> : null}
            <p className="jw-exercise-prompt jw-mb-md">{exercise.prompt_vi}</p>
            <KeyVocabularyAssist vocabulary={keyVocabList} />
            <AIWritingAssistantDrawer
              prompt_vi={exercise.prompt_vi}
              context_vi={exercise.context}
              jlpt_level={exercise.jlpt_level}
              onInsertPhrase={(phrase) => {
                session.setAnswer(session.answer + phrase)
              }}
            />
          </div>
        </div>

        {/* Right Editor Pane */}
        <div className="jw-studio-pane">
          <div className="jw-studio-pane-header">
            <span className="jw-studio-pane-title">✍️ Bài làm tiếng Nhật</span>
            <span className="jw-text--caption jw-text--muted">{charHintText}</span>
          </div>
          <div className="jw-studio-pane-content">
            {editor}
            {submitError && phase !== 'error' ? (
              <Alert tone="error" className="jw-mt-md">Không thể đánh giá: {submitError}</Alert>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}