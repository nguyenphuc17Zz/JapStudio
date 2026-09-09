import type { CSSProperties, ReactNode } from 'react'

export interface TiltCardProps {
  children: ReactNode
  maxRotation?: number
  scale?: number
  foil?: boolean
  className?: string
  style?: CSSProperties
}

export function TiltCard({
  children,
  className = '',
  style = {},
}: TiltCardProps) {
  return (
    <div
      className={`jw-tilt-card ${className}`}
      style={{
        position: 'relative',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
