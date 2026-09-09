import { useState, useEffect } from 'react'
import { sound } from '../../services/sound'
import { Icon } from '../icons/Icon'
import { SystemGuideModal } from './SystemGuideModal'

export function SystemGuideButton() {
  const [isOpen, setIsOpen] = useState(false)

  // Listen for global keyboard shortcut '?' or 'F1'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when user is typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          Boolean(target.isContentEditable) ||
          Boolean(target.classList?.contains('jw-textarea')) ||
          Boolean(target.classList?.contains('jw-input')))

      if ((e.key === '?' || e.key === 'F1') && !isInput) {
        e.preventDefault()
        sound.playClick()
        setIsOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => {
          sound.playClick()
          setIsOpen(true)
        }}
        className="jw-btn jw-btn--ghost jw-btn--sm"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 32,
          padding: '0 10px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--glass-border)',
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--color-foreground)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Cẩm nang hướng dẫn sử dụng toàn diện (Bấm phím ?)"
        aria-label="Hướng dẫn sử dụng toàn diện"
      >
        <span style={{ color: '#8b5cf6', display: 'flex', alignItems: 'center' }}>
          <Icon name="help" size={14} />
        </span>
        <span>Hướng dẫn</span>
        <kbd
          style={{
            fontSize: 10,
            padding: '1px 4px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 3,
            color: 'var(--color-foreground-secondary)',
            marginLeft: 2,
          }}
        >
          ?
        </kbd>
      </button>

      <SystemGuideModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
