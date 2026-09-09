import type { InputHTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'> {
  label: ReactNode
  description?: ReactNode
  className?: string
}

export function Switch({ label, description, className, disabled, ...rest }: SwitchProps) {
  return (
    <label className={cx('jw-switch-label', className)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <span className="jw-switch">
        <input type="checkbox" role="switch" disabled={disabled} {...rest} />
        <span className="jw-switch-track" aria-hidden="true" />
        <span className="jw-switch-thumb" aria-hidden="true" />
      </span>
      <span>
        <span style={{ fontSize: 'var(--text-body-sm)' }}>{label}</span>
        {description ? (
          <span className="jw-field-description" style={{ display: 'block', marginTop: 2 }}>
            {description}
          </span>
        ) : null}
      </span>
    </label>
  )
}