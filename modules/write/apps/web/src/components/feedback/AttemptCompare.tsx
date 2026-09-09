import { cx } from '../../lib/cx'
import type { AttemptEvaluationResponse } from '../../types/api'
import { DIMENSION_ORDER } from './labels'

export interface AttemptCompareProps {
  previous: AttemptEvaluationResponse
  current: AttemptEvaluationResponse
}

export function AttemptCompare({ previous, current }: AttemptCompareProps) {
  const prevScore = previous.scores.overall_score
  const curScore = current.scores.overall_score
  const overallDelta = curScore - prevScore
  const deltas = DIMENSION_ORDER.map(({ key, label }) => {
    const delta = current.scores[key] - previous.scores[key]
    return { label, delta }
  })

  return (
    <div className="jw-fb-compare">
      <h3 className="jw-fb-compare-title">
        Lần {previous.attempt_number}: {prevScore} → Lần {current.attempt_number}: {curScore}{' '}
        <span
          className={cx(
            'jw-delta',
            overallDelta > 0 ? 'jw-delta--up' : overallDelta < 0 ? 'jw-delta--down' : 'jw-delta--flat',
          )}
        >
          {overallDelta > 0 ? '↑ +' : overallDelta < 0 ? '↓ ' : ''}
          {overallDelta !== 0 ? overallDelta : 'không đổi'}
        </span>
      </h3>
      {deltas.some(({ delta }) => delta !== 0) ? (
        <ul className="jw-fb-compare-deltas">
          {deltas.map(({ label, delta }) =>
            delta === 0 ? null : (
              <li key={label}>
                <span>{label}</span>
                <span
                  className={cx(
                    'jw-delta',
                    delta > 0 ? 'jw-delta--up' : 'jw-delta--down',
                  )}
                >
                  {delta > 0 ? '↑ +' : '↓ '}
                  {Math.abs(delta)}
                </span>
              </li>
            ),
          )}
        </ul>
      ) : null}
    </div>
  )
}