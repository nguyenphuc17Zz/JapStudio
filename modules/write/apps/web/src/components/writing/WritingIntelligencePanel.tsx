import { useState, useEffect, useCallback } from 'react'
import { api } from '../../services/api'
import type {
  WritingIntelligenceSummary,
  WritingWeakness,
  WritingDiagnosisResult,
  BadgeTone,
} from '../../types/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Skeleton'
import { Tabs } from '../ui/Tabs'
import { Icon } from '../icons/Icon'
import { cx } from '../../lib/cx'

export interface WritingIntelligencePanelProps {
  className?: string
  initialSummary?: WritingIntelligenceSummary | null
  onWeaknessClick?: (weakness: WritingWeakness) => void
}

function categoryBadgeTone(category: string): BadgeTone {
  switch (category.toLowerCase()) {
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

function categoryLabel(cat: string): string {
  switch (cat.toLowerCase()) {
    case 'grammar':
      return 'Ngữ pháp'
    case 'lexicon':
    case 'vocabulary':
      return 'Từ vựng'
    case 'naturalness':
      return 'Độ tự nhiên'
    case 'register':
      return 'Văn phong'
    case 'discourse':
      return 'Bố cục & Mạch lạc'
    default:
      return cat
  }
}

function formatFocusItem(text: string): string {
  return text
    .replace(/^grammar:\s*/i, 'Ngữ pháp: ')
    .replace(/^lexicon:\s*/i, 'Từ vựng: ')
    .replace(/^vocabulary:\s*/i, 'Từ vựng: ')
    .replace(/^naturalness:\s*/i, 'Độ tự nhiên: ')
    .replace(/^register:\s*/i, 'Văn phong: ')
    .replace(/^discourse:\s*/i, 'Bố cục: ')
}

function statusBadgeInfo(status: string): { label: string; tone: BadgeTone; icon?: any } {
  switch (status) {
    case 'persistent':
      return { label: 'Dai dẳng', tone: 'error', icon: 'alert' }
    case 'recurring':
      return { label: 'Tái diễn', tone: 'warning', icon: 'refresh' }
    case 'improving':
      return { label: 'Đang tiến bộ', tone: 'accent', icon: 'trend-up' }
    case 'mastered':
      return { label: 'Đã làm chủ', tone: 'success', icon: 'check' }
    case 'regressed':
      return { label: 'Tái phát', tone: 'error', icon: 'alert' }
    default:
      return { label: 'Mới xuất hiện', tone: 'info', icon: 'sparkles' }
  }
}

export function WritingIntelligencePanel({
  className,
  initialSummary,
  onWeaknessClick,
}: WritingIntelligencePanelProps) {
  const [summary, setSummary] = useState<WritingIntelligenceSummary | null>(
    initialSummary || null,
  )
  const [loading, setLoading] = useState(!initialSummary)
  const [error, setError] = useState<string | null>(null)
  const [expandedWeaknessId, setExpandedWeaknessId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'top' | 'persistent' | 'improvements'>('top')

  // AI Diagnosis state
  const [diagnosing, setDiagnosing] = useState(false)
  const [diagnosis, setDiagnosis] = useState<WritingDiagnosisResult | null>(null)
  const [showDiagnosis, setShowDiagnosis] = useState(false)

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getWritingIntelligenceSummary()
      setSummary(data)
    } catch (err: any) {
      setError(err?.message || 'Không thể tải thông tin Writing Intelligence.')
    } finally {
      setLoading(false)
    }
  }, [])

  const runAiDiagnosis = async () => {
    try {
      setDiagnosing(true)
      setShowDiagnosis(true)
      const result = await api.diagnoseWritingIntelligence()
      setDiagnosis(result)
    } catch (err: any) {
      setError(err?.message || 'Không thể thực hiện chẩn đoán AI.')
    } finally {
      setDiagnosing(false)
    }
  }

  useEffect(() => {
    if (!initialSummary) {
      void fetchSummary()
    }
  }, [fetchSummary, initialSummary])

  const toggleExpand = (id: string) => {
    setExpandedWeaknessId((prev) => (prev === id ? null : id))
  }

  if (loading && !summary) {
    return (
      <Card className={cx('jw-dash-card--intelligence', className)}>
        <CardHeader
          title={
            <div className="jw-card-eyebrow-group">
              <span className="jw-card-eyebrow">Trí tuệ bài viết</span>
              <h3 className="jw-card-title">Writing Intelligence</h3>
            </div>
          }
        />
        <CardContent>
          <Skeleton variant="card" />
        </CardContent>
      </Card>
    )
  }

  if (error && !summary) {
    return (
      <Card className={cx('jw-dash-card--intelligence', className)}>
        <CardHeader
          title={
            <div className="jw-card-eyebrow-group">
              <span className="jw-card-eyebrow">Trí tuệ bài viết</span>
              <h3 className="jw-card-title">Writing Intelligence</h3>
            </div>
          }
        />
        <CardContent>
          <div className="jw-flex jw-items-center jw-flex-between jw-gap-sm">
            <span className="jw-text--danger jw-text--sm">{error}</span>
            <Button variant="ghost" size="sm" onClick={() => void fetchSummary()}>
              Thử lại
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const topRecurring = summary?.top_recurring || []
  const persistent = summary?.persistent || []
  const recentImprovements = summary?.recent_improvements || []
  const recommendedFocus = summary?.recommended_focus || []
  const activeCount = summary?.active_weaknesses_count ?? 0
  const masteryRate = Math.round((summary?.overall_mastery_rate ?? 0) * 100)

  const renderWeaknessList = (list: WritingWeakness[], emptyText: string) => {
    if (list.length === 0) {
      return <p className="jw-text--muted jw-text--sm jw-mt-sm">{emptyText}</p>
    }

    return (
      <div className="jw-intel-weakness-list jw-mt-sm">
        {list.map((weakness) => {
          const statusInfo = statusBadgeInfo(weakness.status)
          const isExpanded = expandedWeaknessId === weakness.id
          const masteryPercent = Math.round((weakness.mastery_score || 0) * 100)

          return (
            <div
              key={weakness.id}
              className={cx(
                'jw-intel-weakness-item',
                weakness.status === 'persistent' && 'jw-intel-weakness-item--persistent',
              )}
              onClick={() => {
                toggleExpand(weakness.id)
                if (onWeaknessClick) onWeaknessClick(weakness)
              }}
            >
              <div className="jw-flex jw-items-center jw-flex-between jw-gap-xs">
                <div className="jw-inline jw-gap-xs jw-items-center" style={{ flexWrap: 'wrap' }}>
                  <Badge tone={categoryBadgeTone(weakness.category)}>
                    {weakness.category.toUpperCase()}
                  </Badge>
                  <Badge tone={statusInfo.tone} icon={statusInfo.icon}>
                    {statusInfo.label}
                  </Badge>
                  {weakness.recurrence_count > 1 && (
                    <span className="jw-text--muted jw-text--xs font-mono">
                      x{weakness.recurrence_count} lần
                    </span>
                  )}
                </div>
                <div className="jw-inline jw-gap-xs jw-items-center jw-text--xs jw-text--muted">
                  <span>Làm chủ: {masteryPercent}%</span>
                  <Icon
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={12}
                  />
                </div>
              </div>

              <div className="jw-mt-xs">
                <strong className="jw-text--sm jw-text--primary block">
                  {weakness.subtype.replace(/_/g, ' ')}
                </strong>
                <p className="jw-text--secondary jw-text--xs jw-mt-xs">
                  {weakness.description}
                </p>
              </div>

              {/* Progress bar */}
              <div
                className="jw-mt-xs"
                style={{
                  height: 4,
                  background: 'var(--color-border-subtle)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${masteryPercent}%`,
                    height: '100%',
                    background:
                      masteryPercent >= 75
                        ? 'var(--color-success)'
                        : masteryPercent >= 40
                          ? 'var(--color-warning)'
                          : 'var(--color-danger)',
                    borderRadius: 2,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div
                  className="jw-mt-sm jw-pt-xs"
                  style={{
                    borderTop: '1px solid var(--color-border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-xs)',
                  }}
                >
                  {weakness.examples && weakness.examples.length > 0 && (
                    <div>
                      <span className="jw-text--muted jw-text--xs block jw-mb-xs">
                        Ví dụ thực tế đã gặp:
                      </span>
                      <div className="jw-flex jw-flex-col jw-gap-xs">
                        {weakness.examples.map((ex, i) => (
                          <div key={i} className="jw-intel-example-item">
                            {ex}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="jw-inline jw-gap-md jw-text--xs jw-text--muted jw-mt-xs">
                    {weakness.affected_registers?.length > 0 && (
                      <span>Văn phong: {weakness.affected_registers.join(', ')}</span>
                    )}
                    {weakness.affected_jlpt_levels?.length > 0 && (
                      <span>JLPT: {weakness.affected_jlpt_levels.join(', ')}</span>
                    )}
                    <span>Đã sửa đúng: {weakness.corrected_count} lần</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const tabItems = [
    {
      id: 'top',
      label: `Lặp lại nhiều (${topRecurring.length})`,
      content: renderWeaknessList(topRecurring, 'Chưa có điểm yếu lặp lại.'),
    },
    {
      id: 'persistent',
      label: `Dai dẳng (${persistent.length})`,
      content: renderWeaknessList(persistent, 'Không có điểm yếu dai dẳng nào.'),
    },
    {
      id: 'improvements',
      label: `Tiến bộ gần đây (${recentImprovements.length})`,
      content: renderWeaknessList(recentImprovements, 'Chưa có tiến bộ mới ghi nhận.'),
    },
  ]

  const hasAnyWeakness =
    topRecurring.length > 0 || persistent.length > 0 || recentImprovements.length > 0

  return (
    <Card className={cx('jw-dash-card--intelligence', className)}>
      <CardHeader
        title={
          <div className="jw-card-eyebrow-group">
            <span className="jw-card-eyebrow">Trí tuệ bài viết</span>
            <h3 className="jw-card-title">Writing Intelligence</h3>
          </div>
        }
        actions={
          <div className="jw-inline jw-gap-xs">
            <Button
              variant="primary"
              size="sm"
              icon="sparkles"
              loading={diagnosing}
              onClick={() => void runAiDiagnosis()}
            >
              {diagnosing ? 'Đang chẩn đoán...' : 'AI Chẩn đoán'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon="refresh"
              loading={loading}
              onClick={() => void fetchSummary()}
              aria-label="Làm mới phân tích"
            />
          </div>
        }
      />

      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* AI Diagnosis box */}
        {showDiagnosis && (
          <div className="jw-intel-ai-box">
            <div className="jw-intel-ai-header">
              <div className="jw-intel-ai-title">
                <span className="jw-text--accent">
                  <Icon name="sparkles" size={16} />
                </span>
                <span>Báo Cáo Chẩn Đoán AI (Root-Cause Diagnosis)</span>
                {diagnosis?.estimated_writing_level && (
                  <Badge tone="accent">JLPT {diagnosis.estimated_writing_level}</Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDiagnosis(false)}
              >
                Đóng
              </Button>
            </div>

            {diagnosing ? (
              <div className="jw-p-md jw-text-center">
                <Skeleton variant="card" />
              </div>
            ) : diagnosis ? (
              <div className="jw-flex jw-flex-col jw-gap-sm">
                {/* Executive Assessment */}
                <div className="jw-intel-overview-card">
                  <span className="jw-card-eyebrow" style={{ color: 'var(--color-accent)' }}>
                    Nhận định tổng quan
                  </span>
                  <p className="jw-text--primary jw-text--sm jw-mt-xs" style={{ lineHeight: 1.6 }}>
                    {diagnosis.overall_assessment_vi}
                  </p>
                  {diagnosis.strengths_assessment_vi && (
                    <p className="jw-text--secondary jw-text--xs jw-mt-xs">
                      ✨ <strong className="jw-text--success">Điểm sáng:</strong> {diagnosis.strengths_assessment_vi}
                    </p>
                  )}
                </div>

                {/* Root Causes breakdown */}
                {diagnosis.root_causes && diagnosis.root_causes.length > 0 && (
                  <div className="jw-flex jw-flex-col jw-gap-xs">
                    <span className="jw-card-eyebrow">
                      Phân tích nguyên nhân gốc rễ & Mẫu câu đối chiếu
                    </span>
                    {diagnosis.root_causes.map((rc, idx) => (
                      <div key={idx} className="jw-intel-root-card">
                        <div className="jw-flex jw-items-center jw-flex-between">
                          <div className="jw-inline jw-gap-xs jw-items-center">
                            <Badge tone={categoryBadgeTone(rc.category)}>
                              {rc.category.toUpperCase()}
                            </Badge>
                            <strong className="jw-text--sm jw-text--primary">
                              {rc.subtype.replace(/_/g, ' ')}
                            </strong>
                          </div>
                        </div>

                        <p className="jw-text--secondary jw-text--xs jw-mt-xs">
                          {rc.root_cause_vi}
                        </p>

                        <div className="jw-text--accent jw-text--xs jw-mt-xs font-medium">
                          💡 {rc.japanese_pattern_tip}
                        </div>

                        {rc.example_bad_vs_good && (
                          <div className="jw-mt-xs">
                            {rc.example_bad_vs_good.includes('->') || rc.example_bad_vs_good.includes('→') ? (
                              <div className="jw-intel-contrast-grid">
                                <div className="jw-intel-contrast-bad">
                                  {rc.example_bad_vs_good.split(/->|→/)[0]?.trim()}
                                </div>
                                <div className="jw-intel-contrast-good">
                                  {rc.example_bad_vs_good.split(/->|→/)[1]?.trim()}
                                </div>
                              </div>
                            ) : (
                              <div className="jw-intel-contrast-box">
                                {rc.example_bad_vs_good}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Plan */}
                {diagnosis.action_plan_vi && diagnosis.action_plan_vi.length > 0 && (
                  <div className="jw-intel-plan-box">
                    <span className="jw-card-eyebrow" style={{ color: 'var(--color-success)' }}>
                      Kế hoạch cải thiện cụ thể
                    </span>
                    <div className="jw-flex jw-flex-col jw-gap-xs jw-mt-xs">
                      {diagnosis.action_plan_vi.map((step, sIdx) => (
                        <div key={sIdx} className="jw-intel-step-item">
                          <span className="jw-intel-step-num">{sIdx + 1}</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Grammar Focus */}
                {diagnosis.recommended_grammar_focus && diagnosis.recommended_grammar_focus.length > 0 && (
                  <div className="jw-mt-xs">
                    <span className="jw-card-eyebrow">Ngữ pháp trọng tâm gợi ý</span>
                    <div className="jw-inline jw-gap-xs jw-mt-xs" style={{ flexWrap: 'wrap' }}>
                      {diagnosis.recommended_grammar_focus.map((point, pIdx) => (
                        <span key={pIdx} className="jw-intel-grammar-pill">
                          {point}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Encouragement */}
                {diagnosis.encouragement_vi && (
                  <p className="jw-text--muted jw-text--xs text-center jw-mt-xs" style={{ fontStyle: 'italic', margin: '4px 0 0' }}>
                    "{diagnosis.encouragement_vi}"
                  </p>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Stats row */}
        <div className="jw-intel-stats">
          <div className="jw-intel-stat-item">
            <span className="jw-intel-stat-label">Lỗi theo dõi</span>
            <span className="jw-intel-stat-value">{activeCount}</span>
          </div>
          <div className="jw-intel-stat-item">
            <span className="jw-intel-stat-label">Tỷ lệ làm chủ</span>
            <span className="jw-intel-stat-value jw-text--success">{masteryRate}%</span>
          </div>
          <div className="jw-intel-stat-item">
            <span className="jw-intel-stat-label">Trọng tâm yếu</span>
            <span className="jw-intel-stat-value jw-text--danger jw-text--sm truncate">
              {summary?.weakest_dimensions?.length
                ? summary.weakest_dimensions.map(categoryLabel).join(', ')
                : 'Chưa có'}
            </span>
          </div>
        </div>

        {/* Recommended Focus */}
        {recommendedFocus.length > 0 && (
          <div className="jw-intel-rec-box">
            <div className="jw-inline jw-gap-xs jw-items-center jw-text--warning jw-text--xs" style={{ fontWeight: 600 }}>
              <Icon name="target" size={14} />
              <span>Gợi ý ưu tiên khắc phục</span>
            </div>
            <ul className="jw-flex jw-flex-col jw-gap-xs jw-text--xs jw-text--secondary" style={{ margin: 0, paddingLeft: 16 }}>
              {recommendedFocus.map((focus, idx) => (
                <li key={idx}>
                  <span>{formatFocusItem(focus)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weakness Tabs */}
        {!hasAnyWeakness ? (
          <div
            className="jw-text-center jw-p-md"
            style={{
              background: 'var(--color-surface-sunken)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--color-border-default)',
            }}
          >
            <div className="jw-text--success jw-mb-xs">
              <Icon name="check" size={24} />
            </div>
            <p className="jw-text--primary jw-text--sm" style={{ fontWeight: 600, margin: 0 }}>
              Chưa ghi nhận điểm yếu tái diễn
            </p>
            <p className="jw-text--muted jw-text--xs jw-mt-xs" style={{ margin: '4px 0 0' }}>
              Hãy tiếp tục luyện tập các bài viết, hệ thống sẽ tự động phân tích và tổng hợp điểm yếu của bạn.
            </p>
          </div>
        ) : (
          <Tabs
            variant="pills"
            items={tabItems}
            value={activeTab}
            onChange={(val) => setActiveTab(val as any)}
          />
        )}
      </CardContent>
    </Card>
  )
}
