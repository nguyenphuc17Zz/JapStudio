import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { AIStatus, type AIStatusState } from './AIStatus'
import { AIThinking } from './AIThinking'
import { AISuggestion } from './AISuggestion'
import { Alert } from '../ui/Alert'

export interface AICoachMessageProps {
  role: 'user' | 'ai'
  /** Content of the message; omitted while loading or in error state */
  children?: ReactNode
  /** AI turn is being generated — shows a calm thinking state instead of a fake typing delay */
  loading?: boolean
  error?: string
  /** Suggested prompts offered after an AI message */
  suggestions?: ReactNode[]
  onSuggestion?: (index: number) => void
  className?: string
}

export function AICoachMessage({
  role,
  children,
  loading = false,
  error,
  suggestions,
  onSuggestion,
  className,
}: AICoachMessageProps) {
  const state: AIStatusState = loading ? 'thinking' : error ? 'error' : 'done'

  if (loading) {
    return (
      <div className={cx('jw-ai-coach-loading', className)}>
        <AIThinking />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cx('jw-ai-coach-error', className)}>
        <Alert tone="error">{error}</Alert>
      </div>
    )
  }

  return (
    <div className={cx('jw-ai-bubble', role === 'ai' ? 'jw-ai-bubble--ai' : 'jw-ai-bubble--user', className)}>
      {role === 'ai' ? (
        <span className="jw-ai-head" style={{ marginBottom: 4 }}>
          <AIStatus state={state} />
        </span>
      ) : null}
      {children}
      {role === 'ai' && suggestions && suggestions.length > 0 ? (
        <div className="jw-ai-suggested">
          {suggestions.map((suggestion, index) => (
            <AISuggestion key={index} onSelect={onSuggestion ? () => onSuggestion(index) : undefined}>
              {suggestion}
            </AISuggestion>
          ))}
        </div>
      ) : null}
    </div>
  )
}