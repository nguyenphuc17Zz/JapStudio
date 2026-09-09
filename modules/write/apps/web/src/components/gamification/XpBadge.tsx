import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Icon } from '../icons/Icon'

export interface XpBadgeProps {
  xp: number
  /** Show the badge inline or as a floating overlay */
  variant?: 'inline' | 'overlay'
  className?: string
}

/**
 * XP gain badge shown after exercise/challenge completion.
 * Subtle animation that respects reduced-motion preference.
 */
export function XpBadge({ xp, variant = 'inline', className }: XpBadgeProps) {
  if (xp <= 0) return null
  return (
    <div
      className={cx('jw-xp-badge', `jw-xp-badge--${variant}`, className)}
      role="status"
      aria-label={`Nhận được ${xp} XP`}
    >
      <Icon name="zap" size={13} aria-hidden="true" className="jw-xp-badge-icon" />
      <span className="jw-xp-badge-value">+{xp} XP</span>
    </div>
  )
}

export interface LevelUpBannerProps {
  level: number
  children?: ReactNode
}

/**
 * Level-up announcement banner. Animated, respects reduced-motion.
 */
export function LevelUpBanner({ level, children }: LevelUpBannerProps) {
  return (
    <div className="jw-level-up" role="status" aria-live="polite">
      <span className="jw-level-up-icon" aria-hidden="true">✦</span>
      <span className="jw-level-up-text">
        Lên cấp {level}!
      </span>
      {children}
    </div>
  )
}
