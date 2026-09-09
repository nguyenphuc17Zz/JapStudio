import { cx } from '../../lib/cx'
import { Button } from '../ui/Button'
import { Icon } from '../icons/Icon'

export interface LearningModePanelProps {
  hintsTotal: number
  hints: string[]
  revealAvailable: boolean
  revealed: boolean
  hintPending: boolean
  revealPending: boolean
  onNextHint: () => void
  onReveal: () => void
}

export function LearningModePanel({
  hintsTotal,
  hints,
  revealAvailable,
  revealed,
  hintPending,
  revealPending,
  onNextHint,
  onReveal,
}: LearningModePanelProps) {
  if (revealed) return null

  const exhausted = hints.length >= hintsTotal

  return (
    <div className="jw-fb-hint" aria-label="Chế độ học tập">
      <div className="jw-fb-hint-head">
        <Icon name="hint" size={14} aria-hidden="true" />
        <span>Gợi ý {hints.length} / {hintsTotal}</span>
        <span className="jw-fb-hint-dots" aria-hidden="true">
          {Array.from({ length: hintsTotal }, (_, dotIndex) => (
            <span key={dotIndex} className={cx(dotIndex < hints.length && 'on')} />
          ))}
        </span>
      </div>
      {hints.length > 0 ? (
        <p className="jw-fb-hint-text">{hints[hints.length - 1]}</p>
      ) : (
        <p className="jw-fb-hint-intro">
          Chưa có gợi ý nào. Nhấn 'Gợi ý tiếp theo' để nhận gợi ý đầu tiên.
        </p>
      )}
      {!exhausted ? (
        <Button variant="ghost" size="sm" icon="hint" onClick={onNextHint} disabled={hintPending}>
          {hintPending ? 'Đang tạo gợi ý...' : 'Gợi ý tiếp theo'}
        </Button>
      ) : revealAvailable ? (
        <div className="jw-fb-reveal">
          <Button onClick={onReveal} disabled={revealPending}>
            {revealPending ? 'Đang xem đáp án...' : 'Xem đáp án'}
          </Button>
          <p className="jw-fb-hint-intro">
            Bạn đã sẵn sàng xem đáp án chưa? Hãy thử sửa lại trước nhé.
          </p>
        </div>
      ) : null}
    </div>
  )
}