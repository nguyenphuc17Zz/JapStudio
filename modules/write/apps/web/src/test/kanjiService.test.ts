import { describe, it, expect, beforeEach } from 'vitest'
import { kanjiService } from '../services/kanjiService'

describe('kanjiService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('converts character to 5-digit KanjiVG hex format', () => {
    expect(kanjiService.getKanjiHex('日')).toBe('065e5')
    expect(kanjiService.getKanjiHex('月')).toBe('06708')
    expect(kanjiService.getKanjiHex('木')).toBe('06728')
  })

  it('retrieves detailed dictionary metadata for built-in Kanji', async () => {
    const sun = await kanjiService.getKanjiDetails('日')
    expect(sun.kanji).toBe('日')
    expect(sun.hanViet).toBe('NHẬT')
    expect(sun.jlpt).toBe('N5')
    expect(sun.strokeCount).toBe(4)
    expect(sun.compounds.length).toBeGreaterThan(0)
  })

  it('searches Kanji by Sino-Vietnamese reading or meaning', () => {
    const results = kanjiService.searchKanji('NGUYỆT')
    expect(results.some((k) => k.kanji === '月')).toBe(true)

    const searchN5 = kanjiService.searchKanji('', 'N5')
    expect(searchN5.every((k) => k.jlpt === 'N5')).toBe(true)
  })

  it('persists and retrieves user practice mastery', () => {
    const initial = kanjiService.getMastery('日')
    expect(initial.practicedCount).toBe(0)

    const saved = kanjiService.saveMastery('日', 95, 3)
    expect(saved.practicedCount).toBe(1)
    expect(saved.bestScore).toBe(95)
    expect(saved.stars).toBe(3)

    const retrieved = kanjiService.getMastery('日')
    expect(retrieved.bestScore).toBe(95)
  })
})
