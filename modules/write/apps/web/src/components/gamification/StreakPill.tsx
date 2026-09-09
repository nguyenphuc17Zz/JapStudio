import { cx } from '../../lib/cx'
import { Icon } from '../icons/Icon'

export interface StreakPillProps {
  streak: number
  /** Compact mode hides the label, shows only icon + number */
  compact?: boolean
  className?: string
}

/**
 * Compact streak indicator. Used in sidebar footer and summary screens.
 */
export function StreakPill({ streak, compact = false, className }: StreakPillProps) {
  if (streak <= 0) return null
  return (
    <span
      className={cx('jw-streak-pill', compact && 'jw-streak-pill--compact', className)}
      aria-label={`${streak} ngày liên tiếp`}
      title={`${streak} ngày liên tiếp`}
    >
      <Icon name="flame" size={13} aria-hidden="true" className="jw-streak-pill-icon" />
      <span className="jw-streak-pill-count">{streak}</span>
      {!compact && <span className="jw-streak-pill-label" aria-hidden="true"> ngày</span>}
    </span>
  )
}
