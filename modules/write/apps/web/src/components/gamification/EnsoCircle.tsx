export interface EnsoCircleProps {
  size?: number
  strokeWidth?: number
  color?: string
  progress?: number // 0 to 100
  showValue?: boolean
  className?: string
}

export function EnsoCircle({
  size = 120,
  strokeWidth = 10,
  color = 'var(--nihon-kikyo, #8b5cf6)',
  progress = 100,
  showValue = true,
  className = '',
}: EnsoCircleProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div
      className={`jw-enso-wrap ${className}`}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
      role="img"
      aria-label={`Vòng tròn Enso thư pháp: ${progress}%`}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background faint guide */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth={strokeWidth - 2}
        />
        {/* Calligraphy ink stroke */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.4))',
          }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {showValue ? (
          <span
            style={{
              fontFamily: 'var(--font-japanese)',
              fontSize: size * 0.22,
              fontWeight: 800,
              color: 'var(--color-foreground)',
              lineHeight: 1,
            }}
          >
            {progress}%
          </span>
        ) : (
          <span
            style={{
              fontSize: size * 0.26,
              fontFamily: 'var(--font-japanese)',
              color: color,
              fontWeight: 800,
              opacity: 0.85,
            }}
          >
            円
          </span>
        )}
      </div>
    </div>
  )
}
