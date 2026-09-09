import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type JapaneseSeason = 'haru' | 'natsu' | 'aki' | 'fuyu'

export interface SeasonInfo {
  key: JapaneseSeason
  name: string
  kanji: string
  icon: string
  particle: string
}

export const SEASONS: Record<JapaneseSeason, SeasonInfo> = {
  haru: { key: 'haru', name: 'Xuân (Haru)', kanji: '春', icon: '🌸', particle: 'Sakura' },
  natsu: { key: 'natsu', name: 'Hạ (Natsu)', kanji: '夏', icon: '🎋', particle: 'Đom đóm' },
  aki: { key: 'aki', name: 'Thu (Aki)', kanji: '秋', icon: '🍁', particle: 'Lá phong' },
  fuyu: { key: 'fuyu', name: 'Đông (Fuyu)', kanji: '冬', icon: '❄️', particle: 'Bông tuyết' },
}

interface SeasonContextValue {
  season: JapaneseSeason
  seasonInfo: SeasonInfo
  setSeason: (season: JapaneseSeason) => void
}

const SeasonContext = createContext<SeasonContextValue | null>(null)

function getDefaultSeason(): JapaneseSeason {
  const month = new Date().getMonth() + 1 // 1-12
  if (month >= 3 && month <= 5) return 'haru'
  if (month >= 6 && month <= 8) return 'natsu'
  if (month >= 9 && month <= 11) return 'aki'
  return 'fuyu'
}

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [season, setSeasonState] = useState<JapaneseSeason>(() => {
    try {
      const saved = localStorage.getItem('jw:season') as JapaneseSeason
      if (saved && SEASONS[saved]) return saved
    } catch {
      // ignore
    }
    return getDefaultSeason()
  })

  const setSeason = (next: JapaneseSeason) => {
    setSeasonState(next)
    try {
      localStorage.setItem('jw:season', next)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-season', season)
  }, [season])

  return (
    <SeasonContext.Provider value={{ season, seasonInfo: SEASONS[season], setSeason }}>
      {children}
    </SeasonContext.Provider>
  )
}

export function useSeason(): SeasonContextValue {
  const ctx = useContext(SeasonContext)
  if (!ctx) {
    return {
      season: 'haru',
      seasonInfo: SEASONS.haru,
      setSeason: () => {},
    }
  }
  return ctx
}
