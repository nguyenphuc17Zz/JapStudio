import type { DailyMission } from '../../types/api'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardContent, CardFooter } from '../ui/Card'
import { ProgressBar } from '../ui/Progress'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'
import { Icon } from '../icons/Icon'

export interface MissionCardProps {
  mission: DailyMission | null
  regenerating: boolean
  loading: boolean
  error: string | null
  onRegenerate: () => void
}

export default function MissionCard({
  mission,
  regenerating,
  loading,
  error,
  onRegenerate,
}: MissionCardProps) {
  return (
    <Card className="jw-dash-card--mission">
      <CardHeader
        title={
          <div className="jw-card-eyebrow-group jw-inline jw-gap-xs" style={{ alignItems: 'center' }}>
            <span className="jw-card-eyebrow">
              Nhiệm vụ hôm nay
            </span>
          </div>
        }
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon="refresh"
            onClick={onRegenerate}
            disabled={regenerating || loading}
            aria-label="Đổi nhiệm vụ khác"
          />
        }
      />
      <CardContent>
        {loading ? (
          <Skeleton variant="text" lines={2} />
        ) : error ? (
          <p className="jw-text--muted jw-text--sm">Không thể tải nhiệm vụ.</p>
        ) : mission ? (
          <>
            <p className="jw-mission-title" style={{ fontSize: 'var(--text-body)', fontWeight: 700 }}>
              <strong>{mission.title}</strong>
            </p>
            {mission.description && (
              <p className="jw-mission-desc jw-text--muted">{mission.description}</p>
            )}
            {mission.reason && (
              <p className="jw-mission-reason jw-text--caption jw-text--muted">{mission.reason}</p>
            )}
            <div className="jw-mission-progress jw-mt-sm">
              <ProgressBar
                value={mission.completed_count}
                max={mission.target_count}
                tone={mission.completed ? 'success' : 'accent'}
                size="sm"
                className="jw-mission-bar"
                aria-label={`Tiến độ nhiệm vụ: ${mission.completed_count} / ${mission.target_count}`}
              />
              <span
                className="jw-mission-count"
                aria-hidden="true"
                style={{
                  fontWeight: 700,
                  color: mission.completed ? 'var(--color-success)' : 'var(--color-foreground)',
                }}
              >
                {mission.completed_count}/{mission.target_count}
              </span>
            </div>
            {mission.focus_skills.length > 0 && (
              <div className="jw-mission-skills jw-mt-xs">
                {mission.focus_skills.map((skill) => (
                  <Badge key={skill} tone="accent">{skill}</Badge>
                ))}
              </div>
            )}
            {mission.completed && (
              <p
                className="jw-mission-complete jw-mt-sm"
                style={{
                  color: 'var(--color-success)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon name="check" size={14} aria-hidden="true" />
                Hoàn thành! Tiếp tục luyện tập để giữ phong độ.
              </p>
            )}
          </>
        ) : (
          <p className="jw-text--muted jw-text--sm">
            Chưa có nhiệm vụ hôm nay. Nhấn làm mới để nhận nhiệm vụ.
          </p>
        )}
      </CardContent>
      {!loading && !error && (
        <CardFooter style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button
            href="/practice"
            variant="primary"
            size="sm"
            icon="practice"
          >
            {mission?.completed ? 'Tiếp tục luyện tập' : 'Luyện tập ngay'}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}