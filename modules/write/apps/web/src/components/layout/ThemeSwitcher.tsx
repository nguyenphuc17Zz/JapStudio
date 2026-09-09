import { cx } from '../../lib/cx'
import { Icon, type IconName } from '../icons/Icon'
import { useTheme } from '../../theme/useTheme'
import type { ThemeMode } from '../../theme/ThemeProvider'

const OPTIONS: Array<{ value: ThemeMode; label: string; icon: IconName }> = [
  { value: 'dark', label: 'Tối', icon: 'moon' },
  { value: 'light', label: 'Sáng', icon: 'sun' },
  { value: 'system', label: 'Hệ thống', icon: 'monitor' },
]

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  return (
    <div className={cx('jw-theme-switcher', className)} role="group" aria-label="Chủ đề">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cx('jw-theme-switcher-btn', theme === option.value && 'jw-theme-switcher-btn--active')}
          aria-pressed={theme === option.value}
          onClick={() => setTheme(option.value)}
        >
          <Icon name={option.icon} size={14} aria-hidden="true" />
          <span className="jw-sr-only">{option.label}</span>
        </button>
      ))}
    </div>
  )
}