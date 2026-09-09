import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'

export interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical'
  /** Optional label renders a centered divider with text. */
  label?: ReactNode
}

export function Divider({ orientation = 'horizontal', label, className, ...rest }: DividerProps) {
  if (label) {
    return (
      <div className={cx('jw-divider jw-divider--label', className)} role="separator" {...rest}>
        <span className="jw-divider-label">{label}</span>
      </div>
    )
  }
  return (
    <hr
      role="separator"
      aria-orientation={orientation}
      className={cx('jw-divider', orientation === 'vertical' && 'jw-divider--vertical', className)}
      {...rest}
    />
  )
}