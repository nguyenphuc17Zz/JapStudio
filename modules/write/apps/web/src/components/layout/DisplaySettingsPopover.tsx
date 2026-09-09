import { useState, useRef, useEffect } from 'react'
import { Button } from '../ui/Button'
import { SeasonSwitcher } from './SeasonSwitcher'
import { ZenSoundscapePlayer } from '../gamification/ZenSoundscapePlayer'
import { AudioToggle } from '../gamification/AudioToggle'
import { ZenTeaTimer } from '../gamification/ZenTeaTimer'
import { InkCursorToggle } from '../gamification/InkCursorToggle'
import { ThemeSwitcher } from './ThemeSwitcher'

export function DisplaySettingsPopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-label="Cài đặt hiển thị & âm thanh"
        title="Cài đặt hiển thị & âm thanh"
        style={{
          height: 32,
          padding: '0 10px',
          borderRadius: 'var(--radius-md)',
          background: open ? 'var(--color-accent-muted)' : 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
        }}
      >
        ⋯ Hiển thị
      </Button>
      {open && (
        <div
          className="jw-glass"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 260,
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm)',
            zIndex: 1000,
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div className="jw-text--caption jw-text--muted">Giao diện & Âm thanh</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', alignItems: 'center' }}>
            <ThemeSwitcher />
            <SeasonSwitcher />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', alignItems: 'center' }}>
            <ZenTeaTimer />
            <InkCursorToggle />
            <ZenSoundscapePlayer />
            <AudioToggle />
          </div>
        </div>
      )}
    </div>
  )
}
