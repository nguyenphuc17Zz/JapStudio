import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { cx } from '../../lib/cx'
import { FormField } from './FormField'

export interface ComboboxOption {
  value: string
  label: string
  disabled?: boolean
}

export interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  description?: string
  error?: string
  disabled?: boolean
  emptyText?: string
  className?: string
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  label,
  description,
  error,
  disabled,
  emptyText = 'Không có lựa chọn phù hợp',
  className,
}: ComboboxProps) {
  const autoId = useId()
  const inputId = autoId
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((option) => option.value === value)
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const close = () => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }

  const select = (option: ComboboxOption) => {
    if (option.disabled) return
    onChange(option.value)
    close()
    inputRef.current?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (filtered.length === 0 ? 0 : (index + 1) % filtered.length))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) =>
        filtered.length === 0 ? 0 : (index - 1 + filtered.length) % filtered.length,
      )
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (open && filtered[activeIndex]) {
        select(filtered[activeIndex])
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'Tab') {
      close()
    }
  }

  return (
    <FormField id={inputId} label={label} description={description} error={error} className={className}>
      <div className="jw-combobox">
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${inputId}-listbox`}
          aria-activedescendant={open && filtered[activeIndex] ? `${inputId}-option-${activeIndex}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          className="jw-input"
          value={open ? query : (selected?.label ?? '')}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => {
            setOpen(true)
            setQuery('')
          }}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => close()}
        />
        {open ? (
          <div className="jw-combobox-pop" id={`${inputId}-listbox`} role="listbox">
            {filtered.length === 0 ? (
              <div className="jw-combobox-empty">{emptyText}</div>
            ) : (
              filtered.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  id={`${inputId}-option-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  data-active={index === activeIndex}
                  className={cx('jw-combobox-option', option.disabled && 'jw-combobox-option--disabled')}
                  disabled={option.disabled}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(option)}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    </FormField>
  )
}