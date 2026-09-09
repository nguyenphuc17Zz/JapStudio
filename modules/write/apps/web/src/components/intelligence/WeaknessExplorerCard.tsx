import { useState } from 'react'
import type { WritingWeakness } from '../../types/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Input } from '../ui/Input'
import { Tabs } from '../ui/Tabs'
import { Skeleton } from '../ui/Skeleton'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Icon } from '../icons/Icon'
import { cx } from '../../lib/cx'
import { categoryBadgeTone, lifecycleBadgeInfo } from './intelligenceConstants'

interface WeaknessExplorerCardProps {
  weaknesses: WritingWeakness[]
  filteredWeaknesses: WritingWeakness[]
  dueRetestsCount: number
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedStatusTab: string
  onSelectStatusTab: (tab: string) => void
  loading: boolean
  expandedWeaknessId: string | null
  onToggleExpand: (id: string) => void
  displayLimit: number
  onLoadMore: () => void
  onStartDrill: (weaknessId: string) => void
}

export function WeaknessExplorerCard({
  weaknesses,
  filteredWeaknesses,
  dueRetestsCount,
  searchQuery,
  onSearchChange,
  selectedStatusTab,
  onSelectStatusTab,
  loading,
  expandedWeaknessId,
  onToggleExpand,
  displayLimit,
  onLoadMore,
  onStartDrill,
}: WeaknessExplorerCardProps) {
  const [copiedExampleIndex, setCopiedExampleIndex] = useState<string | null>(null)

  const handleCopyExampleText = (text: string, key: string) => {
    const cleanText = text.replace(/^[⭕❌\s]+/, '').trim()
    void navigator.clipboard.writeText(cleanText)
    setCopiedExampleIndex(key)
    setTimeout(() => setCopiedExampleIndex(null), 2000)
  }

  return (
    <Card>
      <CardHeader
        title={
          <div className="jw-card-header-title">
            <div className="jw-card-eyebrow-group">
              <span className="jw-card-eyebrow">WEAKNESS EXPLORER</span>
              <h3 className="jw-card-title">
                Danh Sách Điểm Yếu & Vòng Đời Làm Chủ ({filteredWeaknesses.length})
              </h3>
            </div>
          </div>
        }
        actions={
          <div className="jw-inline jw-gap-xs jw-items-center">
            <Input
              aria-label="Tìm kiếm điểm yếu"
              placeholder="Tìm kiếm điểm yếu, trợ từ, lỗi..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ width: 220 }}
            />
          </div>
        }
      />

      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* Status / Lifecycle Tabs */}
        <div className="jw-flex jw-items-center jw-flex-between jw-gap-sm" style={{ flexWrap: 'wrap' }}>
          <Tabs
            variant="pills"
            items={[
              { id: 'all', label: `Tất cả (${weaknesses.length})` },
              { id: 'retests', label: `Ôn tập đến hạn (${dueRetestsCount})` },
              {
                id: 'recurring',
                label: `Tái diễn (${
                  weaknesses.filter(
                    (w) =>
                      w.lifecycle_state === 'recurring' ||
                      w.lifecycle_state === 'recurrent' ||
                      w.recurrence_count >= 2,
                  ).length
                })`,
              },
              {
                id: 'targeted',
                label: `Trọng điểm (${
                  weaknesses.filter(
                    (w) =>
                      w.lifecycle_state === 'targeted' ||
                      w.status === 'persistent' ||
                      w.recurrence_count >= 4,
                  ).length
                })`,
              },
              {
                id: 'improving',
                label: `Đang tiến bộ (${
                  weaknesses.filter(
                    (w) =>
                      w.lifecycle_state === 'improving' ||
                      w.lifecycle_state === 'stable' ||
                      w.status === 'improving',
                  ).length
                })`,
              },
              {
                id: 'mastered',
                label: `Đã làm chủ (${
                  weaknesses.filter(
                    (w) => w.lifecycle_state === 'mastered' || w.status === 'mastered',
                  ).length
                })`,
              },
            ]}
            value={selectedStatusTab}
            onChange={(val) => onSelectStatusTab(val)}
          />
        </div>

        {/* Weakness List */}
        {loading && weaknesses.length === 0 ? (
          <Skeleton variant="card" />
        ) : filteredWeaknesses.length === 0 ? (
          <div
            className="jw-text-center jw-p-lg"
            style={{
              background: 'var(--color-surface-sunken)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--color-border-default)',
            }}
          >
            <div className="jw-text--success jw-mb-xs">
              <Icon name="check" size={28} />
            </div>
            <p className="jw-text--primary jw-text--sm" style={{ fontWeight: 600, margin: 0 }}>
              {selectedStatusTab === 'retests'
                ? 'Chưa có điểm yếu nào đến hạn ôn tập'
                : searchQuery
                  ? 'Không tìm thấy điểm yếu phù hợp từ khóa'
                  : 'Chưa có điểm yếu nào trong danh mục này'}
            </p>
            <p className="jw-text--muted jw-text--xs jw-mt-xs">
              {selectedStatusTab === 'retests'
                ? 'Hệ thống sẽ tự động lên lịch kiểm tra có độ trễ (+1, +2, +7, +14 ngày) khi các điểm yếu tiến bộ.'
                : 'Hãy tiếp tục làm bài tập luyện viết để hệ thống tự động phân tích và ghi nhận tiến độ.'}
            </p>
          </div>
        ) : (
          <div
            className="jw-intel-explorer-list"
            onScroll={(e) => {
              const target = e.currentTarget
              if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
                if (displayLimit < filteredWeaknesses.length) {
                  onLoadMore()
                }
              }
            }}
          >
            {filteredWeaknesses.slice(0, displayLimit).map((weakness) => {
              const badgeInfo = lifecycleBadgeInfo(weakness.lifecycle_state || weakness.status)
              const isExpanded = expandedWeaknessId === weakness.id
              const masteryPercent = Math.round((weakness.mastery_score || 0) * 100)
              const isDue = weakness.retest_due_at && new Date(weakness.retest_due_at) <= new Date()

              return (
                <div
                  key={weakness.id}
                  className={cx(
                    'jw-intel-weakness-item',
                    (weakness.lifecycle_state === 'targeted' || weakness.status === 'persistent') &&
                      'jw-intel-weakness-item--persistent',
                  )}
                  onClick={() => onToggleExpand(weakness.id)}
                >
                  <div className="jw-flex jw-items-center jw-flex-between jw-gap-xs" style={{ flexWrap: 'wrap' }}>
                    <div className="jw-inline jw-gap-xs jw-items-center" style={{ flexWrap: 'wrap' }}>
                      <Badge tone={categoryBadgeTone(weakness.category)}>
                        {weakness.category.toUpperCase()}
                      </Badge>
                      <Badge tone={badgeInfo.tone}>
                        {badgeInfo.label}
                      </Badge>
                      {isDue && (
                        <Badge tone="warning">
                          Cần ôn lại
                        </Badge>
                      )}
                      {weakness.recurrence_count > 1 && (
                        <span className="jw-text--muted jw-text--xs font-mono">
                          x{weakness.recurrence_count} lần
                        </span>
                      )}
                      <strong className="jw-text--sm jw-text--primary">
                        {weakness.subtype.replace(/_/g, ' ')}
                      </strong>
                    </div>

                    <div className="jw-inline jw-gap-md jw-items-center jw-text--xs jw-text--muted">
                      <span>Làm chủ: <strong className="jw-text--primary">{masteryPercent}%</strong></span>
                      <span>Đã sửa đúng: <strong className="jw-text--success">{weakness.corrected_count}</strong></span>
                      <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} />
                    </div>
                  </div>

                  <p className="jw-text--secondary jw-text--xs jw-mt-xs">
                    {weakness.description}
                  </p>

                  {/* Mastery Bar */}
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

                  {/* Mastery Narrative & Evidence Details */}
                  <div
                    className="jw-mt-sm jw-p-sm"
                    style={{
                      background: 'var(--color-surface-sunken)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      lineHeight: 1.5,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    {weakness.mastery_narrative?.why_it_matters && (
                      <div>
                        <span className="jw-text--muted font-medium">Vì sao quan trọng: </span>
                        <span className="jw-text--primary">{weakness.mastery_narrative.why_it_matters}</span>
                      </div>
                    )}
                    {weakness.mastery_narrative?.current_mastery && (
                      <div>
                        <span className="jw-text--muted font-medium">Làm chủ hiện tại: </span>
                        <span className="jw-text--secondary">{weakness.mastery_narrative.current_mastery}</span>
                      </div>
                    )}
                    <div>
                      <span className="jw-text--muted font-medium">Bằng chứng: </span>
                      <span className="jw-text--secondary">
                        {weakness.mastery_narrative?.evidence_text ||
                          `${Math.round((weakness.context_generalization_score || 0) * 6)}/6 bối cảnh đã vượt qua · ${weakness.days_since_last_error ? `${Math.round(weakness.days_since_last_error)} ngày không mắc lại` : 'Gần đây có phát sinh'}`}
                      </span>
                    </div>
                    {weakness.retest_due_at && (
                      <div className="jw-flex jw-items-center jw-gap-xs jw-mt-xs">
                        <span className="jw-text--muted font-medium">Ôn tập tiếp theo: </span>
                        <span className="jw-text--accent font-medium">
                          {weakness.mastery_narrative?.next_step ||
                            `Trong ${weakness.retest_interval_days || 1} ngày (${new Date(weakness.retest_due_at).toLocaleDateString('vi-VN')})`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div
                      className="jw-mt-md jw-pt-sm"
                      style={{
                        borderTop: '1px solid var(--color-border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-sm)',
                      }}
                    >
                      {weakness.examples && weakness.examples.length > 0 && (
                        <div>
                          <span className="jw-text--muted jw-text--xs block jw-mb-xs">
                            Ví dụ thực tế từ các bài tập đã nộp:
                          </span>
                          <div className="jw-flex jw-flex-col jw-gap-xs">
                            {weakness.examples.map((ex, i) => (
                              <div
                                key={i}
                                className="jw-intel-example-item"
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: 'var(--space-sm)',
                                }}
                              >
                                <span>{ex}</span>
                                <div className="jw-inline jw-gap-xs jw-items-center" style={{ flexShrink: 0 }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCopyExampleText(ex, `${weakness.id}-${i}`)
                                    }}
                                    className="jw-btn jw-btn--ghost jw-btn--sm"
                                    style={{ height: 22, padding: '0 6px', fontSize: 10 }}
                                  >
                                    {copiedExampleIndex === `${weakness.id}-${i}` ? '✓ Đã chép' : 'Sao chép'}
                                  </button>
                                  <a
                                    href={`/rewrite-lab?text=${encodeURIComponent(ex)}`}
                                    className="jw-issue-jump"
                                    title="Tự sửa câu này trong Rewrite Lab"
                                    style={{ textDecoration: 'none', fontSize: '11px' }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    🧪 Tự sửa trong Rewrite Lab
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div
                        className="jw-flex jw-items-center jw-flex-between jw-gap-sm jw-mt-xs"
                        style={{ flexWrap: 'wrap' }}
                      >
                        <div className="jw-inline jw-gap-md jw-text--xs jw-text--muted">
                          {weakness.affected_registers && weakness.affected_registers.length > 0 && (
                            <span>Văn phong: {weakness.affected_registers.join(', ')}</span>
                          )}
                          {weakness.affected_jlpt_levels && weakness.affected_jlpt_levels.length > 0 && (
                            <span>JLPT: {weakness.affected_jlpt_levels.join(', ')}</span>
                          )}
                          <span>Lần cuối: {new Date(weakness.last_seen_at).toLocaleDateString('vi-VN')}</span>
                        </div>

                        <Button
                          variant="primary"
                          size="sm"
                          icon="sparkles"
                          onClick={(e) => {
                            e.stopPropagation()
                            onStartDrill(weakness.id)
                          }}
                        >
                          Luyện tập mục tiêu (Targeted Drill) →
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {displayLimit < filteredWeaknesses.length && (
              <div className="jw-text-center jw-py-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLoadMore}
                >
                  Xem thêm ({filteredWeaknesses.length - displayLimit} điểm yếu còn lại) ↓
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
