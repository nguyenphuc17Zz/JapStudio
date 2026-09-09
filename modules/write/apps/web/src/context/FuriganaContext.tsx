import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import { sound } from '../services/sound'
import { setupGlobalFuriganaObserver } from '../lib/globalFurigana'

export type FuriganaMode = 'always' | 'hover' | 'off'

export interface FuriganaModeOption {
  key: FuriganaMode
  label: string
  description: string
  icon: string
}

export const FURIGANA_OPTIONS: Record<FuriganaMode, FuriganaModeOption> = {
  always: {
    key: 'always',
    label: 'Luôn hiện',
    description: 'Hiện âm đọc Furigana phía trên tất cả chữ Hán',
    icon: '✨',
  },
  hover: {
    key: 'hover',
    label: 'Khi rê chuột',
    description: 'Ẩn Furigana, chỉ hiện khi di chuột/chạm vào từ để tự kiểm tra',
    icon: '🎯',
  },
  off: {
    key: 'off',
    label: 'Tắt hoàn toàn',
    description: 'Không hiển thị âm đọc Furigana',
    icon: '🚫',
  },
}

export interface FuriganaColorPreset {
  id: string
  name: string
  kanji: string
  hex: string
  previewGlow: string
}

export const FURIGANA_COLORS: FuriganaColorPreset[] = [
  { id: 'kikyo', name: 'Tím Cát Cánh (Kikyo)', kanji: '桔梗', hex: '#a78bfa', previewGlow: 'rgba(167, 139, 250, 0.45)' },
  { id: 'sakura', name: 'Hồng Anh Đào (Sakura)', kanji: '桜', hex: '#f472b6', previewGlow: 'rgba(244, 114, 182, 0.45)' },
  { id: 'kin', name: 'Vàng Hoàng Kim (Yamabuki)', kanji: '金', hex: '#fbbf24', previewGlow: 'rgba(251, 191, 36, 0.45)' },
  { id: 'matcha', name: 'Xanh Trà Đạo (Matcha)', kanji: '抹茶', hex: '#34d399', previewGlow: 'rgba(52, 211, 153, 0.45)' },
  { id: 'asagi', name: 'Lam Thiên Thanh (Asagi)', kanji: '浅葱', hex: '#38bdf8', previewGlow: 'rgba(56, 189, 248, 0.45)' },
  { id: 'shu', name: 'Đỏ Thần Xích (Shu)', kanji: '朱', hex: '#f87171', previewGlow: 'rgba(248, 113, 113, 0.45)' },
  { id: 'fuji', name: 'Tím Tử Đằng (Fuji)', kanji: '藤', hex: '#c084fc', previewGlow: 'rgba(192, 132, 252, 0.45)' },
  { id: 'sumi', name: 'Trắng Mực Bạc (Sumi)', kanji: '墨', hex: '#94a3b8', previewGlow: 'rgba(148, 163, 184, 0.45)' },
]

export const DEFAULT_FURIGANA_COLOR = '#a78bfa'
export const FURIGANA_STORAGE_KEY = 'jw:furigana:mode'
export const FURIGANA_COLOR_STORAGE_KEY = 'jw:furigana:color'

interface FuriganaContextValue {
  mode: FuriganaMode
  isAlways: boolean
  isHover: boolean
  isOff: boolean
  color: string
  setMode: (mode: FuriganaMode) => void
  setColor: (color: string) => void
  toggleNextMode: () => void
}

const FuriganaContext = createContext<FuriganaContextValue | null>(null)

export function FuriganaProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<FuriganaMode>(() => {
    try {
      const saved = localStorage.getItem(FURIGANA_STORAGE_KEY) as FuriganaMode
      if (saved && FURIGANA_OPTIONS[saved]) return saved
    } catch {
      // ignore
    }
    return 'always'
  })

  const [color, setColorState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(FURIGANA_COLOR_STORAGE_KEY)
      if (saved && saved.startsWith('#')) return saved
    } catch {
      // ignore
    }
    return DEFAULT_FURIGANA_COLOR
  })

  const setMode = useCallback((nextMode: FuriganaMode) => {
    setModeState(nextMode)
    try {
      localStorage.setItem(FURIGANA_STORAGE_KEY, nextMode)
    } catch {
      // ignore
    }
  }, [])

  const setColor = useCallback((nextColor: string) => {
    setColorState(nextColor)
    try {
      localStorage.setItem(FURIGANA_COLOR_STORAGE_KEY, nextColor)
    } catch {
      // ignore
    }
  }, [])

  const toggleNextMode = useCallback(() => {
    sound.playClick()
    const next: FuriganaMode = mode === 'always' ? 'hover' : mode === 'hover' ? 'off' : 'always'
    setMode(next)
  }, [mode, setMode])

  // Update HTML data attribute to trigger global CSS zero-cost rendering
  useEffect(() => {
    document.documentElement.setAttribute('data-furigana', mode)
  }, [mode])

  // Sync Furigana color CSS variable to document root
  useEffect(() => {
    document.documentElement.style.setProperty('--furigana-color', color)
  }, [color])

  // Continuous background scanner for all Japanese text appearing dynamically on the screen
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const cleanup = setupGlobalFuriganaObserver(document.body)
    return cleanup
  }, [])

  const value: FuriganaContextValue = useMemo(() => ({
    mode,
    isAlways: mode === 'always',
    isHover: mode === 'hover',
    isOff: mode === 'off',
    color,
    setMode,
    setColor,
    toggleNextMode,
  }), [mode, color, setMode, setColor, toggleNextMode])

  return (
    <FuriganaContext.Provider value={value}>
      {children}
    </FuriganaContext.Provider>
  )
}

export function useFurigana(): FuriganaContextValue {
  const ctx = useContext(FuriganaContext)
  if (!ctx) {
    return {
      mode: 'always',
      isAlways: true,
      isHover: false,
      isOff: false,
      color: DEFAULT_FURIGANA_COLOR,
      setMode: () => {},
      setColor: () => {},
      toggleNextMode: () => {},
    }
  }
  return ctx
}
