import type { WritingScenario } from '../../types/api'
import { Button } from '../ui/Button'
import { ConstraintList } from './ConstraintList'
import { genreLabel, mediumLabel } from './labels'
import { OptionalPoints } from './OptionalPoints'
import { RequiredPoints } from './RequiredPoints'
import { ScenarioContext } from './ScenarioContext'
import { ScenarioMeta } from './ScenarioMeta'
import { ScenarioObjective } from './ScenarioObjective'

export interface ScenarioLandingProps {
  scenario: WritingScenario
  startingWriting: boolean
  onStartWriting: (scenario: WritingScenario) => void
  onStartSimulation: (scenario: WritingScenario) => void
}

export function ScenarioLanding({
  scenario,
  startingWriting,
  onStartWriting,
  onStartSimulation,
}: ScenarioLandingProps) {
  return (
    <div className="jw-rw-landing">
      <header className="jw-rw-landing-head">
        <p className="jw-rw-eyebrow">{genreLabel(scenario.genre).toUpperCase()}</p>
        <h2 className="jw-rw-landing-title">{scenario.purpose || scenario.situation_vi}</h2>
        {scenario.medium ? (
          <p className="jw-rw-landing-sub">{mediumLabel(scenario.medium)}</p>
        ) : null}
      </header>

      <ScenarioMeta scenario={scenario} />
      <ScenarioContext scenario={scenario} />
      <ScenarioObjective scenario={scenario} />
      <RequiredPoints points={scenario.required_points} collapsible />
      <OptionalPoints points={scenario.optional_points} />
      <ConstraintList patterns={scenario.forbidden_patterns} />

      <div className="jw-rw-actions">
        <Button
          icon="send"
          onClick={() => onStartWriting(scenario)}
          loading={startingWriting}
        >
          {startingWriting ? 'Đang chuẩn bị bài tập...' : 'Bắt đầu viết'}
        </Button>
        <Button
          variant="secondary"
          icon="simulation"
          onClick={() => onStartSimulation(scenario)}
        >
          Bắt đầu mô phỏng
        </Button>
      </div>
      <p className="jw-rw-relation-note">
        Tình huống = viết một lần · Mô phỏng = trò chuyện nhiều lượt
      </p>
    </div>
  )
}