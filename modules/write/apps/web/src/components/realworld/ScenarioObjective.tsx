import type { WritingScenario } from '../../types/api'
import { Icon } from '../icons/Icon'

export function ScenarioObjective({ scenario }: { scenario: WritingScenario }) {
  if (!scenario.purpose) return null
  return (
    <section className="jw-rw-objective" aria-label="Mục tiêu của bạn">
      <div className="jw-rw-objective-head">
        <Icon name="target" size={14} aria-hidden="true" />
        <span>Mục tiêu của bạn</span>
      </div>
      <p className="jw-rw-objective-text">{scenario.purpose}</p>
    </section>
  )
}