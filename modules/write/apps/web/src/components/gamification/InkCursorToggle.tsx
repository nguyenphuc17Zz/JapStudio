import { useState } from 'react'
import { sound } from '../../services/sound'
import { INK_CURSOR_STORAGE_KEY } from './InkBrushCursor'

export function InkCursorToggle() {
  const [enabled, setEnabled] = useState(() => {
    try {
      const val = localStorage.getItem(INK_CURSOR_STORAGE_KEY)
      return val !== null ? val === 'true' : true
    } catch {
      return true
    }
  })

  const handleToggle = () => {
    sound.playClick()
    const next = !enabled
    setEnabled(next)
    try {
      localStorage.setItem(INK_CURSOR_STORAGE_KEY, String(next))
    } catch {}
    window.dispatchEvent(new CustomEvent('jws:toggle-ink-cursor', { detail: next }))
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="jw-btn jw-btn--ghost jw-btn--sm"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        padding: 0,
        borderRadius: '50%',
        background: enabled ? 'rgba(139, 92, 246, 0.18)' : 'rgba(255, 255, 255, 0.05)',
        border: `1px solid ${enabled ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
        boxShadow: enabled ? '0 0 10px rgba(139, 92, 246, 0.3)' : 'none',
        color: enabled ? 'var(--nihon-kikyo)' : 'var(--color-foreground-disabled)',
        cursor: 'pointer',
        fontSize: 14,
        transition: 'all 0.2s ease',
      }}
      title={enabled ? 'Tắt vệt mực thư pháp lướt chuột (Đang Bật)' : 'Bật vệt mực thư pháp lướt chuột (Đang Tắt)'}
      aria-label={enabled ? 'Tắt vệt mực thư pháp' : 'Bật vệt mực thư pháp'}
      aria-pressed={enabled}
    >
      <span style={{ filter: enabled ? 'none' : 'grayscale(1)', opacity: enabled ? 1 : 0.4 }}>🖌️</span>
    </button>
  )
}
