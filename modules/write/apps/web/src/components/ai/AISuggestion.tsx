import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Icon } from '../icons/Icon'

export interface AISuggestionProps {
  children: ReactNode
  onSelect?: () => void
  disabled?: boolean
  className?: string
}

export function AISuggestion({ children, onSelect, disabled, className }: AISuggestionProps) {
  return (
    <button
      type="button"
      className={cx('jw-ai-suggestion', className)}
      onClick={onSelect}
      disabled={disabled}
    >
      <Icon name="sparkles" size={12} aria-hidden="true" />
      {children}
    </button>
  )
}