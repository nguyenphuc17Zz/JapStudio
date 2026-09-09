import type { WritingScenario } from '../../types/api'
import { Button } from '../ui/Button'
import { ConstraintList } from './ConstraintList'
import { OptionalPoints } from './OptionalPoints'
import { RequiredPoints } from './RequiredPoints'
import { ScenarioContext } from './ScenarioContext'
import { ScenarioMeta } from './ScenarioMeta'
import { ScenarioObjective } from './ScenarioObjective'

export interface ScenarioContextViewProps {
  scenario: WritingScenario
  starting: boolean
  onStart: (scenario: WritingScenario) => void
}

export function ScenarioContextView({
  scenario,
  starting,
  onStart,
}: ScenarioContextViewProps) {
  return (
    <div className="jw-rw-context-view">
      <ScenarioMeta scenario={scenario} />
      <ScenarioContext scenario={scenario} />
      <ScenarioObjective scenario={scenario} />
      <RequiredPoints points={scenario.required_points} collapsible />
      <OptionalPoints points={scenario.optional_points} />
      <ConstraintList patterns={scenario.forbidden_patterns} />
      <div className="jw-rw-actions">
        <Button
          icon="send"
          onClick={() => onStart(scenario)}
          loading={starting}
        >
          {starting ? 'Đang chuẩn bị bài tập...' : 'Bắt đầu viết'}
        </Button>
      </div>
    </div>
  )
}