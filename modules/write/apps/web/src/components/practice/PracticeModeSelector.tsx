import { useEffect, useState } from 'react'
import { api } from '../../services/api'

export type PracticeMode = 'recommended' | 'custom' | 'random' | 'challenge' | 'scenario'

export interface ModeItem {
  id: PracticeMode
  label: string
  kanji: string
  badge: string
  icon: string
  desc: string
  accentColor: string
}

const PRACTICE_MODES_FALLBACK: ModeItem[] = [
  {
    id: 'recommended',
    label: 'AI gợi ý',
    kanji: '推',
    badge: 'Tối ưu',
    icon: '🌟',
    desc: 'Phân tích điểm yếu & lộ trình học cá nhân',
    accentColor: 'var(--nihon-yamabuki)',
  },
  {
    id: 'custom',
    label: 'Tùy chỉnh',
    kanji: '創',
    badge: 'Linh hoạt',
    icon: '⚡',
    desc: 'Tự chọn chủ đề, cấp độ JLPT & ngữ điệu',
    accentColor: 'var(--nihon-kikyo)',
  },
  {
    id: 'random',
    label: 'Ngẫu nhiên',
    kanji: '遊',
    badge: 'Siêu tốc',
    icon: '🎲',
    desc: 'AI sinh câu ngẫu nhiên làm bạn bất ngờ',
    accentColor: 'var(--nihon-moegi)',
  },
  {
    id: 'challenge',
    label: 'Thử thách',
    kanji: '戦',
    badge: '+XP Bonus',
    icon: '⚔️',
    desc: 'Thử thách khắc phục lỗi sai & săn điểm XP',
    accentColor: 'var(--nihon-shu)',
  },
  {
    id: 'scenario',
    label: 'Tình huống',
    kanji: '境',
    badge: 'Thực chiến',
    icon: '💼',
    desc: 'Viết email, chat công sở & hội thoại thực tế',
    accentColor: 'var(--nihon-ruri)',
  },
]

async function fetchPracticeModes(): Promise<ModeItem[]> {
  try {
    const res = await api.getPracticeModes()
    if (Array.isArray(res) && res.length > 0) return res as ModeItem[]
  } catch {
    // offline
  }
  return PRACTICE_MODES_FALLBACK
}

function usePracticeModes() {
  const [modes, setModes] = useState<ModeItem[]>(PRACTICE_MODES_FALLBACK)
  useEffect(() => {
    void fetchPracticeModes().then(setModes)
  }, [])
  return modes
}

export interface PracticeModeSelectorProps {
  currentMode: PracticeMode
  onSelectMode: (mode: PracticeMode) => void
}

export function PracticeModeSelector({
  currentMode,
  onSelectMode,
}: PracticeModeSelectorProps) {
  const modes = usePracticeModes()
  const activeModeItem = modes.find((m) => m.id === currentMode) ?? modes[0]

  return (
    <div className="jw-practice-mode-selector-wrapper jw-mb-lg">
      <div
        className="jw-tablist jw-tablist--pills"
        role="group"
        aria-label="Chế độ luyện tập"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-xs)',
          padding: '4px',
          background: 'var(--color-surface-elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border-subtle)',
        }}
      >
        {modes.map((item) => {
          const isActive = currentMode === item.id

          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-pressed={isActive}
              aria-selected={isActive}
              className={`jw-tab ${isActive ? 'jw-tab--active' : ''}`}
              onClick={() => onSelectMode(item.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-body-sm)',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--color-foreground)' : 'var(--color-foreground-secondary)',
                background: isActive ? 'var(--color-surface)' : 'transparent',
                border: isActive ? '1px solid var(--color-border-default)' : '1px solid transparent',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
                transition: 'all var(--duration-fast) var(--ease-standard)',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && (
                <span
                  style={{
                    fontSize: 'var(--text-micro)',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-sm)',
                    background: isActive ? 'var(--color-accent-muted)' : 'var(--color-surface-hover)',
                    color: isActive ? 'var(--color-accent)' : 'var(--color-foreground-muted)',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {activeModeItem && (
        <p
          className="jw-text--caption jw-text--muted"
          style={{ paddingLeft: 'var(--space-xs)', marginTop: 'var(--space-xs)', marginBottom: 0 }}
        >
          {activeModeItem.desc}
        </p>
      )}
    </div>
  )
}
