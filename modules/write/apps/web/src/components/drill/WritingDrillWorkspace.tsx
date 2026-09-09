import { useState, useCallback, useEffect } from 'react'
import { api } from '../../services/api'
import type {
  DrillSession,
  DrillItem,
  DrillAttemptResult,
  BadgeTone,
  DrillOption,
} from '../../types/api'
import { Card, CardHeader, CardContent, CardFooter } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { Alert } from '../ui/Alert'
import { Skeleton } from '../ui/Skeleton'
import { Icon } from '../icons/Icon'
import { cx } from '../../lib/cx'

export interface WritingDrillWorkspaceProps {
  drillSessionId?: string
  weaknessId?: string
  initialSession?: DrillSession | null
  onClose?: () => void
  onCompleted?: (session: DrillSession) => void
}

function categoryTone(cat: string): BadgeTone {
  switch (cat.toLowerCase()) {
    case 'grammar':
      return 'grammar'
    case 'lexicon':
    case 'vocabulary':
      return 'vocabulary'
    case 'naturalness':
      return 'naturalness'
    case 'register':
      return 'register'
    case 'discourse':
      return 'discourse'
    default:
      return 'neutral'
  }
}

function stageLabel(stage: number): string {
  switch (stage) {
    case 1:
      return 'Giai đoạn 1: Hướng dẫn chi tiết'
    case 2:
      return 'Giai đoạn 2: Hướng dẫn nhẹ'
    case 3:
      return 'Giai đoạn 3: Hướng dẫn tối thiểu'
    case 4:
      return 'Giai đoạn 4: Thử thách tự do'
    default:
      return `Giai đoạn ${stage}`
  }
}

function drillTypeLabel(type: string): string {
  switch (type) {
    case 'recognition':
      return 'Nhận diện chuẩn'
    case 'correction':
      return 'Sửa lỗi câu'
    case 'rewrite':
      return 'Viết lại chuẩn ngữ pháp'
    case 'vietnamese_to_japanese':
      return 'Dịch Việt → Nhật'
    case 'japanese_to_natural_rewrite':
      return 'Viết lại thuần Nhật'
    case 'pattern_substitution':
      return 'Thay thế mẫu câu'
    case 'free_response':
      return 'Sản sinh tự do'
    case 'real_world_mini_task':
      return 'Nhiệm vụ thực tế'
    default:
      return type
  }
}

export function WritingDrillWorkspace({
  drillSessionId,
  weaknessId,
  initialSession,
  onClose,
  onCompleted,
}: WritingDrillWorkspaceProps) {
  const [session, setSession] = useState<DrillSession | null>(initialSession || null)
  const [loading, setLoading] = useState(!initialSession)
  const [error, setError] = useState<string | null>(null)

  // Current answer state
  const [answerText, setAnswerText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [attemptResult, setAttemptResult] = useState<DrillAttemptResult | null>(null)

  // Hints and reveal state
  const [revealedHints, setRevealedHints] = useState<string[]>([])
  const [revealedCount, setRevealedCount] = useState(0)
  const [hintsLoading, setHintsLoading] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)
  const [targetAnswer, setTargetAnswer] = useState<string | null>(null)
  const [targetExplanation, setTargetExplanation] = useState<string | null>(null)

  // Initialize or fetch session
  const initSession = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      let s: DrillSession
      if (drillSessionId) {
        s = await api.getWritingDrillSession(drillSessionId)
      } else {
        s = await api.generateWritingDrill({ weakness_id: weaknessId })
      }
      setSession(s)
    } catch (err: any) {
      setError(err?.message || 'Không thể khởi tạo phiên luyện tập mục tiêu.')
    } finally {
      setLoading(false)
    }
  }, [drillSessionId, weaknessId])

  useEffect(() => {
    if (!initialSession) {
      void initSession()
    }
  }, [initSession, initialSession])

  const currentItem: DrillItem | null =
    session && session.items && session.current_item_index < session.items.length
      ? session.items[session.current_item_index]
      : null

  // Reset item state when item advances
  useEffect(() => {
    setAnswerText('')
    setAttemptResult(null)
    setRevealedHints([])
    setRevealedCount(0)
    setIsRevealed(false)
    setTargetAnswer(null)
    setTargetExplanation(null)
  }, [session?.current_item_index])

  // Request Hint
  const handleRequestHint = async () => {
    if (!session || !currentItem) return
    try {
      setHintsLoading(true)
      const res = await api.getWritingDrillHint(session.id, currentItem.id)
      if (res.hint && !revealedHints.includes(res.hint)) {
        setRevealedHints((prev) => [...prev, res.hint!])
      }
      setRevealedCount(res.hints_revealed_count)
    } catch {
      // ignore
    } finally {
      setHintsLoading(false)
    }
  }

  // Reveal Answer
  const handleRevealAnswer = async () => {
    if (!session || !currentItem) return
    try {
      const res = await api.revealWritingDrillAnswer(session.id, currentItem.id)
      setIsRevealed(true)
      setTargetAnswer(res.target_answer)
      setTargetExplanation(res.explanation)
    } catch {
      // ignore
    }
  }

  // Submit Answer
  const handleSubmit = async (overrideAnswer?: string) => {
    if (!session || !currentItem) return
    const textToSubmit = overrideAnswer !== undefined ? overrideAnswer : answerText
    if (!textToSubmit.trim()) return

    try {
      setSubmitting(true)
      const res = await api.submitWritingDrillAttempt(session.id, {
        item_id: currentItem.id,
        item_index: session.current_item_index,
        answer_text: textToSubmit.trim(),
      })
      setAttemptResult(res)

      // Refresh session state
      const updated = await api.getWritingDrillSession(session.id)
      setSession(updated)

      if (updated.status === 'completed' && onCompleted) {
        onCompleted(updated)
      }
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi nộp câu trả lời.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card variant="ai" className="jw-drill-workspace">
        <CardHeader
          title={<span className="jw-card-eyebrow">Đang tạo bài luyện tập mục tiêu...</span>}
        />
        <CardContent>
          <Skeleton variant="card" />
        </CardContent>
      </Card>
    )
  }

  if (error || !session) {
    return (
      <Card className="jw-drill-workspace">
        <CardHeader title={<span className="jw-card-eyebrow">Luyện tập mục tiêu</span>} />
        <CardContent>
          <Alert tone="error" title="Không thể tải bài tập">
            {error || 'Không tìm thấy phiên luyện tập.'}
          </Alert>
          <div className="jw-mt-md jw-flex jw-justify-end jw-gap-sm">
            <Button variant="ghost" onClick={onClose}>
              Đóng
            </Button>
            <Button variant="primary" onClick={() => void initSession()}>
              Thử lại
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Completed Session Screen
  if (session.status === 'completed') {
    const outcome = session.outcome
    const total = outcome?.total_items || session.items.length
    const passed = outcome?.passed_items || 0
    const avgScore = outcome?.average_score || 0
    const delta = outcome?.mastery_delta ?? session.mastery_delta ?? 0

    return (
      <Card variant="ai" className="jw-drill-workspace jw-drill-completed">
        <CardHeader
          title={
            <div className="jw-card-eyebrow-group">
              <span className="jw-card-eyebrow">Hoàn thành phiên luyện tập</span>
              <h3 className="jw-card-title">{session.title}</h3>
            </div>
          }
          actions={
            onClose ? (
              <Button variant="ghost" size="sm" icon="x" onClick={onClose} aria-label="Đóng" />
            ) : undefined
          }
        />
        <CardContent style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Hero Banner */}
          <div className="jw-drill-hero-card">
            <div className="jw-flex jw-items-center jw-gap-md">
              <div className="jw-drill-trophy-circle">
                <Icon name="sparkles" size={28} />
              </div>
              <div>
                <h4 className="jw-text--title jw-text--primary" style={{ margin: 0 }}>
                  Xuất sắc! Bạn đã vượt qua 4 giai đoạn
                </h4>
                <p className="jw-text--sm jw-text--secondary" style={{ margin: '4px 0 0 0' }}>
                  {session.target_focus}
                </p>
              </div>
            </div>

            {/* Score Grid */}
            <div className="jw-drill-metrics-grid jw-mt-md">
              <div className="jw-drill-metric-box">
                <span className="jw-text--muted jw-text--xs">Bài đạt yêu cầu</span>
                <strong className="jw-text--title jw-text--success">
                  {passed} / {total}
                </strong>
              </div>
              <div className="jw-drill-metric-box">
                <span className="jw-text--muted jw-text--xs">Điểm trung bình</span>
                <strong className="jw-text--title jw-text--primary">{avgScore} / 100</strong>
              </div>
              <div className="jw-drill-metric-box">
                <span className="jw-text--muted jw-text--xs">Tăng độ tinh thông</span>
                <strong className="jw-text--title jw-text--accent">
                  {delta >= 0 ? `+${(delta * 100).toFixed(1)}%` : `${(delta * 100).toFixed(1)}%`}
                </strong>
              </div>
            </div>
          </div>

          {/* AI Debrief */}
          {outcome?.debrief_vi && (
            <div className="jw-drill-debrief-card">
              <div className="jw-inline jw-gap-xs jw-items-center jw-text--accent jw-text--sm jw-font-medium">
                <Icon name="sparkles" size={16} />
                <span>Nhận xét sư phạm từ AI Coach</span>
              </div>
              <p className="jw-text--sm jw-text--secondary jw-mt-xs">{outcome.debrief_vi}</p>
              {outcome.next_step_vi && (
                <div className="jw-mt-sm jw-pt-xs jw-text--xs jw-text--muted" style={{ borderTop: '1px dashed var(--color-border)' }}>
                  <strong>Bước tiếp theo:</strong> {outcome.next_step_vi}
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="jw-flex jw-justify-end jw-gap-sm">
          {onClose && (
            <Button variant="primary" icon="check" onClick={onClose}>
              Xác nhận & Quay lại
            </Button>
          )}
        </CardFooter>
      </Card>
    )
  }

  // Active Session Item View
  const currentStageIndex = session.current_item_index

  return (
    <Card variant="ai" className="jw-drill-workspace">
      <CardHeader
        title={
          <div className="jw-card-eyebrow-group">
            <div className="jw-inline jw-gap-xs jw-items-center">
              <Badge tone={categoryTone(session.weakness_category)}>
                {session.weakness_category}
              </Badge>
              <Badge tone="accent">JLPT {session.jlpt_level}</Badge>
              <Badge tone="neutral">Độ khó {session.difficulty}/10</Badge>
            </div>
            <h3 className="jw-card-title">{session.title}</h3>
          </div>
        }
        actions={
          onClose ? (
            <Button variant="ghost" size="sm" icon="x" onClick={onClose} aria-label="Đóng" />
          ) : undefined
        }
      />

      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* 4-Stage Progression Stepper */}
        <div className="jw-drill-stepper">
          {session.items.map((item, idx) => {
            const isDone = idx < currentStageIndex
            const isCurr = idx === currentStageIndex
            return (
              <div
                key={item.id}
                className={cx(
                  'jw-drill-step-item',
                  isDone && 'jw-drill-step-item--done',
                  isCurr && 'jw-drill-step-item--current',
                )}
              >
                <div className="jw-drill-step-circle">
                  {isDone ? <Icon name="check" size={12} /> : idx + 1}
                </div>
                <div className="jw-drill-step-meta">
                  <span className="jw-drill-step-title">{drillTypeLabel(item.drill_type)}</span>
                  <span className="jw-drill-step-sub">Giai đoạn {item.stage}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Current Drill Stage Details */}
        {currentItem && (
          <div className="jw-drill-card-body">
            {/* Stage Header Banner */}
            <div className="jw-drill-stage-header">
              <span className="jw-text--xs jw-text--accent font-semibold uppercase tracking-wide">
                {stageLabel(currentItem.stage)} · {drillTypeLabel(currentItem.drill_type)}
              </span>
              <h4 className="jw-text--title jw-text--primary" style={{ margin: '4px 0 0 0' }}>
                {currentItem.title_vi}
              </h4>
              <p className="jw-text--sm jw-text--secondary jw-mt-xs" style={{ margin: 0 }}>
                {currentItem.instructions_vi}
              </p>
            </div>

            {/* Context Box */}
            <div className="jw-drill-context-box">
              <span className="jw-text--xs jw-text--muted font-medium block jw-mb-xs">
                Tình huống thực tế:
              </span>
              <span className="jw-text--sm jw-text--primary font-medium">
                {currentItem.context_description}
              </span>
            </div>

            {/* Source Text / Prompt */}
            <div className="jw-drill-source-box">
              <span className="jw-text--xs jw-text--muted font-medium block jw-mb-xs">
                Đề bài câu nguồn:
              </span>
              <div className="jw-drill-source-text">{currentItem.source_text}</div>
            </div>

            {/* Scaffold / Blueprint (for Stage 1 & 2) */}
            {currentItem.scaffold && (
              <div className="jw-drill-scaffold-box">
                <div className="jw-inline jw-gap-xs jw-items-center jw-text--xs jw-text--accent font-medium jw-mb-xs">
                  <Icon name="sparkles" size={14} />
                  <span>Khung sườn trợ giúp (Sentence Blueprint):</span>
                </div>
                <code className="jw-drill-scaffold-code">{currentItem.scaffold}</code>
              </div>
            )}

            {/* Recognition Options (Stage 1 or recognition drill) */}
            {currentItem.drill_type === 'recognition' && currentItem.options ? (
              <div className="jw-drill-options-grid">
                {currentItem.options.map((opt: DrillOption) => {
                  const isSelected = answerText === opt.id || answerText === opt.text
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={submitting}
                      className={cx(
                        'jw-drill-option-btn',
                        isSelected && 'jw-drill-option-btn--selected',
                      )}
                      onClick={() => {
                        setAnswerText(opt.id)
                        void handleSubmit(opt.id)
                      }}
                    >
                      <span className="jw-drill-opt-badge">{opt.id.toUpperCase()}</span>
                      <span className="jw-drill-opt-text">{opt.text}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              /* Textarea for production / translation / rewrite drills */
              <div className="jw-drill-input-wrapper">
                <Textarea
                  id="drill-answer-input"
                  label="Câu trả lời của bạn bằng tiếng Nhật:"
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Nhập câu tiếng Nhật chuẩn ngữ pháp & tự nhiên..."
                  rows={3}
                  disabled={submitting}
                />
              </div>
            )}

            {/* Progressive Hints Drawer */}
            {revealedHints.length > 0 && (
              <div className="jw-drill-hints-container">
                <span className="jw-text--xs jw-text--warning font-semibold block jw-mb-xs">
                  Gợi ý đã mở ({revealedHints.length} / {currentItem.hints?.length || 0}):
                </span>
                <div className="jw-flex jw-flex-col jw-gap-xs">
                  {revealedHints.map((h, i) => (
                    <div key={i} className="jw-drill-hint-item">
                      <span className="jw-drill-hint-num">#{i + 1}</span>
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Target Answer / Revealed Solution */}
            {isRevealed && targetAnswer && (
              <div className="jw-drill-solution-box">
                <span className="jw-text--xs jw-text--success font-semibold block jw-mb-xs">
                  Đáp án chuẩn mẫu & Giải thích:
                </span>
                <div className="jw-text--sm jw-text--primary font-semibold jw-mb-xs">
                  {targetAnswer}
                </div>
                {targetExplanation && (
                  <p className="jw-text--xs jw-text--secondary" style={{ margin: 0 }}>
                    {targetExplanation}
                  </p>
                )}
              </div>
            )}

            {/* Attempt Evaluation Result Feedback */}
            {attemptResult && (
              <div
                className={cx(
                  'jw-drill-eval-result',
                  attemptResult.is_correct
                    ? 'jw-drill-eval-result--success'
                    : 'jw-drill-eval-result--warning',
                )}
              >
                <div className="jw-flex jw-items-center jw-flex-between jw-gap-sm">
                  <div className="jw-inline jw-gap-xs jw-items-center">
                    <Icon
                      name={attemptResult.is_correct ? 'check' : 'alert'}
                      size={18}
                      className={
                        attemptResult.is_correct ? 'jw-text--success' : 'jw-text--warning'
                      }
                    />
                    <strong className="jw-text--sm">
                      {attemptResult.is_correct
                        ? `Chính xác! (${attemptResult.score}/100)`
                        : `Cần cải thiện (${attemptResult.score}/100)`}
                    </strong>
                  </div>
                </div>

                <p className="jw-text--sm jw-mt-xs" style={{ margin: '4px 0 0 0' }}>
                  {attemptResult.feedback_vi}
                </p>

                {/* Nuance Contrast if available */}
                {attemptResult.nuance_contrast && (
                  <div className="jw-drill-nuance-card jw-mt-sm">
                    <span className="jw-text--xs jw-text--accent font-semibold block">
                      Đối chiếu sắc thái tự nhiên (Nuance Contrast):
                    </span>
                    <span className="jw-text--xs jw-text--secondary">
                      {attemptResult.nuance_contrast}
                    </span>
                  </div>
                )}

                {/* Corrected Text if available */}
                {!attemptResult.is_correct && attemptResult.corrected_text && (
                  <div className="jw-drill-corrected-preview jw-mt-sm">
                    <span className="jw-text--xs jw-text--muted block">Gợi ý cách viết chuẩn:</span>
                    <span className="jw-text--sm jw-text--success font-medium">
                      {attemptResult.corrected_text}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Action Footer */}
      <CardFooter className="jw-flex jw-items-center jw-flex-between jw-gap-sm">
        <div className="jw-inline jw-gap-xs">
          {currentItem && currentItem.hints && currentItem.hints.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              icon="sparkles"
              loading={hintsLoading}
              disabled={revealedCount >= currentItem.hints.length}
              onClick={() => void handleRequestHint()}
            >
              Gợi ý ({revealedCount}/{currentItem.hints.length})
            </Button>
          )}

          {!isRevealed && (
            <Button
              variant="ghost"
              size="sm"
              icon="history"
              onClick={() => void handleRevealAnswer()}
            >
              Xem đáp án
            </Button>
          )}
        </div>

        {currentItem?.drill_type !== 'recognition' && (
          <Button
            variant="primary"
            size="md"
            icon="send"
            loading={submitting}
            disabled={!answerText.trim()}
            onClick={() => void handleSubmit()}
          >
            Nộp câu trả lời
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default WritingDrillWorkspace
