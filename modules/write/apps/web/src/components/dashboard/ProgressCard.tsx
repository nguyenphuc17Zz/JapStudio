import type { GamificationSummary } from '../../types/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { GoalProgress, XPProgress } from '../ui/Progress'
import { Skeleton } from '../ui/Skeleton'

export interface ProgressCardProps {
  summary: GamificationSummary | null
  loading: boolean
  error: string | null
}

export default function ProgressCard({ summary, loading, error }: ProgressCardProps) {
  return (
    <Card className="jw-dash-card--progress">
      <CardHeader title={<span className="jw-card-eyebrow">Tiến trình hôm nay</span>} />
      <CardContent>
        {loading ? (
          <Skeleton variant="text" lines={3} />
        ) : error ? (
          <p className="jw-text--muted jw-text--sm">Không thể tải tiến trình.</p>
        ) : summary ? (
          <div className="jw-progress-rows">
            <XPProgress
              level={summary.level.current_level}
              xp={summary.level.current_xp}
              xpInLevel={summary.level.xp_in_level}
              xpToNext={summary.level.xp_to_next_level}
            />
            <div className="jw-progress-row">
              <span className="jw-progress-label">Chuỗi luyện tập</span>
              <span className="jw-progress-value">
                {summary.current_streak} ngày
                {summary.longest_streak > summary.current_streak && (
                  ` (kỷ lục: ${summary.longest_streak})`
                )}
              </span>
            </div>
            <div className="jw-progress-row">
              <span className="jw-progress-label">XP hôm nay</span>
              <span className="jw-progress-value jw-text--accent">{summary.today_xp} XP</span>
            </div>
            <GoalProgress
              label="Mục tiêu hôm nay"
              value={summary.daily_goal.completed_count}
              target={summary.daily_goal.target}
              tone={summary.daily_goal.completed ? 'success' : 'accent'}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}