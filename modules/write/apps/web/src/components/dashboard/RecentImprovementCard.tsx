import type { AnalyticsSkillOutcome } from '../../types/api'
import { Card, CardHeader, CardContent, CardFooter } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import { Button } from '../ui/Button'

const SKILL_LABELS: Record<string, string> = {
  grammar: 'Ngữ pháp',
  vocabulary: 'Từ vựng',
  naturalness: 'Tự nhiên',
  semantic: 'Đúng nghĩa',
  context_fit: 'Hợp ngữ cảnh',
  register_fit: 'Đúng phong cách',
}

export interface RecentImprovementCardProps {
  skills: AnalyticsSkillOutcome[] | undefined
  loading: boolean
  error: string | null
}

export default function RecentImprovementCard({
  skills,
  loading,
  error,
}: RecentImprovementCardProps) {
  const measured = (skills ?? []).filter(
    (skill) => !skill.insufficient_evidence && skill.current !== null,
  )

  const withDelta = measured.filter(
    (skill): skill is AnalyticsSkillOutcome & { delta: number } => skill.delta !== null,
  )

  const average =
    measured.length > 0
      ? measured.reduce((sum, skill) => sum + (skill.current ?? 0), 0) / measured.length
      : 0

  const avgImprovement =
    withDelta.length > 0
      ? withDelta.reduce((sum, skill) => sum + skill.delta, 0) / withDelta.length
      : 0

  const topSkills = [...withDelta]
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3)

  return (
    <Card className="jw-dash-card--improvement">
      <CardHeader title={<span className="jw-card-eyebrow">Cải thiện gần đây</span>} />
      <CardContent>
        {loading ? (
          <Skeleton variant="text" lines={3} />
        ) : error ? (
          <p className="jw-text--muted jw-text--sm">Không thể tải dữ liệu tiến bộ.</p>
        ) : measured.length === 0 ? (
          <p className="jw-text--muted jw-text--sm">
            Chưa có đủ dữ liệu 30 ngày. Hãy luyện tập để hệ thống đo lường tiến bộ.
          </p>
        ) : (
          <div className="jw-improvement-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            <div className="jw-recent-line">
              <span className="jw-text--body-sm" style={{ fontWeight: 500 }}>Trung bình</span>
              <span className="jw-inline jw-gap-xs">
                <span>{average.toFixed(1)}/100</span>
                <span className="jw-text--success" style={{ fontWeight: 600 }}>
                  {avgImprovement > 0 ? '+' : ''}{avgImprovement.toFixed(1)}
                </span>
              </span>
            </div>
            {topSkills.map((skill) => (
              <div key={skill.skill} className="jw-recent-line">
                <span className="jw-text--body-sm">
                  {SKILL_LABELS[skill.skill] ?? skill.skill}
                </span>
                <span className="jw-inline jw-gap-xs">
                  <span>{(skill.current ?? 0).toFixed(1)}/100</span>
                  <span
                    className={
                      skill.delta > 0
                        ? 'jw-text--success'
                        : 'jw-text--muted'
                    }
                    style={{ fontWeight: 600 }}
                  >
                    {skill.delta > 0 ? '+' : ''}{skill.delta.toFixed(1)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {!loading && !error && measured.length > 0 && (
        <CardFooter>
          <Button href="/analytics" variant="ghost" size="sm" icon="analytics">
            Xem phân tích
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}