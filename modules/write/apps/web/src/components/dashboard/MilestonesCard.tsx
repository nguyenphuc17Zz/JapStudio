import type { MilestoneItem } from '../../types/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Icon } from '../icons/Icon'
import { Skeleton } from '../ui/Skeleton'

export interface MilestonesCardProps {
  milestones: MilestoneItem[] | undefined
  loading: boolean
  error: string | null
}

export default function MilestonesCard({ milestones, loading, error }: MilestonesCardProps) {
  return (
    <Card className="jw-dash-card--milestones">
      <CardHeader title={<span className="jw-card-eyebrow">Mốc thành tích</span>} />
      <CardContent>
        {loading ? (
          <Skeleton variant="list" lines={2} />
        ) : error ? (
          <p className="jw-text--muted jw-text--sm">Không thể tải thành tích.</p>
        ) : !milestones || milestones.length === 0 ? (
          <p className="jw-text--muted jw-text--sm">
            Chưa có mốc nào. Hãy luyện tập để mở khóa các mốc đầu tiên!
          </p>
        ) : (
          <ul className="jw-milestone-list">
            {milestones.slice(0, 5).map((item) => (
              <li className="jw-milestone-item" key={item.id}>
                <span className="jw-milestone-icon" aria-hidden="true">
                  <Icon name="trophy" size={16} />
                </span>
                <div className="jw-milestone-content">
                  <div className="jw-milestone-row">
                    <strong className="jw-milestone-title">{item.title}</strong>
                  </div>
                  {item.description ? (
                    <p className="jw-text--sm jw-text--muted">{item.description}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}