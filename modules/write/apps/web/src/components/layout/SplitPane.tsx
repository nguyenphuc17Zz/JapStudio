import type { CSSProperties, ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { IconButton } from '../ui/IconButton'

export interface SplitPaneProps {
  left: ReactNode
  right: ReactNode
  /** Left pane share of the width, e.g. 0.6 (default 0.5) */
  ratio?: number
  /** Show a collapse button that hides one side */
  collapsible?: boolean
  collapsed?: boolean
  collapsedSide?: 'left' | 'right'
  onToggleCollapse?: () => void
  collapseLabel?: string
  className?: string
}

export function SplitPane({
  left,
  right,
  ratio = 0.5,
  collapsible = false,
  collapsed = false,
  collapsedSide = 'left',
  onToggleCollapse,
  collapseLabel = 'Thu gọn',
  className,
}: SplitPaneProps) {
  const clampedRatio = Math.max(0.2, Math.min(0.8, ratio))
  return (
    <div
      className={cx(
        'jw-split',
        collapsible && collapsed && `jw-split--collapsed-${collapsedSide}`,
        className,
      )}
      style={
        collapsible && collapsed
          ? undefined
          : ({ '--jw-split-cols': `${clampedRatio}fr 1fr` } as CSSProperties)
      }
    >
      <div className="jw-split-pane jw-split-pane--left">
        {left}
        {collapsible ? (
          <div style={{ marginTop: 'var(--space-sm)' }}>
            <IconButton label={collapseLabel} icon="collapse" size="sm" onClick={onToggleCollapse} />
          </div>
        ) : null}
      </div>
      <div className="jw-split-pane jw-split-pane--right">
        {right}
        {collapsible ? (
          <div style={{ marginTop: 'var(--space-sm)', textAlign: 'right' }}>
            <IconButton label={collapseLabel} icon="collapse" size="sm" onClick={onToggleCollapse} />
          </div>
        ) : null}
      </div>
    </div>
  )
}