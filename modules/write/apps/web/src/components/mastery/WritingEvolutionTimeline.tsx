import { useState, useEffect, useCallback } from 'react'
import { api } from '../../services/api'
import type {
  WritingEvolutionTimeline as TimelineType,
  WeaknessEvolutionItem,
  BadgeTone,
} from '../../types/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { Tabs } from '../ui/Tabs'
import { Icon } from '../icons/Icon'

export interface WritingEvolutionTimelineProps {
  onPracticeWeakness?: (weaknessId: string) => void
}

function categoryBadgeTone(cat: string): BadgeTone {
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

export function WritingEvolutionTimeline({ onPracticeWeakness }: WritingEvolutionTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBucketTab, setSelectedBucketTab] = useState<'eliminated' | 'reduced' | 'persistent' | 'emerging'>('eliminated')

  const fetchTimeline = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getWritingEvolutionTimeline()
      setTimeline(data)
    } catch (err: any) {
      setError(err?.message || 'Không thể tải dòng thời gian tiến hóa viết.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchTimeline()
  }, [fetchTimeline])

  if (loading) {
    return (
      <div style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Spinner size={32} />
        <span style={{ fontSize: 13, color: 'var(--color-foreground-secondary)' }}>
          Đang tổng hợp dòng thời gian tiến hóa năng lực viết...
        </span>
      </div>
    )
  }

  if (error || !timeline) {
    return (
      <div style={{ padding: 'var(--space-md)', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: 13 }}>
        {error || 'Chưa có dữ liệu tiến hóa viết.'}
      </div>
    )
  }

  const activeWeaknessList: WeaknessEvolutionItem[] =
    selectedBucketTab === 'eliminated'
      ? timeline.weaknesses_eliminated
      : selectedBucketTab === 'reduced'
      ? timeline.weaknesses_reduced
      : selectedBucketTab === 'persistent'
      ? timeline.persistent_weaknesses
      : timeline.newly_emerging_weaknesses

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* 1. AI Narrative Debrief Story Card */}
      {timeline.ai_narrative_story && (
        <Card variant="ai">
          <CardHeader
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <Icon name="sparkles" size={16} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  BẢN TƯỜNG TRÌNH TIẾN HÓA NĂNG LỰC VIẾT (LONGITUDINAL EVOLUTION DEBRIEF)
                </span>
              </div>
            }
          />
          <CardContent>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: 'var(--color-foreground)' }}>
              {timeline.ai_narrative_story}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 2. Four Longitudinal Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-md)',
        }}
      >
        <div
          style={{
            padding: 'var(--space-md)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            borderColor: selectedBucketTab === 'eliminated' ? 'var(--color-primary)' : 'var(--color-border)',
          }}
          onClick={() => setSelectedBucketTab('eliminated')}
        >
          <span className="jw-card-eyebrow">Điểm Yếu Đã Xóa Bỏ</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--nihon-moegi, #10b981)' }}>
              {timeline.weaknesses_eliminated.length}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-foreground-muted)' }}>đạt Master</span>
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--color-foreground-secondary)', marginTop: 4, display: 'block' }}>
            Không tái phát trong $\ge 7$ ngày
          </span>
        </div>

        <div
          style={{
            padding: 'var(--space-md)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            borderColor: selectedBucketTab === 'reduced' ? 'var(--color-primary)' : 'var(--color-border)',
          }}
          onClick={() => setSelectedBucketTab('reduced')}
        >
          <span className="jw-card-eyebrow">Điểm Yếu Đã Giảm Nhẹ</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--nihon-asagi, #06b6d4)' }}>
              {timeline.weaknesses_reduced.length}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-foreground-muted)' }}>đang tiến bộ</span>
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--color-foreground-secondary)', marginTop: 4, display: 'block' }}>
            Số lần sửa đúng {'>'} Số lần mắc lỗi
          </span>
        </div>

        <div
          style={{
            padding: 'var(--space-md)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            borderColor: selectedBucketTab === 'persistent' ? 'var(--color-primary)' : 'var(--color-border)',
          }}
          onClick={() => setSelectedBucketTab('persistent')}
        >
          <span className="jw-card-eyebrow">Điểm Yếu Còn Dai Dẳng</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>
              {timeline.persistent_weaknesses.length}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-foreground-muted)' }}>cần tập trung</span>
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--color-foreground-secondary)', marginTop: 4, display: 'block' }}>
            Tái diễn nhiều buổi liên tiếp
          </span>
        </div>

        <div
          style={{
            padding: 'var(--space-md)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            borderColor: selectedBucketTab === 'emerging' ? 'var(--color-primary)' : 'var(--color-border)',
          }}
          onClick={() => setSelectedBucketTab('emerging')}
        >
          <span className="jw-card-eyebrow">Mới Xuất Hiện Gần Đây</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--nihon-yamabuki, #f59e0b)' }}>
              {timeline.newly_emerging_weaknesses.length}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-foreground-muted)' }}>trong 7 ngày</span>
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--color-foreground-secondary)', marginTop: 4, display: 'block' }}>
            Cần chặn sớm trước khi thành tật
          </span>
        </div>
      </div>

      {/* 3. Filterable Weakness Explorer in Timeline */}
      <Card>
        <CardHeader
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                Chi Tiết Điểm Yếu Theo Phân Loại Tiến Hóa ({activeWeaknessList.length})
              </span>
            </div>
          }
        />
        <CardContent style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <Tabs
            variant="pills"
            items={[
              { id: 'eliminated', label: `Đã Xóa Bỏ (${timeline.weaknesses_eliminated.length})` },
              { id: 'reduced', label: `Đã Giảm Nhẹ (${timeline.weaknesses_reduced.length})` },
              { id: 'persistent', label: `Dai Dẳng (${timeline.persistent_weaknesses.length})` },
              { id: 'emerging', label: `Mới Xuất Hiện (${timeline.newly_emerging_weaknesses.length})` },
            ]}
            value={selectedBucketTab}
            onChange={(val) => setSelectedBucketTab(val as any)}
          />

          {activeWeaknessList.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--color-foreground-muted)', fontSize: 13 }}>
              Không có điểm yếu nào trong phân loại này.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {activeWeaknessList.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 'var(--space-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <Badge tone={categoryBadgeTone(item.category)}>{item.category}</Badge>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--color-foreground)' }}>
                        {item.description}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--color-foreground-muted)', marginTop: 2 }}>
                        {item.subtype} • Đã sửa đúng: {item.corrected_count} lần • Tái diễn: {item.recurrence_count} lần • Lần mắc lỗi cuối: {item.days_since_last_error} ngày trước
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: item.mastery_score >= 0.75 ? 'var(--color-success)' : 'var(--color-foreground)' }}>
                      {Math.round(item.mastery_score * 100)}%
                    </span>
                    {onPracticeWeakness && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon="sparkles"
                        onClick={() => onPracticeWeakness(item.id)}
                      >
                        Luyện Ngay
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Longitudinal Trajectory Progress Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
        <Card>
          <CardHeader title={<span style={{ fontWeight: 700, fontSize: 13.5 }}>Quỹ Đạo Văn Phong (Register Accuracy)</span>} />
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {timeline.register_progress.map((pt, pIdx) => (
                <div key={pIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--color-foreground-secondary)' }}>{pt.date}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '60%' }}>
                    <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pt.score * 100}%`, height: '100%', background: 'var(--nihon-yamabuki, #f59e0b)', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontWeight: 700, minWidth: 32 }}>{Math.round(pt.score * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={<span style={{ fontWeight: 700, fontSize: 13.5 }}>Quỹ Đạo Tự Nhiên Thuần Nhật (Naturalness)</span>} />
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {timeline.naturalness_progress.map((pt, pIdx) => (
                <div key={pIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--color-foreground-secondary)' }}>{pt.date}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '60%' }}>
                    <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pt.score * 100}%`, height: '100%', background: 'var(--nihon-toki, #f43f5e)', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontWeight: 700, minWidth: 32 }}>{Math.round(pt.score * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Key Milestones */}
      {timeline.milestone_events && timeline.milestone_events.length > 0 && (
        <Card>
          <CardHeader title={<span style={{ fontWeight: 700, fontSize: 13.5 }}>Cột Mốc Tiến Hóa Đã Đạt Được</span>} />
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {timeline.milestone_events.map((ms, mIdx) => (
                <div
                  key={mIdx}
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(16, 185, 129, 0.05)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                  }}
                >
                  <span style={{ fontSize: 18 }}>🏆</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-foreground)' }}>{ms.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-foreground-secondary)', marginTop: 2 }}>
                      {ms.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
