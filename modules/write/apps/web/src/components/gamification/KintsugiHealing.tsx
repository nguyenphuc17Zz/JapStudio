import type { ReactNode } from 'react'

export interface KintsugiHealingProps {
  active?: boolean
  children: ReactNode
  className?: string
}

export function KintsugiHealing({ active = false, children, className }: KintsugiHealingProps) {
  if (!active) return <>{children}</>

  return (
    <span
      className={className}
      style={{
        position: 'relative',
        display: 'inline-block',
        background: 'linear-gradient(90deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.25) 50%, rgba(251, 191, 36, 0.15) 100%)',
        borderBottom: '2px solid #fbbf24',
        boxShadow: '0 2px 10px rgba(251, 191, 36, 0.45)',
        padding: '0 4px',
        borderRadius: 3,
        animation: 'jw-gold-shimmer 2s infinite ease-in-out',
        fontWeight: 600,
      }}
      title="Nghệ thuật hàn vàng Kintsugi - Lỗi sai được khắc phục thành công!"
    >
      <span style={{ fontSize: 10, marginRight: 2 }}>✨</span>
      {children}
    </span>
  )
}
