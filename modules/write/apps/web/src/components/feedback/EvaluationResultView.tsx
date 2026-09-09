import { useMemo, useState } from 'react'
import type {
  AttemptEvaluationResponse,
  AttemptVocabularyItem,
  Corrections,
  Exercise,
} from '../../types/api'
import type { DailyGoalInfo } from '../../hooks/usePracticeSession'
import { Score } from '../ui/Score'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardContent } from '../ui/Card'
import { Alert } from '../ui/Alert'
import { ProgressBar } from '../ui/Progress'
import { CyberRadar } from '../gamification/CyberRadar'
import { InlineHighlights } from './InlineHighlights'
import { IssueList } from './IssueList'
import { AttemptCompare } from './AttemptCompare'
import { LearningModePanel } from './LearningModePanel'
import { CorrectionTabs } from './CorrectionTabs'
import { FuriganaText } from '../ui/FuriganaText'
import { DIMENSION_ORDER } from './labels'

export interface EvaluationResultViewProps {
  exercise: Exercise
  evaluation: AttemptEvaluationResponse
  previousEvaluation: AttemptEvaluationResponse | null
  hints?: string[]
  hintsTotal?: number
  revealAvailable?: boolean
  revealed?: boolean
  hintPending?: boolean
  revealPending?: boolean
  actionError?: string | null
  vocabulary: AttemptVocabularyItem[] | null
  xpGained: number | null
  dailyGoal: DailyGoalInfo | null
  nextPending: boolean
  onRequestHint?: () => void
  onReveal?: () => void
  onRetry: () => void
  onComplete: () => void
  onNext?: () => void
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  fully_equivalent: 'Ý nghĩa: tương đương',
  mostly_equivalent: 'Ý nghĩa: gần tương đương',
  partially_equivalent: 'Ý nghĩa: một phần',
  meaning_changed: 'Ý nghĩa: bị thay đổi',
  natural: 'Rất tự nhiên',
  acceptable: 'Chấp nhận được',
  slightly_unnatural: 'Hơi gượng',
  unnatural: 'Không tự nhiên',
  very_unnatural: 'Rất không tự nhiên',
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Tốt'
  if (score >= 60) return 'Cần trau chuốt'
  return 'Cần cải thiện'
}

export function EvaluationResultView({
  exercise,
  evaluation,
  previousEvaluation,
  hints = [],
  hintsTotal = 0,
  revealAvailable = false,
  revealed = true,
  hintPending = false,
  revealPending = false,
  actionError = null,
  vocabulary,
  xpGained,
  dailyGoal,
  nextPending,
  onRequestHint,
  onReveal,
  onRetry,
  onComplete,
  onNext,
}: EvaluationResultViewProps) {
  const scores = evaluation.scores
  const rank = scoreLabel(scores.overall_score)
  const corrections: Corrections | null = evaluation.corrections

  const [selectedIssueIndex, setSelectedIssueIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'issues' | 'skills' | 'vocab'>('issues')

  const radarSkills = useMemo(
    () =>
      DIMENSION_ORDER.map((d) => ({
        key: d.key,
        label: d.label,
        value: scores[d.key],
      })),
    [scores],
  )

  const strengths = useMemo(
    () =>
      DIMENSION_ORDER.filter((dimension) => scores[dimension.key] >= 70)
        .sort((a, b) => scores[b.key] - scores[a.key])
        .slice(0, 2),
    [scores],
  )

  const isLearningModeGated = evaluation.learning_mode?.enabled && !revealed

  return (
    <div className="jw-result-dashboard" role="region" aria-label="Đánh giá AI của bạn">
      {/* TẦNG 1: HERO SCORE & SUMMARY BANNER */}
      <div className="jw-result-hero">
        <div className="jw-result-hero-left">
          <Score value={scores.overall_score} label={rank} />
          <div className="jw-result-hero-score-block">
            <div className="jw-inline jw-gap-xs" style={{ flexWrap: 'wrap' }}>
              <Badge tone="neutral">Kết quả: {scores.overall_score}/100</Badge>
              {evaluation.semantic_classification && (
                <Badge
                  tone={
                    evaluation.semantic_classification === 'fully_equivalent'
                      ? 'success'
                      : evaluation.semantic_classification === 'mostly_equivalent'
                        ? 'accent'
                        : 'warning'
                  }
                >
                  {CLASSIFICATION_LABELS[evaluation.semantic_classification] ??
                    evaluation.semantic_classification}
                </Badge>
              )}
              {evaluation.naturalness_classification && (
                <Badge
                  tone={
                    evaluation.naturalness_classification === 'natural'
                      ? 'success'
                      : evaluation.naturalness_classification === 'acceptable'
                        ? 'accent'
                        : 'warning'
                  }
                >
                  {CLASSIFICATION_LABELS[evaluation.naturalness_classification] ??
                    evaluation.naturalness_classification}
                </Badge>
              )}
            </div>
            {evaluation.summary && (
              <p className="jw-result-hero-summary jw-mt-xs">{evaluation.summary}</p>
            )}
          </div>
        </div>

        {/* HERO ACTIONS / STATS */}
        <div className="jw-result-hero-actions">
          {xpGained !== null && xpGained > 0 && (
            <span className="jw-xp-line">✦ +{xpGained} XP</span>
          )}
          {dailyGoal && (
            <span className="jw-text--caption jw-text--muted">
              Hôm nay {dailyGoal.completedCount}/{dailyGoal.target} bài
            </span>
          )}
        </div>
      </div>

      {/* AI SENSEI ENCOURAGEMENT CALLOUT */}
      <div style={{ marginTop: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
        <Alert
          tone={scores.overall_score >= 80 ? 'success' : scores.overall_score >= 60 ? 'info' : 'warning'}
          title={
            scores.overall_score >= 80
              ? 'AI Phản hồi: Xuất sắc! Câu văn rất tự nhiên và đúng ngữ cảnh.'
              : scores.overall_score >= 60
                ? 'AI Phản hồi: Khởi đầu rất tốt! Hãy xem các điểm lưu ý để câu văn chuẩn ngữ điệu hơn.'
                : 'AI Phản hồi: Đừng nản lòng! Hãy bấm "Thử lại" hoặc "Sửa câu trả lời" để ghi nhớ cách diễn đạt chuẩn nhé.'
          }
        >
          Đối chiếu bài viết của bạn với các phiên bản đáp án tham khảo bên phải để thấy sự khác biệt và chọn cách viết tối ưu nhất.
        </Alert>
      </div>

      {/* TẦNG 2: KHUNG ĐỐI CHIẾU SONG SONG (USER ANSWER <-> MODEL ANSWER) */}
      <div className="jw-result-compare-grid">
        {/* User Answer Panel */}
        <div className="jw-result-box">
          <div className="jw-result-box-title-row">
            <h4 className="jw-card-eyebrow" style={{ margin: 0, color: 'var(--color-primary)' }}>
              Bài viết của bạn
            </h4>
            <Button variant="ghost" size="sm" icon="edit" onClick={onRetry} style={{ height: '26px', fontSize: '11px' }}>
              Sửa câu trả lời
            </Button>
          </div>
          <div className="jw-result-box-text">
            <InlineHighlights
              answer={evaluation.answer_text}
              issues={evaluation.issues}
              selectedIssueIndex={selectedIssueIndex}
              onSelectIssue={(index) => {
                setSelectedIssueIndex(index)
                setActiveTab('issues')
              }}
            />
          </div>
          {evaluation.issues.length > 0 && (
            <div className="jw-inline jw-gap-xs jw-mt-xs" style={{ flexWrap: 'wrap' }}>
              <span className="jw-text--caption jw-text--muted">
                Phát hiện {evaluation.issues.length} điểm cần lưu ý (bấm vào chữ nổi để xem chi tiết bên dưới).
              </span>
            </div>
          )}
        </div>

        {/* Model Answer Panel (Unified CorrectionTabs) */}
        <div className="jw-result-box">
          {isLearningModeGated ? (
            <div>
              <div className="jw-result-box-title-row">
                <h4 className="jw-card-eyebrow" style={{ margin: 0, color: 'var(--color-success)' }}>
                  Gợi ý & Mở khóa đáp án
                </h4>
              </div>
              {onRequestHint && onReveal && (
                <LearningModePanel
                  hintsTotal={hintsTotal}
                  hints={hints}
                  revealAvailable={revealAvailable}
                  revealed={revealed}
                  hintPending={hintPending}
                  revealPending={revealPending}
                  onNextHint={onRequestHint}
                  onReveal={onReveal}
                />
              )}
            </div>
          ) : corrections ? (
            <CorrectionTabs corrections={corrections} />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '80px',
                color: 'var(--color-foreground-muted)',
                fontSize: '13px',
              }}
            >
              <span>AI đã đánh giá xong bài làm của bạn.</span>
            </div>
          )}
        </div>
      </div>

      {/* TẦNG 3: PHÂN TÍCH CHUYÊN SÂU 3 TAB GỌN GÀNG */}
      <div className="jw-result-analysis-section jw-mt-md">
        <div
          role="tablist"
          aria-label="Phân tích chuyên sâu"
          className="jw-inline jw-gap-xs jw-mb-md"
          style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-xs)', flexWrap: 'wrap' }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'issues'}
            onClick={() => setActiveTab('issues')}
            className={`jw-btn jw-btn--sm ${activeTab === 'issues' ? 'jw-btn--secondary' : 'jw-btn--ghost'}`}
            style={{
              fontWeight: activeTab === 'issues' ? 700 : 500,
              borderBottom: activeTab === 'issues' ? '2px solid var(--color-primary)' : '2px solid transparent',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            }}
          >
            Điểm cần lưu ý ({evaluation.issues.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'skills'}
            onClick={() => setActiveTab('skills')}
            className={`jw-btn jw-btn--sm ${activeTab === 'skills' ? 'jw-btn--secondary' : 'jw-btn--ghost'}`}
            style={{
              fontWeight: activeTab === 'skills' ? 700 : 500,
              borderBottom: activeTab === 'skills' ? '2px solid var(--color-primary)' : '2px solid transparent',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            }}
          >
            Biểu đồ năng lực & Điểm chi tiết
          </button>
          {vocabulary && vocabulary.length > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'vocab'}
              onClick={() => setActiveTab('vocab')}
              className={`jw-btn jw-btn--sm ${activeTab === 'vocab' ? 'jw-btn--secondary' : 'jw-btn--ghost'}`}
              style={{
                fontWeight: activeTab === 'vocab' ? 700 : 500,
                borderBottom: activeTab === 'vocab' ? '2px solid var(--color-primary)' : '2px solid transparent',
                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              }}
            >
              Từ vựng đáng học ({vocabulary.length})
            </button>
          )}
        </div>

        {/* Tab 1 Panel: Issues List */}
        <div style={activeTab === 'issues' ? {} : { position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
          <Card variant="subtle" style={{ border: '1px solid var(--glass-border)' }}>
            <CardContent>
              {evaluation.issues.length === 0 ? (
                <div style={{ padding: 'var(--space-md)', textAlign: 'center', color: 'var(--color-foreground-secondary)' }}>
                  <p style={{ fontWeight: 600, color: 'var(--color-success)', margin: '0 0 var(--space-xs)' }}>
                    Xuất sắc! Không phát hiện lỗi sai nào.
                  </p>
                  <p className="jw-text--sm jw-text--muted" style={{ margin: 0 }}>
                    Câu văn của bạn đã đạt chuẩn ngữ pháp và cách diễn đạt tự nhiên.
                  </p>
                </div>
              ) : (
                <IssueList
                  issues={evaluation.issues}
                  selectedIssueIndex={selectedIssueIndex}
                  onSelectIssue={setSelectedIssueIndex}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tab 2 Panel: Skills Breakdown & Radar */}
        <div style={activeTab === 'skills' ? {} : { position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
          <Card variant="subtle" style={{ border: '1px solid var(--glass-border)' }}>
            <CardContent>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 'var(--space-md)',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <CyberRadar skills={radarSkills} size={200} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 className="jw-card-eyebrow" style={{ margin: 0 }}>
                    Chấm điểm chi tiết từng chiều
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {DIMENSION_ORDER.map(({ key, label }) => (
                      <ProgressBar
                        key={key}
                        label={label}
                        value={scores[key]}
                        tone={scores[key] >= 80 ? 'success' : scores[key] >= 60 ? 'accent' : 'warning'}
                        size="sm"
                        showValue
                      />
                    ))}
                  </div>
                  {strengths.length > 0 && (
                    <p className="jw-text--caption jw-text--muted" style={{ margin: '6px 0 0' }}>
                      <strong>Điểm mạnh:</strong>{' '}
                      {strengths.map((dimension) => `${dimension.label} (${scores[dimension.key]})`).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
              {previousEvaluation && (
                <div style={{ marginTop: 'var(--space-md)', borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-sm)' }}>
                  <AttemptCompare previous={previousEvaluation} current={evaluation} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tab 3 Panel: Discovered Vocabulary */}
        {vocabulary !== null && (
          <div style={activeTab === 'vocab' ? {} : { position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
            <Card variant="subtle" style={{ border: '1px solid var(--glass-border)' }}>
              <CardContent>
                {vocabulary.length === 0 ? (
                  <p className="jw-text--muted jw-text--sm" style={{ margin: 'var(--space-md) 0', textAlign: 'center' }}>
                    Không phát hiện từ vựng mới trong bài làm này.
                  </p>
                ) : (
                  <div>
                    <h4 className="jw-card-eyebrow jw-mb-sm">✨ Từ vựng đáng học</h4>
                    <ul
                      className="jw-vocab-list jw-mb-md"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: '10px',
                      }}
                    >
                      {vocabulary.slice(0, 6).map((item) => (
                        <li key={item.id}>
                          <Card variant="subtle" style={{ height: '100%' }}>
                            <CardContent>
                              <div className="jw-inline jw-gap-xs jw-mb-xs">
                                <span className="jw-vocab-expression jw-jp-text" lang="ja">
                                  {item.expression}
                                </span>
                                {item.reading ? (
                                  <span className="jw-vocab-reading" style={{ fontSize: 'var(--text-body-sm)' }}>
                                    <FuriganaText text={item.expression} reading={item.reading} />
                                  </span>
                                ) : null}
                              </div>
                              <p className="jw-vocab-meaning" style={{ margin: '2px 0 4px', fontSize: '13px' }}>
                                {item.meaning_vi}
                              </p>
                              {item.example_sentence && (
                                <div
                                  className="jw-vocab-example jw-jp-text jw-text--caption"
                                  style={{ margin: 0, color: 'var(--color-foreground-secondary)' }}
                                >
                                  <FuriganaText text={item.example_sentence} />
                                </div>
                              )}
                              {item.learning_reason && (
                                <p className="jw-text--micro jw-text--muted" style={{ margin: '4px 0 0' }}>
                                  {item.learning_reason}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        </li>
                      ))}
                    </ul>
                    <Button href="/vocabulary" variant="ghost" size="sm">
                      Xem toàn bộ từ vựng →
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {actionError ? <Alert tone="error" className="jw-mt-md">{actionError}</Alert> : null}

      {/* TẦNG 4: FOOTER ACTIONS (PHÂN CẤP RÕ RÀNG) */}
      <div
        className="jw-result-actions jw-mt-lg"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-sm)',
          borderTop: '1px solid var(--color-border-subtle)',
          paddingTop: 'var(--space-md)',
        }}
      >
        <div className="jw-inline jw-gap-sm" style={{ flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={onRetry} icon="refresh">
            Thử lại
          </Button>
          <Button
            variant="ghost"
            href={`/rewrite-lab?text=${encodeURIComponent(evaluation.answer_text || '')}&context=${encodeURIComponent(exercise.prompt_vi || '')}`}
            aria-label="Tự sửa câu này trong Rewrite Lab"
            icon="edit"
          >
            Tự sửa trong Rewrite Lab
          </Button>
          <Button
            variant="ghost"
            href="/kanji"
            aria-label="Luyện viết Kanji trong bài"
            icon="practice"
          >
            Luyện Kanji
          </Button>
        </div>
        <div className="jw-inline jw-gap-sm">
          <Button
            variant="primary"
            onClick={onComplete}
            icon="check"
            style={{
              background: 'var(--grad-gold)',
              color: 'var(--color-on-accent)',
              fontWeight: 700,
              border: 'none',
              padding: '0 20px',
            }}
          >
            Hoàn thành
          </Button>
          {onNext && (
            <Button variant="ghost" onClick={onNext} disabled={nextPending} icon="arrow-right">
              {nextPending ? 'Đang tạo bài mới...' : 'Luyện câu tiếp theo'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
