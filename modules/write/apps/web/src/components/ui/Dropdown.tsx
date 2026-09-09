import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Icon, type IconName } from '../icons/Icon'

export interface DropdownItem {
  id: string
  label: ReactNode
  icon?: IconName
  danger?: boolean
  disabled?: boolean
  onSelect?: () => void
}

export interface DropdownProps {
  trigger: ReactNode
  items: DropdownItem[]
  label: string
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ trigger, items, label, align = 'left', className }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(true)
    }
  }

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const enabled = items.filter((item) => !item.disabled)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % enabled.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + enabled.length) % enabled.length)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(enabled.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      enabled[activeIndex]?.onSelect?.()
      setOpen(false)
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  const enabledItems = items.filter((item) => !item.disabled)

  return (
    <div ref={rootRef} className={cx('jw-dropdown', className)} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onKeyDown={handleTriggerKeyDown}
        onClick={() => setOpen((value) => !value)}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className="jw-dropdown-menu"
          style={align === 'right' ? { left: 'auto', right: 0 } : undefined}
          onKeyDown={handleMenuKeyDown}
        >
          {enabledItems.map((item, index) => (
            <div key={item.id} role="none">
              <button
                type="button"
                role="menuitem"
                aria-disabled={item.disabled}
                className={cx('jw-dropdown-item', item.danger && 'jw-dropdown-item--danger')}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  item.onSelect?.()
                  setOpen(false)
                }}
              >
                {item.icon ? <Icon name={item.icon} size={15} aria-hidden="true" /> : null}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}