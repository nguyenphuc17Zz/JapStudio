import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Icon } from '../icons/Icon'
import { Button } from '../ui/Button'

export interface AIHintProps {
  hint: ReactNode
  /** 1-based index of the current hint */
  index: number
  total: number
  onMore?: () => void
  moreLabel?: string
  moreDisabled?: boolean
  className?: string
}

export function AIHint({
  hint,
  index,
  total,
  onMore,
  moreLabel = 'Another hint',
  moreDisabled = false,
  className,
}: AIHintProps) {
  return (
    <section className={cx('jw-ai-surface', className)} aria-label="AI Hint">
      <div className="jw-ai-head">
        <Icon name="hint" size={14} className="jw-ai-icon" aria-hidden="true" />
        <span className="jw-ai-title">
          Hint {index} / {total}
        </span>
      </div>
      <div className="jw-ai-text">{hint}</div>
      <div className="jw-ai-dots" aria-hidden="true">
        {Array.from({ length: total }, (_, dotIndex) => (
          <span key={dotIndex} className={cx('jw-ai-dot', dotIndex < index && 'jw-ai-dot--active')} />
        ))}
      </div>
      {onMore ? (
        <div className="jw-ai-actions">
          <Button variant="ghost" size="sm" icon="hint" onClick={onMore} disabled={moreDisabled}>
            {moreLabel}
          </Button>
        </div>
      ) : null}
    </section>
  )
}