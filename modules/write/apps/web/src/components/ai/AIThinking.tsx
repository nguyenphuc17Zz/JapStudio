import { cx } from '../../lib/cx'
import { Icon } from '../icons/Icon'

export interface AIThinkingProps {
  label?: string
  className?: string
}

export function AIThinking({ label = 'Thinking…', className }: AIThinkingProps) {
  return (
    <span className={cx('jw-ai-thinking', className)} role="status">
      <Icon name="sparkles" size={14} className="jw-ai-thinking-icon" aria-hidden="true" />
      <span className="jw-ai-thinking-text">{label}</span>
    </span>
  )
}