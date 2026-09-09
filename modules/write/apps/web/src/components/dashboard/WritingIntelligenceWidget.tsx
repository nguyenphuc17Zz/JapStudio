import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import type { WritingIntelligenceSummary } from '../../types/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Skeleton'
import { Icon } from '../icons/Icon'
import { cx } from '../../lib/cx'

export interface WritingIntelligenceWidgetProps {
  className?: string
  initialSummary?: WritingIntelligenceSummary | null
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

export function WritingIntelligenceWidget({
  className,
  initialSummary,
}: WritingIntelligenceWidgetProps) {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<WritingIntelligenceSummary | null>(
    initialSummary || null,
  )
  const [loading, setLoading] = useState(!initialSummary)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    if (!initialSummary) {
      void fetchSummary()
    }
  }, [fetchSummary, initialSummary])

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

  const recommendedFocus = summary?.recommended_focus || []
  const activeCount = summary?.active_weaknesses_count ?? 0
  const masteryRate = Math.round((summary?.overall_mastery_rate ?? 0) * 100)

  return (
    <Card className={cx('jw-dash-card--intelligence', className)}>
      <CardHeader
        title={
          <div className="jw-card-header-title">
            <div className="jw-card-eyebrow-group">
              <span className="jw-card-eyebrow">Trí tuệ bài viết</span>
              <h3 className="jw-card-title">Writing Intelligence</h3>
            </div>
          </div>
        }
        actions={
          <div className="jw-inline jw-gap-xs">
            <Button
              variant="secondary"
              size="sm"
              icon="sparkles"
              onClick={() => navigate('/intelligence')}
            >
              Mở Studio Trí Tuệ →
            </Button>
          </div>
        }
      />

      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* Stats Row */}
        <div className="jw-intel-stats">
          <div className="jw-intel-stat-item">
            <span className="jw-intel-stat-label">Lỗi đang theo dõi</span>
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

        {/* Priority Focus preview */}
        {recommendedFocus.length > 0 && (
          <div className="jw-intel-rec-box">
            <div className="jw-inline jw-gap-xs jw-items-center jw-text--warning jw-text--xs" style={{ fontWeight: 600 }}>
              <Icon name="target" size={14} />
              <span>Gợi ý ưu tiên khắc phục</span>
            </div>
            <ul className="jw-flex jw-flex-col jw-gap-xs jw-text--xs jw-text--secondary" style={{ margin: 0, paddingLeft: 16 }}>
              {recommendedFocus.slice(0, 2).map((focus, idx) => (
                <li key={idx}>
                  <span>{formatFocusItem(focus)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Teaser CTA Banner */}
        <div
          onClick={() => navigate('/intelligence')}
          style={{
            padding: 'var(--space-sm) var(--space-md)',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          className="jw-card--interactive"
        >
          <div className="jw-inline jw-gap-xs jw-items-center">
            <span className="jw-text--accent">
              <Icon name="sparkles" size={18} />
            </span>
            <div>
              <strong className="jw-text--sm jw-text--primary block">
                Chẩn đoán AI & Bản đồ 5 Chiều Kỹ Năng
              </strong>
              <span className="jw-text--muted jw-text--xs">
                Khám phá nguyên nhân gốc rễ & cặp mẫu câu đối chiếu chuẩn Nhật
              </span>
            </div>
          </div>
          <span className="jw-text--accent jw-text--sm" style={{ fontWeight: 600 }}>
            Xem chi tiết →
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
export default WritingIntelligenceWidget
