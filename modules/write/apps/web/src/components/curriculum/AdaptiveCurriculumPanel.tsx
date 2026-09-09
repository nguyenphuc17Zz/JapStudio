import React, { useState, useEffect, useCallback } from 'react'
import type {
  DailyPlan,
  PlanTask,
  RankedWeakness,
  SessionDoneResult,
} from '../../types/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge, type BadgeTone } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { Alert } from '../ui/Alert'
import { Icon, type IconName } from '../icons/Icon'
import { api } from '../../services/api'
import { sound } from '../../services/sound'
import { cx } from '../../lib/cx'

interface AdaptiveCurriculumPanelProps {
  onStartDrill?: (weaknessId?: string, category?: string, subtype?: string) => void
  onStartRewrite?: (snippet?: string, category?: string) => void
}

const TASK_TYPE_LABELS: Record<string, { label: string; tone: BadgeTone; icon: IconName }> = {
  targeted_drill: { label: 'Luyện trọng điểm', tone: 'error', icon: 'target' },
  self_correction: { label: 'Tự sửa lỗi', tone: 'warning', icon: 'edit' },
  real_world_writing: { label: 'Nhiệm vụ thực tế', tone: 'accent', icon: 'briefcase' },
  transfer_retest: { label: 'Kiểm tra chuyển ngữ cảnh', tone: 'info', icon: 'zap' },
  exploration: { label: 'Khám phá tự do', tone: 'success', icon: 'sparkles' },
}

const CONTEXT_LABELS: Record<string, { label: string; icon: IconName }> = {
  sentence: { label: 'Câu đơn', icon: 'write' },
  rewrite: { label: 'Viết lại', icon: 'edit' },
  casual: { label: 'Thân mật', icon: 'quote' },
  polite: { label: 'Lịch sự (Desu/Masu)', icon: 'check' },
  business: { label: 'Thương mại (Keigo)', icon: 'briefcase' },
  paragraph: { label: 'Đoạn văn', icon: 'journey' },
  free_writing: { label: 'Viết tự do', icon: 'write' },
  real_world_mission: { label: 'Nhiệm vụ thực tế', icon: 'target' },
}

export const AdaptiveCurriculumPanel: React.FC<AdaptiveCurriculumPanelProps> = ({
  onStartDrill,
  onStartRewrite,
}) => {
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [priorities, setPriorities] = useState<RankedWeakness[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Session tracking
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set())
  const [submittingSession, setSubmittingSession] = useState(false)
  const [sessionDebrief, setSessionDebrief] = useState<string | null>(null)
  const [sessionCompletedCount, setSessionCompletedCount] = useState<number | null>(null)

  // Sub tab: 'plan' | 'priorities'
  const [activeTab, setActiveTab] = useState<'plan' | 'priorities'>('plan')

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      const [planRes, priRes] = await Promise.all([
        api.getCurriculumDailyPlan({ enrich: true }),
        api.getCurriculumPriorities({ enrich: true, limit: 8 }),
      ])
      setPlan(planRes)
      setPriorities(priRes.items)
    } catch (err: unknown) {
      console.error('Failed to load adaptive curriculum data:', err)
      setError(err instanceof Error ? err.message : 'Không thể tải kế hoạch học tập.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const toggleTaskCompletion = (taskId: string) => {
    setCompletedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
        sound.playXpGain()
      }
      return next
    })
  }

  const handleFinishSession = async () => {
    if (completedTaskIds.size === 0) return
    setSubmittingSession(true)
    try {
      const res: SessionDoneResult = await api.markCurriculumSessionDone(
        { completed_task_ids: Array.from(completedTaskIds) },
        { enrich: true }
      )
      setSessionDebrief(res.session_debrief || 'Phiên học đã được ghi nhận thành công!')
      setSessionCompletedCount(res.completed_count)
      sound.playLevelUp()
      // Refresh data to reflect context rotation advances
      void loadData(true)
    } catch (err: unknown) {
      console.error('Failed to complete curriculum session:', err)
      setError(err instanceof Error ? err.message : 'Không thể ghi nhận kết quả phiên học.')
    } finally {
      setSubmittingSession(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl) 0' }}>
        <Spinner size={28} label="Đang phân tích điểm yếu & tạo kế hoạch 70/20/10..." />
      </div>
    )
  }

  const persistentCount = plan?.bucket_breakdown.persistent ?? 0
  const reinforcementCount = plan?.bucket_breakdown.reinforcement ?? 0
  const explorationCount = plan?.bucket_breakdown.exploration ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {error && (
        <Alert tone="error" title="Lỗi nạp dữ liệu">
          {error}
        </Alert>
      )}

      {/* Overview & Navigation Header */}
      <Card variant="default">
        <CardContent>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 'var(--space-md)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 'var(--text-title)',
                    fontWeight: 700,
                    color: 'var(--color-foreground)',
                  }}
                >
                  Chương trình Viết Thích nghi 2.0
                </h3>
                {plan?.enriched && (
                  <Badge tone="ai" icon="sparkles">
                    AI Cá nhân hoá
                  </Badge>
                )}
              </div>
              <p
                style={{
                  margin: 'var(--space-xs) 0 0',
                  fontSize: 'var(--text-body-sm)',
                  color: 'var(--color-foreground-secondary)',
                }}
              >
                Kế hoạch học tập dựa trên 8 tín hiệu ưu tiên thực tế và triết lý phân bổ 70/20/10.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <Button
                variant={activeTab === 'plan' ? 'primary' : 'ghost'}
                size="sm"
                icon="journey"
                onClick={() => setActiveTab('plan')}
              >
                Kế hoạch hôm nay ({plan?.tasks.length ?? 0})
              </Button>
              <Button
                variant={activeTab === 'priorities' ? 'primary' : 'ghost'}
                size="sm"
                icon="target"
                onClick={() => setActiveTab('priorities')}
              >
                Bảng ưu tiên ({priorities.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon="refresh"
                loading={refreshing}
                onClick={() => void loadData(true)}
                title="Tạo lại kế hoạch"
              />
            </div>
          </div>

          {/* Allocation Philosophy Badges */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--space-sm)',
              marginTop: 'var(--space-md)',
              paddingTop: 'var(--space-sm)',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <Badge tone="error" icon="target">
              70% Điểm yếu dai dẳng ({persistentCount} bài)
            </Badge>
            <Badge tone="accent" icon="zap">
              20% Củng cố ({reinforcementCount} bài)
            </Badge>
            <Badge tone="success" icon="sparkles">
              10% Khám phá viết ({explorationCount} bài)
            </Badge>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 'var(--text-caption)',
                color: 'var(--color-foreground-muted)',
                alignSelf: 'center',
              }}
            >
              Ngày lập: {plan?.plan_date}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Post-Session Debrief Celebration */}
      {sessionDebrief && (
        <Card variant="ai">
          <CardHeader
            title={`🎉 Tổng kết phiên học (+${sessionCompletedCount ?? 0} nhiệm vụ)`}
            actions={
              <Button variant="ghost" size="sm" icon="x" onClick={() => setSessionDebrief(null)}>
                Đóng
              </Button>
            }
          />
          <CardContent>
            <p
              style={{
                margin: 0,
                fontSize: 'var(--text-body-sm)',
                lineHeight: 1.6,
                color: 'var(--color-foreground)',
              }}
            >
              {sessionDebrief}
            </p>
          </CardContent>
        </Card>
      )}

      {/* TAB 1: DAILY PLAN */}
      {activeTab === 'plan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 'var(--space-md)',
            }}
          >
            {plan?.tasks.map((task: PlanTask, index: number) => {
              const isDone = completedTaskIds.has(task.task_id)
              const typeConfig = TASK_TYPE_LABELS[task.task_type] || {
                label: task.task_type,
                tone: 'neutral' as BadgeTone,
                icon: 'write' as IconName,
              }
              const contextConfig = CONTEXT_LABELS[task.context_type] || {
                label: task.context_type,
                icon: 'write' as IconName,
              }

              return (
                <Card
                  key={task.task_id}
                  variant={isDone ? 'default' : 'elevated'}
                  className={cx(isDone && 'opacity-70')}
                  style={{
                    borderLeft: isDone
                      ? '4px solid var(--color-success)'
                      : `4px solid var(--color-${typeConfig.tone})`,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <CardHeader
                    title={`Nhiệm vụ #${index + 1}`}
                    description={
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 'var(--space-xs)',
                          marginTop: 'var(--space-2xs)',
                        }}
                      >
                        <Badge tone={typeConfig.tone} icon={typeConfig.icon}>
                          {typeConfig.label}
                        </Badge>
                        <Badge tone="neutral" icon={contextConfig.icon}>
                          {contextConfig.label}
                        </Badge>
                        {task.register && (
                          <Badge tone="register">
                            {task.register}
                          </Badge>
                        )}
                      </div>
                    }
                    actions={
                      <Button
                        variant={isDone ? 'primary' : 'secondary'}
                        size="sm"
                        icon={isDone ? 'check' : 'zap'}
                        onClick={() => toggleTaskCompletion(task.task_id)}
                      >
                        {isDone ? 'Đã xong' : 'Đánh dấu xong'}
                      </Button>
                    }
                  />
                  <CardContent>
                    <div
                      style={{
                        padding: 'var(--space-sm)',
                        background: 'var(--color-surface-subtle)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-sm)',
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 'var(--text-body-sm)',
                          fontWeight: 600,
                          color: 'var(--color-foreground)',
                          lineHeight: 1.5,
                        }}
                      >
                        {task.task_description}
                      </p>
                    </div>

                    {/* Reason Chip */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 'var(--space-xs)',
                        fontSize: 'var(--text-caption)',
                        color: 'var(--color-foreground-secondary)',
                        fontStyle: 'italic',
                      }}
                    >
                      <Icon name="info" size={14} className="mt-0.5 shrink-0" />
                      <span>{task.reason}</span>
                    </div>

                    {/* Actions */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 'var(--space-xs)',
                        marginTop: 'var(--space-md)',
                      }}
                    >
                      {task.task_type === 'self_correction' && onStartRewrite ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon="edit"
                          onClick={() => onStartRewrite(undefined, task.category || undefined)}
                        >
                          Mở Rewrite Lab
                        </Button>
                      ) : onStartDrill ? (
                        <Button
                          variant="primary"
                          size="sm"
                          icon="write"
                          onClick={() =>
                            onStartDrill(
                              task.weakness_id || undefined,
                              task.category || undefined,
                              task.subtype || undefined
                            )
                          }
                        >
                          Bắt đầu luyện
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Session completion button */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--space-md)',
              background: 'var(--color-surface-subtle)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              marginTop: 'var(--space-sm)',
            }}
          >
            <div>
              <span style={{ fontWeight: 600, fontSize: 'var(--text-body-sm)' }}>
                Tiến độ phiên hôm nay:{' '}
              </span>
              <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                {completedTaskIds.size} / {plan?.tasks.length ?? 0} nhiệm vụ
              </span>
            </div>

            <Button
              variant="primary"
              size="md"
              icon="trophy"
              disabled={completedTaskIds.size === 0 || submittingSession}
              loading={submittingSession}
              onClick={() => void handleFinishSession()}
            >
              Hoàn thành & Nhận Đánh giá Phiên
            </Button>
          </div>
        </div>
      )}

      {/* TAB 2: WRITING PRIORITY ENGINE RANKINGS */}
      {activeTab === 'priorities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <Card variant="default">
            <CardHeader
              title="Xếp hạng Ưu tiên Điểm yếu (8 Tín hiệu Đa chiều)"
              description="Điểm số được tính toán dựa trên mức độ nghiêm trọng, tần suất tái diễn, thất bại chuyển ngữ cảnh, tác động văn phong và mục tiêu học viên."
            />
            <CardContent>
              {priorities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-xl) 0' }}>
                  <p style={{ color: 'var(--color-foreground-secondary)' }}>
                    Chưa có đủ dữ liệu điểm yếu để tính toán thứ tự ưu tiên.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {priorities.map((item: RankedWeakness, rankIndex: number) => {
                    const ctx = CONTEXT_LABELS[item.next_context_type] || {
                      label: item.next_context_type,
                      icon: 'write' as IconName,
                    }

                    return (
                      <div
                        key={item.weakness_id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--space-xs)',
                          padding: 'var(--space-md)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-sm)',
                            }}
                          >
                            <span
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: 'var(--color-primary)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 'var(--text-caption)',
                                fontWeight: 700,
                              }}
                            >
                              #{rankIndex + 1}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: 'var(--text-body-sm)' }}>
                              {item.description}
                            </span>
                            <Badge tone="neutral">{item.category}</Badge>
                            <Badge tone={item.severity === 'critical' ? 'error' : 'warning'}>
                              {item.severity}
                            </Badge>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-md)',
                            }}
                          >
                            <div style={{ textAlign: 'right' }}>
                              <span
                                style={{
                                  fontSize: 'var(--text-title)',
                                  fontWeight: 800,
                                  color: 'var(--color-primary)',
                                }}
                              >
                                {item.priority_score.toFixed(1)}
                              </span>
                              <span
                                style={{
                                  fontSize: 'var(--text-micro)',
                                  color: 'var(--color-foreground-muted)',
                                }}
                              >
                                /100
                              </span>
                            </div>
                            {onStartDrill && (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon="write"
                                onClick={() =>
                                  onStartDrill(item.weakness_id, item.category, item.subtype)
                                }
                              >
                                Luyện
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Priority Score Bar */}
                        <div
                          style={{
                            width: '100%',
                            height: '6px',
                            background: 'var(--color-surface-subtle)',
                            borderRadius: 'var(--radius-full)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(item.priority_score, 100)}%`,
                              height: '100%',
                              background:
                                item.priority_score > 70
                                  ? 'var(--color-error)'
                                  : item.priority_score > 40
                                    ? 'var(--color-warning)'
                                    : 'var(--color-accent)',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>

                        {/* Rotation & Explanation Row */}
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 'var(--space-sm)',
                            marginTop: 'var(--space-xs)',
                          }}
                        >
                          <span
                            style={{
                              fontSize: 'var(--text-caption)',
                              color: 'var(--color-foreground-secondary)',
                            }}
                          >
                            💡 {item.priority_reason}
                          </span>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-xs)',
                            }}
                          >
                            <span
                              style={{
                                fontSize: 'var(--text-micro)',
                                color: 'var(--color-foreground-muted)',
                              }}
                            >
                              Ngữ cảnh tiếp theo:
                            </span>
                            <Badge tone="info" icon={ctx.icon}>
                              {ctx.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
