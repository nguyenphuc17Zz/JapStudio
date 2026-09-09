import { cx } from '../../lib/cx'

export type CharacterCounterState = 'below' | 'within' | 'above'

export interface CharacterCounterProps {
  current: number
  /** When provided, 'below' is reported while current < targetMin */
  targetMin?: number
  /** When provided, 'above' is reported while current > targetMax */
  targetMax?: number
  /** Explicit state overrides automatic derivation */
  state?: CharacterCounterState
  className?: string
}

function deriveState(
  current: number,
  targetMin: number | undefined,
  targetMax: number | undefined,
): CharacterCounterState {
  if (targetMax !== undefined && current > targetMax) return 'above'
  if (targetMin !== undefined && current < targetMin) return 'below'
  return 'within'
}

export function CharacterCounter({
  current,
  targetMin,
  targetMax,
  state,
  className,
}: CharacterCounterProps) {
  const resolved = state ?? deriveState(current, targetMin, targetMax)
  const hasTargets = targetMin !== undefined || targetMax !== undefined
  const rangeText =
    targetMin !== undefined && targetMax !== undefined
      ? `${targetMin}–${targetMax}`
      : targetMin !== undefined
        ? `≥ ${targetMin}`
        : targetMax !== undefined
          ? `≤ ${targetMax}`
          : null

  return (
    <span
      className={cx('jw-char-counter', `jw-char-counter--${resolved}`, className)}
      aria-label={
        hasTargets && rangeText ? `${current} trên ${rangeText} chữ` : `${current} chữ`
      }
    >
      <strong>{current}</strong>
      {hasTargets && rangeText ? (
        <>
          <span aria-hidden="true">/</span>
          <span aria-hidden="true">{rangeText}</span>
          <span className="jw-sr-only">chữ</span>
        </>
      ) : (
        <span>chữ</span>
      )}
    </span>
  )
}