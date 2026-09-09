import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

export type SkeletonVariant = 'text' | 'card' | 'score' | 'list' | 'table' | 'timeline' | 'dashboard'

export interface SkeletonProps {
  variant?: SkeletonVariant
  /** Number of lines for text-like variants */
  lines?: number
  className?: string
}

function SkeletonLines({ lines }: { lines: number }) {
  return (
    <div className="jw-skeleton-list" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <span
          key={index}
          className="jw-skeleton jw-skeleton--text"
          style={index === lines - 1 ? { width: '70%' } : undefined}
        />
      ))}
    </div>
  )
}

function SkeletonTable() {
  return (
    <div className="jw-skeleton-table" aria-hidden="true">
      <span className="jw-skeleton jw-skeleton--text" style={{ width: '30%' }} />
      <span className="jw-skeleton jw-skeleton--row" />
      <span className="jw-skeleton jw-skeleton--row" />
      <span className="jw-skeleton jw-skeleton--row" style={{ width: '80%' }} />
    </div>
  )
}

function SkeletonTimeline() {
  return (
    <div className="jw-skeleton-timeline" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
          <span className="jw-skeleton" style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, marginTop: 4 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="jw-skeleton jw-skeleton--text" style={{ width: '50%' }} />
            <span className="jw-skeleton jw-skeleton--text" />
          </div>
        </div>
      ))}
    </div>
  )
}

function SkeletonDashboard() {
  return (
    <div className="jw-skeleton-dashboard" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <span key={index} className="jw-skeleton jw-skeleton--card" />
      ))}
    </div>
  )
}

export function Skeleton({ variant = 'text', lines = 3, className }: SkeletonProps) {
  let content: ReactNode = null
  if (variant === 'text') {
    content = <SkeletonLines lines={lines} />
  } else if (variant === 'table') {
    content = <SkeletonTable />
  } else if (variant === 'timeline') {
    content = <SkeletonTimeline />
  } else if (variant === 'dashboard') {
    content = <SkeletonDashboard />
  } else if (variant === 'list') {
    content = (
      <div className="jw-skeleton-list" aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <span key={index} className="jw-skeleton jw-skeleton--row" style={index === lines - 1 ? { width: '85%' } : undefined} />
        ))}
      </div>
    )
  } else {
    content = <span className={cx('jw-skeleton', `jw-skeleton--${variant}`)} aria-hidden="true" />
  }

  return (
    <div className={cx('jw-skeleton-group', className)} role="status" aria-label="Đang tải">
      {content}
      <span className="jw-sr-only">Đang tải…</span>
    </div>
  )
}