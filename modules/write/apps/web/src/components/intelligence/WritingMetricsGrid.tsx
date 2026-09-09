import { Card, CardContent } from '../ui/Card'

interface WritingMetricsGridProps {
  masteryRate: number
  activeCount: number
  totalTracked: number
  persistentCount: number
  masteredCount: number
  estimatedLevel?: string
  totalAnalyzed: number
}

export function WritingMetricsGrid({
  masteryRate,
  activeCount,
  totalTracked,
  persistentCount,
  masteredCount,
  estimatedLevel,
  totalAnalyzed,
}: WritingMetricsGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-lg)',
      }}
    >
      <Card>
        <CardContent className="jw-p-md">
          <span className="jw-card-eyebrow">Tỷ lệ làm chủ</span>
          <div className="jw-flex jw-items-baseline jw-gap-xs jw-mt-xs">
            <span className="jw-text--2xl jw-text--success" style={{ fontWeight: 800 }}>
              {masteryRate}%
            </span>
            <span className="jw-text--muted jw-text--xs">tổng thể</span>
          </div>
          <div
            className="jw-mt-sm"
            style={{
              height: 6,
              background: 'var(--color-border-subtle)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${masteryRate}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--color-accent), var(--color-success))',
                borderRadius: 3,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="jw-p-md">
          <span className="jw-card-eyebrow">Điểm yếu đang theo dõi</span>
          <div className="jw-flex jw-items-baseline jw-gap-xs jw-mt-xs">
            <span className="jw-text--2xl jw-text--primary" style={{ fontWeight: 800 }}>
              {activeCount}
            </span>
            <span className="jw-text--muted jw-text--xs">/ {totalTracked} đã ghi nhận</span>
          </div>
          <div className="jw-inline jw-gap-xs jw-text--xs jw-text--muted jw-mt-sm">
            <span className="jw-text--danger">● {persistentCount} dai dẳng</span>
            <span>● {masteredCount} đã làm chủ</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="jw-p-md">
          <span className="jw-card-eyebrow">Cấp độ viết ước lượng</span>
          <div className="jw-flex jw-items-baseline jw-gap-xs jw-mt-xs">
            <span className="jw-text--2xl jw-text--accent" style={{ fontWeight: 800 }}>
              {estimatedLevel ? `JLPT ${estimatedLevel}` : 'JLPT N4-N3'}
            </span>
          </div>
          <span className="jw-text--muted jw-text--xs jw-mt-xs block">
            Dựa trên cấu trúc câu & văn phong bài viết
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="jw-p-md">
          <span className="jw-card-eyebrow">Bài tập đã phân tích</span>
          <div className="jw-flex jw-items-baseline jw-gap-xs jw-mt-xs">
            <span className="jw-text--2xl jw-text--primary" style={{ fontWeight: 800 }}>
              {totalAnalyzed}
            </span>
            <span className="jw-text--muted jw-text--xs">lượt nộp</span>
          </div>
          <span className="jw-text--muted jw-text--xs jw-mt-xs block">
            Tự động chuẩn hóa qua Taxonomy Engine
          </span>
        </CardContent>
      </Card>
    </div>
  )
}
