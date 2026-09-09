import type { LearnerFocus } from '../../types/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'
import { Button } from '../ui/Button'

export interface AiFocusCardProps {
  focus: LearnerFocus | null
  loading: boolean
  error: string | null
}

export default function AiFocusCard({ focus, loading, error }: AiFocusCardProps) {
  if (loading) {
    return (
      <Card className="jw-dash-card--focus">
        <CardHeader title={<span className="jw-card-eyebrow">Trọng tâm AI</span>} />
        <CardContent>
          <Skeleton variant="text" lines={2} />
        </CardContent>
      </Card>
    )
  }

  if (error || !focus || focus.evidence_count === 0) {
    return (
      <Card className="jw-dash-card--focus">
        <CardHeader title={<span className="jw-card-eyebrow">Trọng tâm AI</span>} />
        <CardContent>
          <p className="jw-text--muted jw-text--sm">
            {error
              ? `Không thể tải hồ sơ học tập: ${error}`
              : 'Bạn chưa có bài chấm điểm nào để phân tích trọng tâm.'}
          </p>
          <Button href="/practice" variant="ghost" size="sm" className="jw-mt-sm">
            Luyện tập ngay
          </Button>
        </CardContent>
      </Card>
    )
  }

  const trends = focus.recent_trends
  const allSkills = [...(focus.strengths ?? []), ...(focus.weaknesses ?? [])]

  return (
    <Card className="jw-dash-card--focus">
      <CardHeader title={<span className="jw-card-eyebrow">Trọng tâm AI</span>} />
      <CardContent>
        <p className="jw-text--sm jw-text--secondary jw-mb-sm">
          {focus.goal && <span>Mục tiêu: <strong>{focus.goal}</strong>. </span>}
          <span>{focus.evidence_count} bài viết</span>
          {focus.target_jlpt ? ` · JLPT ${focus.target_jlpt}` : ''}
          {focus.estimated_jlpt?.min_level
            ? ` · Ước tính: ${focus.estimated_jlpt.min_level}–${focus.estimated_jlpt.max_level}`
            : ''}
        </p>

        {trends && (
          <div className="jw-focus-metrics jw-mb-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xs)', fontSize: 'var(--text-caption)' }}>
            <div>
              <span className="jw-text--muted">Điểm trung bình</span>
              <p className="jw-text--body-sm" style={{ fontWeight: 600 }}>{trends.overall_score}/100</p>
            </div>
            <div>
              <span className="jw-text--muted">Cải thiện 7 ngày</span>
              <p className="jw-text--body-sm jw-text--success" style={{ fontWeight: 600 }}>
                {trends.improvement > 0 ? '+' : ''}{trends.improvement}
              </p>
            </div>
            <div>
              <span className="jw-text--muted">Số bài 7 ngày</span>
              <p className="jw-text--body-sm" style={{ fontWeight: 600 }}>{trends.last_7d_attempts}</p>
            </div>
          </div>
        )}

        {allSkills.length > 0 && (
          <div className="jw-focus-tags jw-mt-sm">
            {(focus.weaknesses ?? []).map((skill) => (
              <Badge key={skill} tone="warning">{skill}</Badge>
            ))}
            {(focus.strengths ?? []).map((skill) => (
              <Badge key={skill} tone="success">{skill}</Badge>
            ))}
          </div>
        )}
        <Button href="/analytics" variant="ghost" size="sm" className="jw-mt-sm">
          Xem phân tích chi tiết
        </Button>
      </CardContent>
    </Card>
  )
}