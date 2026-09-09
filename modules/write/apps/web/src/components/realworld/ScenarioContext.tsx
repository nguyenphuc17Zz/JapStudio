import type { WritingScenario } from '../../types/api'
import { Icon } from '../icons/Icon'

export function ScenarioContext({ scenario }: { scenario: WritingScenario }) {
  return (
    <section className="jw-rw-card jw-rw-context" aria-label="Tình huống">
      <div className="jw-rw-card-eyebrow">
        <Icon name="briefcase" size={13} aria-hidden="true" />
        <span>Tình huống</span>
      </div>
      <p className="jw-rw-situation">{scenario.situation_vi}</p>
      {scenario.context_vi ? (
        <p className="jw-rw-context-text">{scenario.context_vi}</p>
      ) : null}
    </section>
  )
}