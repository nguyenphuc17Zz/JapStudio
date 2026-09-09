import { useId, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Icon } from '../icons/Icon'

export interface FormFieldProps {
  id?: string
  label?: string
  description?: string
  error?: string
  counter?: string
  required?: boolean
  className?: string
  children: ReactNode
}

export function FormField({
  id,
  label,
  description,
  error,
  counter,
  required,
  className,
  children,
}: FormFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId

  return (
    <div className={cx('jw-field', className)}>
      {(label || counter) && (
        <div className="jw-field-header">
          {label ? (
            <label className="jw-field-label" htmlFor={fieldId}>
              {label}
              {required ? <span className="jw-field-required"> *</span> : null}
            </label>
          ) : null}
          {counter ? <span className="jw-field-counter">{counter}</span> : null}
        </div>
      )}
      {description ? (
        <span className="jw-field-description" id={`${fieldId}-desc`}>
          {description}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="jw-field-error" id={`${fieldId}-error`} role="alert">
          <Icon name="alert" size={13} />
          {error}
        </span>
      ) : null}
    </div>
  )
}