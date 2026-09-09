import { Card, CardHeader, CardContent } from '../../ui/Card'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'

export interface RecentMissionItem {
  scenario_id: string
  genre: string
  medium: string
  attempt_count: number
  purpose: string
}

interface RecentMissionsCardProps {
  items: RecentMissionItem[]
  loadingId: string | null
  onSelectScenario: (scenarioId: string) => void
}

export function RecentMissionsCard({
  items,
  loadingId,
  onSelectScenario,
}: RecentMissionsCardProps) {
  if (items.length === 0) return null

  return (
    <Card className="jw-mb-lg">
      <CardHeader title="Nhiệm vụ & Tình huống gần đây" />
      <CardContent>
        <ul className="jw-vocab-list">
          {items.map((item) => (
            <li key={item.scenario_id}>
              <Card variant="subtle">
                <CardContent>
                  <div
                    className="jw-inline jw-gap-md"
                    style={{ justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <div className="jw-inline jw-gap-xs jw-mb-xs">
                        <Badge tone="accent">{item.genre}</Badge>
                        <Badge tone="neutral">{item.medium}</Badge>
                        <span className="jw-text--caption jw-text--muted">
                          {item.attempt_count > 0 ? `${item.attempt_count} lần viết` : 'Chưa viết'}
                        </span>
                      </div>
                      <p className="jw-text--body-sm" style={{ fontWeight: 500 }}>
                        {item.purpose}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon="briefcase"
                      onClick={() => onSelectScenario(item.scenario_id)}
                      loading={loadingId === item.scenario_id}
                    >
                      Xem
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
