import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card, CardContent } from '../../ui/Card'
import { LoadingSpinner } from '../../LoadingSpinner'
import { ScenarioContextView } from '../../realworld/ScenarioContextView'
import type { ScenarioHistoryItem, WritingScenario } from '../../../types/api'

interface ScenarioPracticePaneProps {
  scenario: WritingScenario | null
  startingScenario: boolean
  onStartScenario: (id: string) => void
  onNavigateToSimulation: (scenarioId: string) => void
  onNavigateToScenarioFull: () => void
  onGenerateScenario: () => void
  generating: boolean
  recentScenarios: {
    loading: boolean
    data: { items: ScenarioHistoryItem[] } | null
  }
}

export function ScenarioPracticePane({
  scenario,
  startingScenario,
  onStartScenario,
  onNavigateToSimulation,
  onNavigateToScenarioFull,
  onGenerateScenario,
  generating,
  recentScenarios,
}: ScenarioPracticePaneProps) {
  return (
    <div>
      <p className="jw-text--muted jw-text--sm jw-mb-md">
        AI tạo một tình huống giao tiếp thực tế (email, chat, báo cáo...) cùng yêu cầu cụ thể. Bạn viết phản hồi bằng tiếng Nhật và nhận đánh giá theo tình huống.
      </p>
      {scenario ? (
        <>
          <ScenarioContextView
            scenario={scenario}
            starting={startingScenario}
            onStart={(target) => onStartScenario(target.id)}
          />
          <div className="jw-mt-md">
            <Button onClick={() => onNavigateToSimulation(scenario.id)} variant="secondary">
              Bắt đầu hội thoại mô phỏng
            </Button>
          </div>
        </>
      ) : (
        <div className="jw-mb-md" style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            onClick={onGenerateScenario}
            disabled={generating}
            icon="briefcase"
            variant="primary"
            size="md"
          >
            {generating ? 'Đang tạo...' : 'Tạo tình huống mới'}
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={onNavigateToScenarioFull}
          >
            Đến Không gian Thực chiến Tình huống (4 Danh mục & 10 Chiều) →
          </Button>
        </div>
      )}

      {recentScenarios.loading ? (
        <LoadingSpinner label="Đang tải tình huống gần đây..." />
      ) : (recentScenarios.data?.items ?? []).length > 0 ? (
        <div className="jw-mt-lg">
          <h4 className="jw-card-eyebrow jw-mb-sm">TÌNH HUỐNG ĐÃ VIẾT</h4>
          <ul className="jw-vocab-list">
            {recentScenarios.data?.items.map((item) => (
              <li key={item.scenario_id}>
                <Card variant="subtle">
                  <CardContent>
                    <div className="jw-inline jw-gap-md" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div className="jw-inline jw-gap-xs jw-mb-xs">
                          <Badge tone="accent">{item.genre}</Badge>
                          <Badge tone="neutral">{item.medium}</Badge>
                        </div>
                        <strong className="jw-text--body-sm">{item.purpose}</strong>
                      </div>
                      <div className="jw-inline jw-gap-xs">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onStartScenario(item.scenario_id)}
                        >
                          Viết lại
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onNavigateToSimulation(item.scenario_id)}
                        >
                          Mô phỏng
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
