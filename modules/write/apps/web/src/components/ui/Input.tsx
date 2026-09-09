import { useId, type InputHTMLAttributes } from 'react'
import { cx } from '../../lib/cx'
import { FormField } from './FormField'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string
  description?: string
  error?: string
  counter?: string
  invalid?: boolean
  className?: string
}

export function Input({
  label,
  description,
  error,
  counter,
  invalid,
  type = 'text',
  className,
  id,
  required,
  ...rest
}: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FormField
      id={inputId}
      label={label}
      description={description}
      error={error}
      counter={counter}
      required={required}
      className={className}
    >
      <div className="jw-input-wrap">
        <input
          id={inputId}
          type={type}
          required={required}
          className={cx('jw-input', invalid && 'jw-input--invalid')}
          aria-invalid={invalid || error ? true : undefined}
          {...rest}
        />
      </div>
    </FormField>
  )
}