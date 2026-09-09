import { Link } from 'react-router-dom'
import { GOAL_TYPE_LABELS_VI, type JourneyStatusResponse } from '../../types/api'
import { Card, CardHeader, CardContent, CardFooter } from '../ui/Card'
import { ProgressBar } from '../ui/Progress'
import { Skeleton } from '../ui/Skeleton'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

export interface JourneyCardProps {
  journey: JourneyStatusResponse | null
  loading: boolean
  error: string | null
}

export default function JourneyCard({ journey, loading, error }: JourneyCardProps) {
  const hasJourney =
    journey !== null &&
    Array.isArray(journey.milestones) &&
    Array.isArray(journey.objectives)

  return (
    <Card className="jw-dash-card--journey">
      <CardHeader title={<span className="jw-card-eyebrow">Lộ trình</span>} />
      <CardContent>
        {loading ? (
          <Skeleton variant="text" lines={3} />
        ) : error ? (
          <p className="jw-text--muted jw-text--sm">Không thể tải lộ trình.</p>
        ) : !hasJourney ? (
          <>
            <p className="jw-text--muted jw-text--sm">
              Chưa có lộ trình dài hạn.{' '}
              <Link to="/journey">Tạo lộ trình</Link> để theo đuổi một mục tiêu cụ thể.
            </p>
          </>
        ) : (
          <>
            <div className="jw-journey-card-head">
              <Badge tone="info">{GOAL_TYPE_LABELS_VI[journey.goal_type] ?? journey.goal_type}</Badge>
              <span className="jw-text--muted jw-text--sm">{journey.progress}%</span>
            </div>
            <p className="jw-journey-card-title">
              <strong>{journey.title ?? journey.goal}</strong>
            </p>
            <ProgressBar
              value={journey.progress}
              tone="info"
              size="sm"
              className="jw-mt-sm"
              aria-label={`Tiến độ lộ trình: ${journey.progress}%`}
            />
            <p className="jw-recent-line">
              {(() => {
                const objective = journey.objectives.find(
                  (item) => item.id === journey.current_objective_id,
                )
                const milestone = journey.milestones.find(
                  (item) => item.id === journey.current_milestone_id,
                )
                if (objective) {
                  return (
                    <>
                      Mục tiêu hiện tại: <strong>{objective.title}</strong>
                      {milestone ? ` (${milestone.title})` : ''}
                    </>
                  )
                }
                return 'Tất cả mục tiêu đã hoàn thành!'
              })()}
            </p>
          </>
        )}
      </CardContent>
      {!loading && !error && hasJourney && (
        <CardFooter>
          <Button href="/journey" variant="ghost" size="sm" icon="journey">
            Xem lộ trình
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}