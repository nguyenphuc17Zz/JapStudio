import { useCallback, useState } from 'react'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { PageHeader } from '../components/layout/PageHeader'
import { PageContainer } from '../components/layout/PageContainer'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/Progress'
import { Select } from '../components/ui/Select'
import { AIInsight } from '../components/ai/AIInsight'
import { AIModelPicker } from '../components/ai/AIModelPicker'
import { useAIProvider } from '../context/AIProviderContext'
import { Icon } from '../components/icons/Icon'
import { api } from '../services/api'
import {
  GOAL_TYPE_LABELS_VI,
  MASTERY_STATE_LABELS_VI,
} from '../types/api'
import { useAsync } from '../hooks/useAsync'

const GOAL_TYPES = Object.keys(GOAL_TYPE_LABELS_VI)

function statusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Đang thực hiện'
    case 'completed':
      return 'Hoàn thành'
    case 'locked':
      return 'Chưa mở khóa'
    case 'skipped':
      return 'Đã bỏ qua'
    default:
      return status
  }
}

function statusTone(status: string): 'accent' | 'success' | 'neutral' | 'warning' {
  switch (status) {
    case 'active':
      return 'accent'
    case 'completed':
      return 'success'
    case 'locked':
      return 'neutral'
    case 'skipped':
      return 'warning'
    default:
      return 'neutral'
  }
}

function MasteryBadge({ objectiveId }: { objectiveId: string }) {
  const explanation = useAsync(
    useCallback(() => api.getObjectiveExplanation(objectiveId), [objectiveId]),
  )
  if (explanation.data === null) return null
  return (
    <div className="jw-mt-xs">
      <AIInsight
        title="Đánh giá năng lực"
        description={explanation.data.summary_vi}
      />
    </div>
  )
}

export default function JourneyPage() {
  const { selectedProvider, selectedModel } = useAIProvider()
  const journey = useAsync(useCallback(() => api.getJourneyStatus(), []))
  const [creating, setCreating] = useState(false)
  const [goalType, setGoalType] = useState<string>('general')
  const [error, setError] = useState<string | null>(null)

  const createJourney = useCallback(
    async (regenerate: boolean) => {
      setCreating(true)
      setError(null)
      try {
        await api.createJourney({
          goal_type: goalType,
          force_regenerate: regenerate,
          ...(selectedProvider ? { provider: selectedProvider } : {}),
          ...(selectedModel ? { model: selectedModel } : {}),
        })
        await journey.run()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tạo lộ trình')
      } finally {
        setCreating(false)
      }
    },
    [goalType, journey, selectedProvider, selectedModel],
  )

  const status =
    journey.data && Array.isArray(journey.data.milestones) && Array.isArray(journey.data.objectives)
      ? journey.data
      : null

  return (
    <PageContainer size="default">
      <PageHeader
        title="Lộ trình học tập"
        description="Mục tiêu dài hạn → các giai đoạn → từng mục tiêu luyện tập cụ thể."
      />

      {journey.loading ? (
        <LoadingSpinner label="Đang tải lộ trình..." />
      ) : status === null ? (
        <Card className="jw-mb-lg">
          <CardHeader title="Bắt đầu một lộ trình học" />
          <CardContent>
            <p className="jw-text--muted jw-text--sm jw-mb-md">
              Chọn mục tiêu dài hạn của bạn; hệ thống sẽ xây dựng lộ trình các giai đoạn
              với từng mục tiêu luyện tập cụ thể.
            </p>

            {/* Visual Goal Selection Cards Grid */}
            <div className="jw-mb-md">
              <span className="jw-text--label jw-text--muted jw-mb-xs" style={{ display: 'block' }}>
                Chọn mục tiêu học tập
              </span>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 'var(--space-xs)',
                  marginBottom: 'var(--space-sm)',
                }}
              >
                {GOAL_TYPES.map((goal) => {
                  const isSelected = goalType === goal
                  return (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => setGoalType(goal)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: isSelected
                          ? 'var(--color-surface-selected)'
                          : 'var(--color-surface-subtle)',
                        border: isSelected
                          ? '1px solid var(--color-accent)'
                          : '1px solid var(--color-border-subtle)',
                        color: isSelected ? 'var(--color-foreground)' : 'var(--color-foreground-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 'var(--radius-full)',
                          background: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: isSelected ? 700 : 500 }}>
                        {GOAL_TYPE_LABELS_VI[goal]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="jw-mb-md" style={{ maxWidth: 360 }}>
              <Select
                id="journey-goal"
                label="Mục tiêu (Danh sách)"
                value={goalType}
                onChange={(event) => setGoalType(event.target.value)}
              >
                {GOAL_TYPES.map((goal) => (
                  <option key={goal} value={goal}>
                    {GOAL_TYPE_LABELS_VI[goal]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="jw-mb-md">
              <AIModelPicker variant="inline" label="Mô hình AI xây dựng lộ trình" />
            </div>
            {error && <Alert tone="error" className="jw-mb-md">{error}</Alert>}
            <Button
              onClick={() => void createJourney(false)}
              loading={creating}
              icon="journey"
            >
              Tạo lộ trình
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="jw-journey-page">
          {/* Summary card */}
          <Card className="jw-mb-lg">
            <CardContent>
              <div className="jw-inline jw-gap-md jw-mb-sm" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Badge tone="info" className="jw-mb-xs">
                    {GOAL_TYPE_LABELS_VI[status.goal_type] ?? status.goal_type}
                  </Badge>
                  <h2 className="jw-text--lg" style={{ fontWeight: 600 }}>
                    {status.goal ?? status.title ?? 'Lộ trình học tiếng Nhật'}
                  </h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="jw-text--lg jw-text--accent" style={{ fontWeight: 700 }}>
                    {status.progress}%
                  </span>
                  <span className="jw-text--caption jw-text--muted" style={{ display: 'block' }}>
                    tổng thể
                  </span>
                </div>
              </div>

              <ProgressBar
                value={status.progress}
                tone="accent"
                size="md"
                className="jw-mb-md"
                aria-label={`Tiến độ lộ trình: ${status.progress}%`}
              />

              {status.explanation && (
                <p className="jw-text--sm jw-text--muted jw-mb-md">{status.explanation}</p>
              )}

              <div className="jw-inline jw-gap-md jw-mb-md" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 200, flex: 1 }}>
                  <Select
                    id="journey-goal-edit"
                    label="Đổi mục tiêu"
                    value={goalType}
                    onChange={(event) => setGoalType(event.target.value)}
                  >
                    {GOAL_TYPES.map((goal) => (
                      <option key={goal} value={goal}>
                        {GOAL_TYPE_LABELS_VI[goal]}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => void createJourney(true)}
                  loading={creating}
                  icon="refresh"
                >
                  Tạo lại lộ trình
                </Button>
              </div>
              <AIModelPicker variant="inline" label="Mô hình AI xây dựng lại lộ trình" />
              {error && <Alert tone="error" className="jw-mt-md">{error}</Alert>}
            </CardContent>
          </Card>

          {/* Milestones roadmap */}
          <div className="jw-journey-milestones jw-mb-lg">
            {status.milestones.map((milestone) => {
              const milestoneObjectives = status.objectives.filter(
                (objective) => objective.milestone_id === milestone.id,
              )
              return (
                <Card key={milestone.id} className="jw-mb-md">
                  <CardContent>
                    <div className="jw-inline jw-gap-sm jw-mb-xs" style={{ justifyContent: 'space-between' }}>
                      <div className="jw-inline jw-gap-xs">
                        <Badge tone="neutral">Giai đoạn {milestone.position}</Badge>
                        <Badge tone={statusTone(milestone.status)}>
                          {statusLabel(milestone.status)}
                        </Badge>
                      </div>
                    </div>
                    <h3 className="jw-text--body jw-mb-xs" style={{ fontWeight: 600 }}>
                      {milestone.title}
                    </h3>
                    <p className="jw-text--sm jw-text--muted jw-mb-md">{milestone.description}</p>

                    {/* Objectives list */}
                    <div className="jw-journey-objectives">
                      {milestoneObjectives.map((objective) => {
                        const progress = status.objectives_progress[objective.id]
                        const masteryLabel = progress
                          ? (MASTERY_STATE_LABELS_VI[progress.mastery_state] ??
                            progress.mastery_state)
                          : 'Chưa bắt đầu'
                        const isCurrent = objective.id === status.current_objective_id

                        return (
                          <div
                            key={objective.id}
                            className={`jw-journey-objective ${isCurrent ? 'jw-journey-objective--current' : ''} ${objective.status === 'locked' ? 'jw-journey-objective--locked' : ''}`}
                          >
                            <div className="jw-journey-objective-head">
                              <div className="jw-journey-objective-num">
                                {objective.status === 'completed' ? (
                                  <Icon name="check" size={14} />
                                ) : objective.status === 'locked' ? (
                                  <Icon name="lock" size={14} />
                                ) : (
                                  objective.position
                                )}
                              </div>
                              <div className="jw-journey-objective-info">
                                <div className="jw-inline jw-gap-xs jw-mb-xs">
                                  <strong className="jw-text--body-sm">{objective.title}</strong>
                                  {isCurrent && (
                                    <Badge tone="accent">đang luyện</Badge>
                                  )}
                                  <Badge tone={statusTone(objective.status)}>
                                    {statusLabel(objective.status)}
                                  </Badge>
                                </div>
                                <div className="jw-text--caption jw-text--muted">
                                  {objective.target_competencies.join(', ')}
                                </div>
                              </div>
                              {progress && (
                                <div className="jw-journey-objective-score-block">
                                  <span className="jw-text--body-sm jw-text--accent" style={{ fontWeight: 600 }}>
                                    {progress.average_score}/100
                                  </span>
                                  <span className="jw-text--caption jw-text--muted">
                                    {masteryLabel}
                                  </span>
                                </div>
                              )}
                            </div>

                            {progress && (
                              <ProgressBar
                                value={progress.average_score}
                                tone={progress.average_score >= 80 ? 'success' : 'accent'}
                                size="sm"
                                className="jw-mt-xs"
                                aria-label={`Điểm trung bình mục tiêu: ${progress.average_score}/100`}
                              />
                            )}

                            {objective.status === 'active' && (
                              <MasteryBadge objectiveId={objective.id} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* CTA card */}
          <Card variant="ai" className="jw-mb-lg">
            <CardContent>
              <div className="jw-inline jw-gap-md" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 className="jw-text--body" style={{ fontWeight: 600, marginBottom: 4 }}>
                    Luyện tập mục tiêu hiện tại
                  </h3>
                  <p className="jw-text--sm jw-text--muted">
                    Bài tập được gợi ý sẽ luôn hướng về mục tiêu lộ trình đang luyện.
                  </p>
                </div>
                <Button href="/practice" variant="primary" size="md" icon="practice">
                  Đi luyện tập ngay
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  )
}