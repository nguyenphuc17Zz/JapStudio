import React from 'react'
import { Button } from '../ui/Button'
import type { PracticeMode, GridType, InkColor } from './KanjiCanvas'
import { sound } from '../../services/sound'

export interface KanjiStrokeControlsProps {
  mode: PracticeMode
  totalStrokes: number
  currentStep: number
  gridType: GridType
  isPlaying: boolean
  speed: number
  inkColor: InkColor
  showStrokeNumbers: boolean
  onModeChange: (mode: PracticeMode) => void
  onGridChange: (grid: GridType) => void
  onPlayToggle: () => void
  onStepChange: (step: number) => void
  onSpeedChange: (speed: number) => void
  onInkColorChange: (color: InkColor) => void
  onToggleStrokeNumbers: () => void
  onHint: () => void
  onReset: () => void
  onUndo?: () => void
}

const MODES: Array<{ id: PracticeMode; label: string; icon: string }> = [
  { id: 'demo', label: 'Xem mẫu', icon: '🎬' },
  { id: 'guide', label: 'Tập tô', icon: '✍️' },
  { id: 'quiz', label: 'Thử thách', icon: '🧠' },
  { id: 'shodo', label: 'Thư pháp', icon: '🖌️' },
]

const INK_OPTIONS: Array<{ id: InkColor; label: string; bg: string }> = [
  { id: 'sumi', label: 'Mực Tàu (Sumi)', bg: '#18181b' },
  { id: 'shu', label: 'Mực Son (Shu)', bg: '#ef4444' },
  { id: 'kin', label: 'Mạ Vàng (Kin)', bg: '#fbbf24' },
  { id: 'aizome', label: 'Lam Chàm (Ai)', bg: '#38bdf8' },
]

export const KanjiStrokeControls: React.FC<KanjiStrokeControlsProps> = ({
  mode,
  totalStrokes,
  currentStep,
  gridType,
  isPlaying,
  speed,
  inkColor,
  showStrokeNumbers,
  onModeChange,
  onGridChange,
  onPlayToggle,
  onStepChange,
  onSpeedChange,
  onInkColorChange,
  onToggleStrokeNumbers,
  onHint,
  onReset,
  onUndo,
}) => {
  return (
    <div className="jw-kanji-controls" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      {/* 1. Practice Mode Segmented Switcher */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          background: 'var(--color-surface-subtle)',
          padding: 4,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          gap: 4,
        }}
      >
        {MODES.map((m) => {
          const isActive = mode === m.id
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => {
                sound.playClick()
                onModeChange(m.id)
              }}
              style={{
                padding: '6px 4px',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--color-primary)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--color-foreground-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: 'var(--text-caption)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          )
        })}
      </div>

      {/* 2. Mode-Specific Action Toolbar */}
      {mode === 'demo' && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-xs)',
            background: 'var(--color-surface-subtle)',
            padding: 'var(--space-xs) var(--space-sm)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {/* Play / Pause / Replay / Step Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Button
              variant={isPlaying ? 'secondary' : 'primary'}
              size="sm"
              onClick={onPlayToggle}
            >
              {isPlaying ? '⏸ Tạm dừng' : '▶ Phát mẫu'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                sound.playClick()
                onStepChange(Math.max(1, currentStep - 1))
              }}
              title="Nét trước"
            >
              ◀
            </Button>
            <span style={{ fontSize: 'var(--text-micro)', color: 'var(--nihon-kin)', fontWeight: 700 }}>
              {currentStep}/{totalStrokes}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                sound.playClick()
                onStepChange(Math.min(totalStrokes, currentStep + 1))
              }}
              title="Nét sau"
            >
              ▶
            </Button>
            <Button variant="ghost" size="sm" onClick={onReset}>
              🔄
            </Button>
          </div>

          {/* Speed Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)' }}>Tốc độ:</span>
            {[0.5, 1, 2].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  sound.playClick()
                  onSpeedChange(s)
                }}
                style={{
                  background: speed === s ? 'var(--color-surface-elevated)' : 'transparent',
                  border: `1px solid ${speed === s ? 'var(--color-border-hover)' : 'transparent'}`,
                  color: speed === s ? 'var(--color-foreground)' : 'var(--color-foreground-muted)',
                  fontSize: 'var(--text-micro)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Stroke Numbers Toggle */}
          <button
            type="button"
            onClick={onToggleStrokeNumbers}
            style={{
              background: showStrokeNumbers ? 'rgba(244, 63, 94, 0.15)' : 'transparent',
              border: `1px solid ${showStrokeNumbers ? 'rgba(244, 63, 94, 0.4)' : 'var(--color-border)'}`,
              color: showStrokeNumbers ? '#f43f5e' : 'var(--color-foreground-muted)',
              fontSize: 'var(--text-micro)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            Số nét: {showStrokeNumbers ? 'Bật' : 'Tắt'}
          </button>
        </div>
      )}

      {mode === 'guide' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-surface-subtle)',
            padding: 'var(--space-xs) var(--space-sm)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
            Nét thứ: <strong style={{ color: 'var(--nihon-kin)' }}>{currentStep}</strong> / {totalStrokes}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button variant="secondary" size="sm" onClick={onHint}>
              💡 Gợi ý
            </Button>
            <Button variant="ghost" size="sm" onClick={onReset}>
              Làm lại 🔄
            </Button>
          </div>
        </div>
      )}

      {mode === 'quiz' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-surface-subtle)',
            padding: 'var(--space-xs) var(--space-sm)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
            Đã viết: <strong style={{ color: '#10b981' }}>{currentStep - 1}</strong> / {totalStrokes} nét
          </div>
          <Button variant="ghost" size="sm" onClick={onReset}>
            Viết lại 🔄
          </Button>
        </div>
      )}

      {mode === 'shodo' && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            background: 'var(--color-surface-subtle)',
            padding: 'var(--space-xs) var(--space-sm)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {/* Ink color selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)' }}>Mực:</span>
            {INK_OPTIONS.map((ink) => (
              <button
                key={ink.id}
                type="button"
                onClick={() => {
                  sound.playClick()
                  onInkColorChange(ink.id)
                }}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: ink.bg,
                  border: inkColor === ink.id ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  boxShadow: inkColor === ink.id ? '0 0 8px rgba(255, 255, 255, 0.5)' : 'none',
                }}
                title={ink.label}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {onUndo && (
              <Button variant="ghost" size="sm" onClick={onUndo}>
                ↩ Xóa nét
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onReset}>
              Tẩy sạch 🧹
            </Button>
          </div>
        </div>
      )}

      {/* 3. Grid Guideline Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)' }}>Khung lưới:</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['nine', 'four', 'none'] as GridType[]).map((g) => {
            const labels: Record<GridType, string> = {
              nine: 'Cửu cung (9)',
              four: 'Điền tự (4)',
              none: 'Không lưới',
            }
            return (
              <button
                key={g}
                type="button" aria-pressed={gridType===g}
                onClick={() => {
                sound.playClick()
                onGridChange(g)
                }}
                style={{
                  background: gridType === g ? 'var(--color-surface-elevated)' : 'transparent',
                  border: `1px solid ${gridType === g ? 'var(--color-border-hover)' : 'transparent'}`,
                  color: gridType === g ? 'var(--color-foreground)' : 'var(--color-foreground-muted)',
                  fontSize: 'var(--text-micro)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                {labels[g]}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
