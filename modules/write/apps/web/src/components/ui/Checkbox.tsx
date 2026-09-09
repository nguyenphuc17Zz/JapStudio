import type { InputHTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Icon } from '../icons/Icon'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'> {
  label: ReactNode
  description?: ReactNode
  className?: string
}

export function Checkbox({ label, description, className, disabled, ...rest }: CheckboxProps) {
  return (
    <label className={cx('jw-check', disabled && 'jw-check--disabled', className)}>
      <input type="checkbox" disabled={disabled} {...rest} />
      <span className="jw-check-box" aria-hidden="true">
        <Icon name="check" size={12} />
      </span>
      <span>
        {label}
        {description ? (
          <span className="jw-field-description" style={{ display: 'block', marginTop: 2 }}>
            {description}
          </span>
        ) : null}
      </span>
    </label>
  )
}