export interface StreakFlameProps {
  streak: number
  size?: number
  showCount?: boolean
  className?: string
}

export function StreakFlame({
  streak,
  size = 28,
  showCount = true,
  className = '',
}: StreakFlameProps) {
  const active = streak > 0
  const isHighStreak = streak >= 7
  const isEpicStreak = streak >= 30

  const flameColor = isEpicStreak
    ? 'var(--grad-gold)'
    : isHighStreak
      ? 'var(--grad-flame)'
      : 'linear-gradient(180deg, #ff8c00 0%, #e14d3f 100%)'

  return (
    <div
      className={`jw-streak-flame ${active ? 'jw-streak-flame--active' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        background: active ? 'rgba(225, 77, 63, 0.1)' : 'var(--color-surface-elevated)',
        border: active ? '1px solid rgba(225, 77, 63, 0.3)' : '1px solid var(--color-border-subtle)',
        userSelect: 'none',
      }}
      aria-label={`Chuỗi ${streak} ngày`}
    >
      <span
        style={{
          display: 'inline-flex',
          animation: active ? 'flamePulse 1.6s ease-in-out infinite' : 'none',
          fontSize: size * 0.75,
          filter: active ? (isHighStreak ? 'drop-shadow(0 0 8px rgba(245, 166, 35, 0.8))' : 'drop-shadow(0 0 4px rgba(225, 77, 63, 0.5))') : 'grayscale(1)',
          opacity: active ? 1 : 0.4,
        }}
        role="img"
        aria-hidden="true"
      >
        🔥
      </span>
      {showCount && (
        <span
          style={{
            fontWeight: 800,
            fontSize: 14,
            background: active ? flameColor : 'var(--color-foreground-muted)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: active ? 'transparent' : 'inherit',
            letterSpacing: '-0.02em',
          }}
        >
          {streak} <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>ngày</span>
        </span>
      )}
    </div>
  )
}
