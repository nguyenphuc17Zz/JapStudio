export interface RadarSkill {
  key: string
  label: string
  value: number // 0-100
}

export interface CyberRadarProps {
  skills: RadarSkill[]
  size?: number
  className?: string
}

const JAPANESE_SKILL_LABELS: Record<string, string> = {
  grammar: '文法',
  grammar_score: '文法',
  vocabulary: '語彙',
  vocabulary_score: '語彙',
  naturalness: '自然度',
  naturalness_score: '自然度',
  semantic: '意味',
  semantic_score: '意味',
  context_fit_score: '文脈',
  register: '語調',
  register_fit_score: '語調',
  discourse: '構成',
  discourse_score: '構成',
}

export function CyberRadar({ skills, size = 260, className = '' }: CyberRadarProps) {
  const center = size / 2
  const radius = size * 0.38
  const totalAxes = skills.length || 6

  // Coordinates helper
  const getCoordinates = (index: number, val: number) => {
    const angle = (Math.PI * 2 * index) / totalAxes - Math.PI / 2
    const r = (val / 100) * radius
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    }
  }

  // Polygon points for value
  const points = skills
    .map((skill, i) => {
      const { x, y } = getCoordinates(i, Math.max(10, skill.value))
      return `${x},${y}`
    })
    .join(' ')

  // Grid levels (25%, 50%, 75%, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1]

  return (
    <div
      className={`jw-cyber-radar ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <svg width={size} height={size}>
        {/* Background Grid Hexagons */}
        {gridLevels.map((lvl) => {
          const gridPoints = Array.from({ length: totalAxes }, (_, i) => {
            const angle = (Math.PI * 2 * i) / totalAxes - Math.PI / 2
            const r = lvl * radius
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`
          }).join(' ')

          return (
            <polygon
              key={lvl}
              points={gridPoints}
              fill={lvl === 1 ? 'var(--color-surface-subtle)' : 'none'}
              stroke="var(--color-border-subtle)"
              strokeWidth={1}
            />
          )
        })}

        {/* Axis Lines */}
        {skills.map((_, i) => {
          const angle = (Math.PI * 2 * i) / totalAxes - Math.PI / 2
          const x2 = center + radius * Math.cos(angle)
          const y2 = center + radius * Math.sin(angle)
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke="var(--color-border-subtle)"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          )
        })}

        {/* Data Area Polygon */}
        <polygon
          points={points}
          fill="var(--color-accent-muted)"
          stroke="var(--color-accent)"
          strokeWidth={1.5}
          style={{
            transition: 'all 0.4s var(--ease-standard)',
          }}
        />

        {/* Data Vertex Points */}
        {skills.map((skill, i) => {
          const { x, y } = getCoordinates(i, Math.max(10, skill.value))
          return (
            <circle
              key={skill.key}
              cx={x}
              cy={y}
              r={3}
              fill="var(--color-accent)"
              stroke="var(--color-surface)"
              strokeWidth={1.5}
              style={{
                transition: 'all 0.4s var(--ease-standard)',
              }}
            />
          )
        })}

        {/* Axis Labels in Japanese */}
        {skills.map((skill, i) => {
          const angle = (Math.PI * 2 * i) / totalAxes - Math.PI / 2
          const labelRadius = radius + 20
          const x = center + labelRadius * Math.cos(angle)
          const y = center + labelRadius * Math.sin(angle)
          return (
            <text
              key={`label-${skill.key}`}
              x={x}
              y={y + 4}
              textAnchor="middle"
              fill="var(--color-foreground-secondary)"
              fontSize={11}
              fontFamily="var(--font-sans), var(--font-jp)"
              fontWeight={700}
            >
              {JAPANESE_SKILL_LABELS[skill.key] ?? skill.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
