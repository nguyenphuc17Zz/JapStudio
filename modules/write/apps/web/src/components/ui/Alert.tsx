import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Icon, type IconName } from '../icons/Icon'

export type AlertTone = 'info' | 'success' | 'warning' | 'error'

const ICONS: Record<AlertTone, IconName> = {
  info: 'info',
  success: 'check',
  warning: 'alert',
  error: 'alert',
}

export interface AlertProps {
  tone?: AlertTone
  title?: ReactNode
  children?: ReactNode
  className?: string
}

export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  return (
    <div
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      className={cx('jw-alert', `jw-alert--${tone}`, className)}
    >
      <span className="jw-alert-icon" aria-hidden="true">
        <Icon name={ICONS[tone]} size={16} />
      </span>
      <div>
        {title ? <div className="jw-alert-title">{title}</div> : null}
        {children ? <div className="jw-alert-desc">{children}</div> : null}
      </div>
    </div>
  )
}