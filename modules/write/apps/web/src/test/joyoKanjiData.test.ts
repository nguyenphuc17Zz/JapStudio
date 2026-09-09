import { describe, it, expect } from 'vitest'
import {
  ALL_JOYO_KANJI,
  N5_KANJI,
  N4_KANJI,
  N3_KANJI,
  N2_KANJI,
  N1_KANJI,
} from '../data/joyoKanjiData'
import { kanjiService } from '../services/kanjiService'

describe('Joyo Kanji Dataset & Shuffle Engine', () => {
  it('contains exactly 2,136 Joyo Kanji across all JLPT levels', () => {
    expect(ALL_JOYO_KANJI.length).toBe(2136)
    expect(kanjiService.listAllKanji().length).toBe(2136)
    expect(N5_KANJI.length).toBeGreaterThan(0)
    expect(N4_KANJI.length).toBeGreaterThan(0)
    expect(N3_KANJI.length).toBeGreaterThan(0)
    expect(N2_KANJI.length).toBeGreaterThan(0)
    expect(N1_KANJI.length).toBeGreaterThan(0)
  })

  it('provides complete Joyo Kanji entries with Sino-Vietnamese readings', () => {
    N5_KANJI.forEach((entry) => {
      expect(entry.kanji).toBeDefined()
      expect(entry.hanViet).toBeDefined()
      expect(entry.meaning).toBeDefined()
      expect(entry.strokeCount).toBeGreaterThan(0)
      expect(entry.radical).toBeDefined()
    })
  })

  it('selects a random Kanji by JLPT level and respects exclusion lists', () => {
    const randomN5 = kanjiService.getRandomKanji('N5')
    expect(randomN5).toBeDefined()
    expect(randomN5.jlpt).toBe('N5')

    // Exclude the picked character
    const excluded = [randomN5.kanji]
    const nextRandom = kanjiService.getRandomKanji('N5', excluded)
    expect(nextRandom.kanji).not.toBe(randomN5.kanji)
  })

  it('generates a shuffled list of Kanji characters', () => {
    const original = kanjiService.listAllKanji('N5')
    const shuffled = kanjiService.getShuffledKanjiList('N5')

    expect(shuffled.length).toBe(original.length)
    // Check that all characters are preserved
    const origSet = new Set(original.map((k) => k.kanji))
    const shuffSet = new Set(shuffled.map((k) => k.kanji))
    expect(origSet.size).toBe(shuffSet.size)
  })
})
