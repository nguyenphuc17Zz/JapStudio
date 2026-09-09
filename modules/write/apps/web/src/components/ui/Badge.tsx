import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Icon, type IconName } from '../icons/Icon'
import { badgeToneFor, type BadgeKind, type BadgeTone } from './badgeTone'

export type { BadgeKind, BadgeTone }

export interface BadgeProps {
  tone?: BadgeTone
  kind?: BadgeKind
  icon?: IconName
  children: ReactNode
  className?: string
}

export function Badge({ tone, kind, icon, children, className }: BadgeProps) {
  return (
    <span className={cx('jw-badge', `jw-badge--${badgeToneFor(kind, tone)}`, className)}>
      {icon ? <Icon name={icon} size={11} aria-hidden="true" /> : null}
      {children}
    </span>
  )
}