import { Link } from 'react-router-dom'
import { Card, CardContent } from './ui/Card'
import { Badge } from './ui/Badge'
import { ProgressBar } from './ui/Progress'
import {
  MASTERY_STATE_LABELS_VI,
  type JourneyObjectiveContextResponse,
} from '../types/api'

export default function JourneyBanner({
  context,
}: {
  context: JourneyObjectiveContextResponse | null
}) {
  if (
    context === null ||
    typeof context !== 'object' ||
    !context.progress ||
    typeof context.progress !== 'object'
  ) {
    return null
  }
  const progress = context.progress
  const masteryLabel =
    MASTERY_STATE_LABELS_VI[progress.mastery_state] ?? progress.mastery_state
  return (
    <Card variant="subtle" className="jw-mb-md">
      <CardContent>
        <div className="jw-inline jw-gap-xs jw-mb-xs" style={{ justifyContent: 'space-between' }}>
          <Badge tone="accent">Mục tiêu lộ trình</Badge>
          <span className="jw-text--caption jw-text--muted">{context.milestone_title}</span>
        </div>
        <strong className="jw-text--body-sm jw-mb-xs" style={{ display: 'block' }}>
          {context.objective_title}
        </strong>
        {Object.keys(context.competency_labels_vi).length > 0 && (
          <div className="jw-inline jw-gap-xs jw-mb-sm">
            {Object.values(context.competency_labels_vi).map((label) => (
              <Badge key={label} tone="neutral">{label}</Badge>
            ))}
          </div>
        )}
        <ProgressBar
          value={Math.min(100, Math.max(0, progress.average_score))}
          tone="accent"
          size="sm"
          className="jw-mb-xs"
        />
        <div className="jw-inline jw-gap-sm" style={{ justifyContent: 'space-between' }}>
          <span className="jw-text--caption jw-text--muted">
            {masteryLabel} · trung bình {progress.average_score}/100 ·{' '}
            {progress.exercises_completed} bài đã làm
          </span>
          <Link to="/journey" className="jw-text--caption jw-text--accent">
            Xem lộ trình →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}