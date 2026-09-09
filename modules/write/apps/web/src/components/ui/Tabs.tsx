import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../../lib/cx'

export interface TabItem {
  id: string
  label: ReactNode
  content?: ReactNode
  disabled?: boolean
}

export interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  variant?: 'underline' | 'pills'
  className?: string
}

export function Tabs({ items, value, onChange, variant = 'underline', className }: TabsProps) {
  const autoId = useId()
  const tablistRef = useRef<HTMLDivElement>(null)
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === value),
  )

  const selectIndex = (index: number) => {
    const target = items[index]
    if (!target || target.disabled) return
    onChange(target.id)
    const tab = tablistRef.current?.querySelector<HTMLButtonElement>(
      `[data-tab-id="${target.id}"]`,
    )
    tab?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let next = -1
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = (activeIndex + 1) % items.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = (activeIndex - 1 + items.length) % items.length
    } else if (event.key === 'Home') {
      next = 0
    } else if (event.key === 'End') {
      next = items.length - 1
    }
    if (next >= 0) {
      event.preventDefault()
      let candidate = next
      let guard = 0
      while (items[candidate]?.disabled && guard < items.length) {
        candidate = (candidate + 1) % items.length
        guard += 1
      }
      selectIndex(candidate)
    }
  }

  const selected = items.find((item) => item.id === value)

  return (
    <div className={cx('jw-tabs', variant === 'pills' && 'jw-tabs--pills', className)}>
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Tabs"
        className="jw-tablist"
        onKeyDown={handleKeyDown}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${autoId}-tab-${item.id}`}
            data-tab-id={item.id}
            aria-selected={item.id === value}
            aria-controls={`${autoId}-panel-${item.id}`}
            tabIndex={item.id === value ? 0 : -1}
            disabled={item.disabled}
            className="jw-tab"
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {selected ? (
        <div
          role="tabpanel"
          id={`${autoId}-panel-${selected.id}`}
          aria-labelledby={`${autoId}-tab-${selected.id}`}
          className="jw-tabpanel"
        >
          {selected.content}
        </div>
      ) : null}
    </div>
  )
}