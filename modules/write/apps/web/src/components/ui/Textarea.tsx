import { useId, type TextareaHTMLAttributes } from 'react'
import { cx } from '../../lib/cx'
import { FormField } from './FormField'

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  label?: string
  description?: string
  error?: string
  counter?: string
  invalid?: boolean
  className?: string
}

export function Textarea({
  label,
  description,
  error,
  counter,
  invalid,
  className,
  id,
  required,
  rows = 5,
  ...rest
}: TextareaProps) {
  const autoId = useId()
  const textareaId = id ?? autoId
  return (
    <FormField
      id={textareaId}
      label={label}
      description={description}
      error={error}
      counter={counter}
      required={required}
      className={className}
    >
      <textarea
        id={textareaId}
        rows={rows}
        required={required}
        className={cx('jw-textarea', invalid && 'jw-textarea--invalid')}
        aria-invalid={invalid || error ? true : undefined}
        {...rest}
      />
    </FormField>
  )
}