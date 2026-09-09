import {
  useId,
  useState,
  useRef,
  useEffect,
  Children,
  isValidElement,
  type ReactElement,
  type SelectHTMLAttributes,
  type OptionHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../../lib/cx'
import { Icon } from '../icons/Icon'
import { FormField } from './FormField'
import { sound } from '../../services/sound'

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  label?: string
  description?: string
  error?: string
  counter?: string
  invalid?: boolean
  className?: string
}

interface ParsedOption {
  value: string
  label: string
  disabled?: boolean
}

export function Select({
  label,
  description,
  error,
  counter,
  invalid,
  className,
  id,
  required,
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  ...rest
}: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 220 })
  const selectRef = useRef<HTMLSelectElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Parse option elements from children
  const options: ParsedOption[] = []
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === 'option') {
      const optionElem = child as ReactElement<OptionHTMLAttributes<HTMLOptionElement>>
      options.push({
        value: String(optionElem.props.value ?? ''),
        label: typeof optionElem.props.children === 'string' ? optionElem.props.children : String(optionElem.props.value ?? ''),
        disabled: optionElem.props.disabled,
      })
    }
  })

  // Selected value tracking
  const currentValue = String(value !== undefined ? value : selectRef.current?.value ?? defaultValue ?? (options[0]?.value ?? ''))
  const selectedOption = options.find((o) => o.value === currentValue) ?? options[0]

  // Update floating coordinates when opening
  const MENU_MAX_HEIGHT = 280
  const MENU_GAP = 6
  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const showAbove = spaceBelow < MENU_MAX_HEIGHT && rect.top > MENU_MAX_HEIGHT

      setCoords({
        top: showAbove ? rect.top - MENU_MAX_HEIGHT - MENU_GAP : rect.bottom + MENU_GAP,
        left: rect.left,
        width: Math.max(rect.width, 220),
      })
    }
  }, [open])

  // Close on outside click or scroll
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleScroll = (e: Event) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  const handleSelectOption = (optValue: string) => {
    sound.playClick()
    if (selectRef.current) {
      selectRef.current.value = optValue
      const event = new Event('change', { bubbles: true })
      selectRef.current.dispatchEvent(event)
    }
    setOpen(false)
  }

  const dropdownMenu = open ? (
    <div
      ref={menuRef}
      role="listbox"
      aria-label={label || 'Danh sách lựa chọn'}
      className="jw-combobox-pop"
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        width: coords.width,
        zIndex: 99999,
        maxHeight: MENU_MAX_HEIGHT,
        overflowY: 'auto',
        scrollbarWidth: 'thin',
        background: 'var(--color-surface-elevated)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        padding: '4px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px 6px 8px',
          borderBottom: '1px solid var(--color-border-subtle)',
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: 'var(--color-foreground-muted)',
            textTransform: 'uppercase',
          }}
        >
          Tùy chọn
        </span>
        <span style={{ fontSize: 9.5, color: 'var(--color-foreground-muted)' }}>
          {options.length} mục
        </span>
      </div>

      {options.map((opt) => {
        const isSelected = opt.value === currentValue

        return (
          <button
            key={opt.value}
            type="button"
            role="option"
            aria-selected={isSelected}
            disabled={opt.disabled}
            onClick={() => handleSelectOption(opt.value)}
            className="jw-combobox-option"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              background: isSelected
                ? 'var(--color-ai-muted)'
                : 'transparent',
              border: isSelected ? '1px solid var(--color-ai-border)' : '1px solid transparent',
              color: isSelected ? 'var(--color-on-accent)' : 'var(--color-foreground)',
              fontWeight: isSelected ? 700 : 500,
              fontSize: 13,
              cursor: opt.disabled ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              opacity: opt.disabled ? 0.4 : 1,
              transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={(e) => {
              if (!isSelected && !opt.disabled) {
                e.currentTarget.style.background = 'var(--color-accent-muted)'
                e.currentTarget.style.transform = 'translateX(4px)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected && !opt.disabled) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.transform = 'none'
              }
            }}
          >
            <span>{opt.label}</span>
            {isSelected && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--color-accent)',
                  lineHeight: 1,
                }}
              >
                ✓
              </span>
            )}
          </button>
        )
      })}
    </div>
  ) : null

  return (
    <FormField
      id={selectId}
      label={label}
      description={description}
      error={error}
      counter={counter}
      required={required}
      className={className}
    >
      <div ref={containerRef} className="jw-select-wrap" style={{ position: 'relative' }}>
        {/* Hidden accessible standard select for 100% test & form compatibility */}
        <select
          ref={selectRef}
          id={selectId}
          required={required}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          disabled={disabled}
          className={cx('jw-select', invalid && 'jw-select--invalid')}
          aria-invalid={invalid || error ? true : undefined}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1,
          }}
          {...rest}
        >
          {children}
        </select>

        {/* Japanese Custom Trigger Button */}
        <button
          type="button"
          onClick={() => !disabled && setOpen((v) => !v)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cx('jw-input', invalid && 'jw-input--invalid')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            cursor: disabled ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            paddingRight: 10,
            border: open ? '1px solid var(--color-accent)' : undefined,
            boxShadow: open ? '0 0 0 3px var(--color-accent-muted), 0 0 16px var(--color-ai-glow)' : undefined,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
            {selectedOption?.label ?? 'Chọn một mục...'}
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              borderRadius: 'var(--radius-sm)',
              background: open ? 'var(--color-surface-hover)' : 'transparent',
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease',
              flexShrink: 0,
            }}
          >
            <Icon name="chevron-down" size={13} style={{ color: open ? 'var(--color-accent)' : 'var(--color-foreground-muted)' }} />
          </div>
        </button>

        {/* Portaled Makimono Menu to body to prevent any container clipping */}
        {typeof document !== 'undefined' && open && dropdownMenu
          ? createPortal(dropdownMenu, document.body)
          : null}
      </div>
    </FormField>
  )
}