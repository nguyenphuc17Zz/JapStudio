import { useId, type ReactNode } from 'react'
import { cx } from '../../lib/cx'

export interface TooltipProps {
  label: ReactNode
  side?: 'top' | 'bottom'
  children: ReactNode
  className?: string
}

export function Tooltip({ label, side = 'top', children, className }: TooltipProps) {
  const autoId = useId()
  return (
    <span className={cx('jw-tooltip', side === 'bottom' && 'jw-tooltip--bottom', className)}>
      {children}
      <span className="jw-tooltip-pop" role="tooltip" id={autoId}>
        {label}
      </span>
    </span>
  )
}