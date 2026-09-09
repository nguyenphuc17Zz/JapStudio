import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Icon, type IconName } from '../icons/Icon'

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  selected?: boolean
  icon?: IconName
  children: ReactNode
  className?: string
}

export function Chip({ selected, icon, children, className, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cx('jw-chip', selected && 'jw-chip--selected', className)}
      {...rest}
    >
      {icon ? <Icon name={icon} size={13} aria-hidden="true" /> : null}
      {children}
    </button>
  )
}