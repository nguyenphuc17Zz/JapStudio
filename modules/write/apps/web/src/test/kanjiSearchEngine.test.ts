import { describe, it, expect, beforeEach } from 'vitest'
import {
  damerauLevenshtein,
  CompressedRadixTrie,
  BKTree,
  KanjiSearchEngine,
} from '../services/kanjiSearchEngine'
import type { KanjiDetail } from '../services/kanjiService'

describe('damerauLevenshtein metric distance', () => {
  it('calculates exact matches as distance 0', () => {
    expect(damerauLevenshtein('kanji', 'kanji')).toBe(0)
    expect(damerauLevenshtein('', '')).toBe(0)
  })

  it('calculates single insertions, deletions, and substitutions', () => {
    expect(damerauLevenshtein('kanji', 'kanjii')).toBe(1) // insertion
    expect(damerauLevenshtein('kanji', 'kaji')).toBe(1) // deletion
    expect(damerauLevenshtein('kanji', 'kanxi')).toBe(1) // substitution
  })

  it('handles adjacent transpositions in 1 operation (Damerau property)', () => {
    // "nihon" -> "nihno" (adjacent transposition of 'o' and 'n')
    expect(damerauLevenshtein('nihon', 'nihno')).toBe(1)
    // Standard Levenshtein would require 2 ops (sub + sub or ins + del), but Damerau does 1
    expect(damerauLevenshtein('shinpai', 'shinapi')).toBe(1)
  })

  it('satisfies the triangle inequality: d(x, z) <= d(x, y) + d(y, z)', () => {
    const x = 'sakura'
    const y = 'sakuraa'
    const z = 'sukuraa'
    const dXY = damerauLevenshtein(x, y)
    const dYZ = damerauLevenshtein(y, z)
    const dXZ = damerauLevenshtein(x, z)
    expect(dXZ).toBeLessThanOrEqual(dXY + dYZ)
  })
})

describe('CompressedRadixTrie (Patricia Trie)', () => {
  it('indexes keys and retrieves items by prefix in O(k)', () => {
    const trie = new CompressedRadixTrie<string>()
    trie.insert('sakura', '🌸')
    trie.insert('sake', '🍶')
    trie.insert('samurai', '⚔️')
    trie.insert('nihon', '🇯🇵')

    const saResults = Array.from(trie.searchPrefix('sa'))
    expect(saResults).toContain('🌸')
    expect(saResults).toContain('🍶')
    expect(saResults).toContain('⚔️')
    expect(saResults).not.toContain('🇯🇵')

    const sakuResults = Array.from(trie.searchPrefix('saku'))
    expect(sakuResults).toEqual(['🌸'])

    const nonExistent = Array.from(trie.searchPrefix('xyz'))
    expect(nonExistent).toEqual([])
  })
})

describe('BKTree (Burkhard-Keller Metric Tree)', () => {
  it('prunes search space using triangle inequality and finds near neighbors', () => {
    const tree = new BKTree<string>()
    tree.insert('sensei', 'Thầy giáo')
    tree.insert('gakusei', 'Học sinh')
    tree.insert('kaisha', 'Công ty')
    tree.insert('shinpai', 'Lo lắng')

    // Typo: "sensie" -> transpose 'e' and 'i' (distance 1)
    const results = tree.search('sensie', 1)
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].item).toBe('Thầy giáo')
    expect(results[0].distance).toBe(1)

    // Typo: "shinapi" -> distance 1 from "shinpai"
    const shinpaiResults = tree.search('shinapi', 1)
    expect(shinpaiResults.length).toBeGreaterThanOrEqual(1)
    expect(shinpaiResults[0].item).toBe('Lo lắng')
  })
})

describe('KanjiSearchEngine (Integrated Multi-Signal Search)', () => {
  let engine: KanjiSearchEngine

  const mockKanji: KanjiDetail[] = [
    {
      kanji: '日',
      hanViet: 'NHẬT',
      meaning: 'Mặt trời, ngày',
      onyomi: ['ニチ', 'ジツ'],
      kunyomi: ['ひ'],
      jlpt: 'N5',
      strokeCount: 4,
      radical: '日',
      mnemonic: 'Mặt trời',
      compounds: [{ word: '日本', reading: 'にほん', meaning: 'Nước Nhật' }],
    },
    {
      kanji: '月',
      hanViet: 'NGUYỆT',
      meaning: 'Mặt trăng, tháng',
      onyomi: ['ゲツ', 'ガツ'],
      kunyomi: ['つき'],
      jlpt: 'N5',
      strokeCount: 4,
      radical: '月',
      mnemonic: 'Mặt trăng',
      compounds: [{ word: '今月', reading: 'こんげつ', meaning: 'Tháng này' }],
    },
    {
      kanji: '学',
      hanViet: 'HỌC',
      meaning: 'Học tập, trường học',
      onyomi: ['ガク'],
      kunyomi: ['まな・ぶ'],
      jlpt: 'N5',
      strokeCount: 8,
      radical: '子',
      mnemonic: 'Mái trường',
      compounds: [{ word: '学生', reading: 'がくせい', meaning: 'Học sinh' }],
    },
    {
      kanji: '桜',
      hanViet: 'ANH',
      meaning: 'Hoa anh đào',
      onyomi: ['オウ'],
      kunyomi: ['さくら'],
      jlpt: 'N3',
      strokeCount: 10,
      radical: '木',
      mnemonic: 'Hoa anh đào',
      compounds: [{ word: '桜', reading: 'さくら', meaning: 'Hoa anh đào' }],
    },
  ]

  beforeEach(() => {
    engine = new KanjiSearchEngine()
    engine.indexKanji(mockKanji)
  })

  it('ranks exact Kanji match first', () => {
    const results = engine.search('日')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].kanji).toBe('日')
  })

  it('finds Kanji by Vietnamese Han-Viet without diacritics', () => {
    // "nhat" finds "NHẬT" -> 日
    const results = engine.search('nhat')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].kanji).toBe('日')
  })

  it('finds Kanji by Kunyomi/Hiragana reading', () => {
    const results = engine.search('さくら')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].kanji).toBe('桜')
  })

  it('finds Kanji with typo using BK-Tree metric search', () => {
    // Typo: "sakrua" instead of "sakura" (distance 1 transposition)
    const results = engine.search('sakrua')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].kanji).toBe('桜')
  })

  it('respects JLPT level filters', () => {
    const n5Only = engine.search('', 'N5')
    expect(n5Only.every((k) => k.jlpt === 'N5')).toBe(true)

    const n3Results = engine.search('sakura', 'N3')
    expect(n3Results.length).toBe(1)
    expect(n3Results[0].kanji).toBe('桜')

    const n5NoMatch = engine.search('sakura', 'N5')
    expect(n5NoMatch.length).toBe(0)
  })
})
