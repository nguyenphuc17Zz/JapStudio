import { cx } from '../../lib/cx'

export interface LevelProgressProps {
  level: number
  currentXp: number
  /** XP earned within the current level (not total) */
  xpInLevel: number
  /** XP needed to reach the next level from the start of this level */
  xpToNext: number
  /** Collapsed: show icon only, no text */
  collapsed?: boolean
  className?: string
}

/**
 * Level + XP progress bar used in the sidebar footer.
 * Compact but informative.
 */
export function LevelProgress({
  level,
  currentXp,
  xpInLevel,
  xpToNext,
  collapsed = false,
  className,
}: LevelProgressProps) {
  const totalInLevel = xpInLevel + xpToNext
  const pct = totalInLevel > 0 ? Math.min(100, (xpInLevel / totalInLevel) * 100) : 0

  return (
    <div className={cx('jw-level-progress', collapsed && 'jw-level-progress--collapsed', className)}>
      {!collapsed && (
        <div className="jw-level-progress-meta">
          <span className="jw-level-progress-label">
            Cấp {level} · {currentXp} XP
          </span>
        </div>
      )}
      <div
        className="jw-level-progress-track"
        role="progressbar"
        aria-label={`Cấp ${level} — ${xpInLevel} / ${totalInLevel} XP`}
        aria-valuenow={xpInLevel}
        aria-valuemin={0}
        aria-valuemax={totalInLevel}
      >
        <div
          className="jw-level-progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      {!collapsed && xpToNext > 0 && (
        <span className="jw-level-progress-hint">
          còn {xpToNext} XP lên cấp {level + 1}
        </span>
      )}
    </div>
  )
}
