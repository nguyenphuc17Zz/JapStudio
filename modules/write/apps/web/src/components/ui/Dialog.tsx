import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../../lib/cx'
import { IconButton } from './IconButton'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  closeOnOverlay?: boolean
  showCloseButton?: boolean
  className?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
  showCloseButton = true,
  className,
}: DialogProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement as HTMLElement | null

    const previouslyOverflowing = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    const focusables = panel
      ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      : []
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (first) {
      first.focus()
    } else {
      panel?.focus()
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'Tab') {
        if (!focusables.length || !document.activeElement) return
        const isOutside = !panel?.contains(document.activeElement)
        if (isOutside) {
          event.preventDefault()
          first?.focus()
          return
        }
        const firstActive = document.activeElement === first
        const lastActive = document.activeElement === last
        if (event.shiftKey && firstActive) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && lastActive) {
          event.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previouslyOverflowing
      previousFocusRef.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="jw-dialog-overlay" onPointerDown={closeOnOverlay ? onClose : undefined}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx('jw-dialog', size !== 'md' && `jw-dialog--${size}`, className)}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="jw-dialog-header">
          <h3 className="jw-dialog-title" id={titleId}>
            {title}
          </h3>
          {showCloseButton ? <IconButton label="Đóng" icon="x" size="sm" onClick={onClose} /> : null}
        </div>
        <div className="jw-dialog-content">{children}</div>
        {footer ? <div className="jw-dialog-actions">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}