import type { InputHTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'> {
  label: ReactNode
  description?: ReactNode
  className?: string
}

export function Radio({ label, description, className, disabled, ...rest }: RadioProps) {
  return (
    <label className={cx('jw-radio-label', disabled && 'jw-radio-label--disabled', className)}>
      <input type="radio" disabled={disabled} {...rest} />
      <span className="jw-radio-circle" aria-hidden="true">
        <span className="jw-radio-dot" />
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