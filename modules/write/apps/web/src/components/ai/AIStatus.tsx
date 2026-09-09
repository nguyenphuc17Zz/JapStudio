import { cx } from '../../lib/cx'
import { Icon } from '../icons/Icon'

export type AIStatusState = 'idle' | 'thinking' | 'done' | 'error'

export interface AIStatusProps {
  state?: AIStatusState
  label?: string
  className?: string
}

const DEFAULT_LABELS: Record<AIStatusState, string> = {
  idle: 'Sẵn sàng',
  thinking: 'Thinking…',
  done: 'Xong',
  error: 'Lỗi',
}

export function AIStatus({ state = 'idle', label, className }: AIStatusProps) {
  return (
    <span
      className={cx('jw-ai-status', state === 'thinking' && 'jw-ai-status--thinking', className)}
      role="status"
    >
      <Icon
        name={state === 'error' ? 'alert' : state === 'done' ? 'check' : 'sparkles'}
        size={13}
        className="jw-ai-status-icon"
        aria-hidden="true"
      />
      {label ?? DEFAULT_LABELS[state]}
    </span>
  )
}