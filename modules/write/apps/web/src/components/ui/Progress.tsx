import { useId, type ReactNode } from 'react'
import { cx } from '../../lib/cx'

export type ProgressTone = 'accent' | 'success' | 'warning' | 'error' | 'info' | 'ai'

export interface ProgressBarProps {
  value: number
  max?: number
  tone?: ProgressTone
  size?: 'sm' | 'md' | 'lg'
  label?: ReactNode
  showValue?: boolean
  className?: string
}

function clamp(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(max, value))
}

export function ProgressBar({
  value,
  max = 100,
  tone = 'accent',
  size = 'md',
  label,
  showValue = false,
  className,
}: ProgressBarProps) {
  const clamped = clamp(value, max)
  const percent = max === 0 ? 0 : (clamped / max) * 100
  const labelId = useId()
  return (
    <div
      className={cx('jw-progress-row', className)}
      role={label ? 'group' : undefined}
      aria-labelledby={label ? labelId : undefined}
    >
      {label ? (
        <span className="jw-progress-label score-label" id={labelId}>
          {label}
        </span>
      ) : null}
      <div
        className={cx('jw-progress', `jw-progress--${size}`)}
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cx('jw-progress-fill', tone !== 'accent' && `jw-progress-fill--${tone}`)}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showValue ? <span className="jw-progress-value">{Math.round(clamped)}</span> : null}
    </div>
  )
}

/* ---------- Ring ---------- */

export interface ProgressRingProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  tone?: ProgressTone
  label?: ReactNode
  caption?: ReactNode
  className?: string
}

export function ProgressRing({
  value,
  max = 100,
  size = 64,
  strokeWidth = 6,
  tone = 'accent',
  label,
  caption,
  className,
}: ProgressRingProps) {
  const clamped = clamp(value, max)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / max)
  const labelId = useId()
  return (
    <div
      className={cx('jw-ring', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-labelledby={label ? labelId : undefined}
    >
      <svg className="jw-ring-svg" width={size} height={size} aria-hidden="true">
        <circle
          className="jw-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
        />
        <circle
          className={cx('jw-ring-fill', tone !== 'accent' && `jw-ring-fill--${tone}`)}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {label ? (
        <div className="jw-ring-label" id={labelId} style={{ fontSize: size / 3.2 }}>
          {label}
        </div>
      ) : null}
      {caption ? <div className="jw-ring-caption">{caption}</div> : null}
    </div>
  )
}

/* ---------- ScoreRing ---------- */

export interface ScoreRingProps {
  value: number
  max?: number
  size?: number
  tone?: ProgressTone
  label?: ReactNode
  caption?: ReactNode
  className?: string
}

export function ScoreRing({ value, max = 100, size = 88, tone, label, caption, className }: ScoreRingProps) {
  return (
    <div className={cx('jw-score-ring', className)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <ProgressRing
        value={value}
        max={max}
        size={size}
        strokeWidth={7}
        tone={tone}
        label={label ?? Math.round(clampScore(value, max))}
      />
      {caption ? <div className="jw-ring-caption">{caption}</div> : null}
    </div>
  )
}

function clampScore(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(max, value))
}

/* ---------- SkillBar ---------- */

export interface SkillBarProps {
  label: ReactNode
  value: number
  max?: number
  tone?: ProgressTone
  showValue?: boolean
  className?: string
}

export function SkillBar({ label, value, max = 100, tone = 'accent', showValue = true, className }: SkillBarProps) {
  return (
    <ProgressBar
      label={label}
      value={value}
      max={max}
      tone={tone}
      showValue={showValue}
      className={className}
    />
  )
}

/* ---------- GoalProgress ---------- */

export interface GoalProgressProps {
  label: ReactNode
  value: number
  target: number
  tone?: ProgressTone
  className?: string
}

export function GoalProgress({ label, value, target, tone = 'accent', className }: GoalProgressProps) {
  const remaining = Math.max(0, target - value)
  return (
    <div className={cx('jw-progress-row', className)} role="group">
      <span className="jw-progress-label">{label}</span>
      <div className="jw-progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={target}>
        <div
          className={cx('jw-progress-fill', tone !== 'accent' && `jw-progress-fill--${tone}`)}
          style={{ width: `${target === 0 ? 0 : Math.min(100, (value / target) * 100)}%` }}
        />
      </div>
      <span className="jw-progress-value">
        {value}/{target}
        {remaining > 0 ? ` · còn ${remaining}` : ''}
      </span>
    </div>
  )
}

/* ---------- XPProgress ---------- */

export interface XPProgressProps {
  level: number
  xp: number
  xpInLevel: number
  xpToNext: number
  className?: string
}

export function XPProgress({ level, xp, xpInLevel, xpToNext, className }: XPProgressProps) {
  const target = xpInLevel + xpToNext
  return (
    <div className={cx('jw-xp-progress', className)} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="jw-progress-row">
        <span className="jw-progress-label">Cấp {level}</span>
        <span className="jw-progress-value" style={{ marginLeft: 'auto' }}>
          {xp} XP{xpToNext > 0 ? ` · còn ${xpToNext} XP` : ' · cấp tối đa'}
        </span>
      </div>
      <div className="jw-progress" role="progressbar" aria-valuenow={xp} aria-valuemin={0} aria-valuemax={target}>
        <div className="jw-progress-fill" style={{ width: `${target === 0 ? 0 : (xp / target) * 100}%` }} />
      </div>
    </div>
  )
}