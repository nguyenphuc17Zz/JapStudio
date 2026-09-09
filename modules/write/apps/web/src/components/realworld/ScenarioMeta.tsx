import type { WritingScenario } from '../../types/api'
import { genreLabel, mediumLabel, registerLabel, toneLabel } from './labels'

export function ScenarioMeta({ scenario }: { scenario: WritingScenario }) {
  return (
    <div className="jw-rw-chip-row" aria-label="Thông tin tình huống">
      <span className="jw-rw-chip jw-rw-chip--accent">
        {genreLabel(scenario.genre)}
      </span>
      <span className="jw-rw-chip">{mediumLabel(scenario.medium)}</span>
      {scenario.audience ? (
        <span className="jw-rw-chip">
          Đối tượng: {scenario.audience}
        </span>
      ) : null}
      {scenario.purpose ? (
        <span className="jw-rw-chip">
          Mục đích: {scenario.purpose}
        </span>
      ) : null}
      <span className="jw-rw-chip">{registerLabel(scenario.register)}</span>
      {scenario.tone ? (
        <span className="jw-rw-chip">{toneLabel(scenario.tone)}</span>
      ) : null}
      <span className="jw-rw-chip">JLPT {scenario.jlpt_level}</span>
      <span className="jw-rw-chip">Độ khó {scenario.difficulty}/10</span>
    </div>
  )
}