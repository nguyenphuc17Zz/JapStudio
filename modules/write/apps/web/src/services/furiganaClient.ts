import { api } from './api'
import {
  alignFurigana,
  parseRubyMarkup,
  KANJI_REGEX,
  katakanaToHiragana,
  type RubySegment,
} from '../lib/furiganaAligner'
// In-memory LRU cache for ultra-fast repeated lookups (cap 512 to avoid bloat)
const FURIGANA_CACHE_MAX = 512
const FURIGANA_CACHE = new Map<string, RubySegment[]>()
const PENDING_REQUESTS = new Map<string, Promise<RubySegment[]>>()

function lruSet(cache: Map<string, RubySegment[]>, key: string, value: RubySegment[]): void {
  if (cache.has(key)) cache.delete(key)
  cache.set(key, value)
  if (cache.size > FURIGANA_CACHE_MAX) {
    const first = cache.keys().next().value as string | undefined
    if (first) cache.delete(first)
  }
}

// Common offline Joyo words & single Kanji fast dictionary
const QUICK_KANJI_DICT: Record<string, string> = {
  私: 'わたし',
  僕: 'ぼく',
  俺: 'おれ',
  日: 'ひ',
  月: 'つき',
  年: 'とし',
  人: 'ひと',
  今: 'いま',
  何: 'なに',
  時: 'とき',
  分: 'ふん',
  本: 'ほん',
  日本: 'にほん',
  日本語: 'にほんご',
  今日: 'きょう',
  明日: 'あした',
  昨日: 'きのう',
  先生: 'せんせい',
  学生: 'がくせい',
  学校: 'がっこう',
  友達: 'ともだち',
  仕事: 'しごと',
  勉強: 'べんきょう',
  練習: 'れんしゅう',
  文章: 'ぶんしょう',
  漢字: 'かんじ',
  宿題: 'しゅくだい',
  時間: 'じかん',
  家族: 'かぞく',
  会社: 'かいしゃ',
  電話: 'でんわ',
  写真: 'しゃしん',
  天気: 'てんき',
  元気: 'げんき',
  料理: 'りょうり',
  旅行: 'りょこう',
  電車: 'でんしゃ',
  車: 'くるま',
  駅: 'えき',
  本屋: 'ほんや',
  部屋: 'へや',
  朝: 'あさ',
  昼: 'ひる',
  晩: 'ばん',
  夜: 'よる',
  春: 'はる',
  夏: 'なつ',
  秋: 'あき',
  冬: 'ふゆ',
  桜: 'さくら',
  花: 'はな',
  水: 'みず',
  雨: 'あめ',
  雪: 'ゆき',
  風: 'かぜ',
  空: 'そら',
  山: 'やま',
  川: 'かわ',
  海: 'うみ',
  木: 'き',
  森: 'もり',
  猫: 'ねこ',
  犬: 'いぬ',
  鳥: 'とり',
  魚: 'さかな',
  肉: 'にく',
  野菜: 'やさい',
  果物: 'くだもの',
  茶: 'ちゃ',
  酒: 'さけ',
  道: 'みち',
  手: 'て',
  目: 'め',
  耳: 'みみ',
  口: 'くち',
  足: 'あし',
  心: 'こころ',
}

// Lazily populate Joyo entries via dynamic import to keep joyo-kanji chunk out of initial bundle
let _joyoPopulated = false
let _joyoLoadPromise: Promise<void> | null = null
async function ensureJoyoPopulated(): Promise<void> {
  if (_joyoPopulated) return
  if (_joyoLoadPromise) return _joyoLoadPromise
  _joyoLoadPromise = (async () => {
    try {
      const mod = await import('../data/joyoKanjiData')
      const list = (mod as unknown as { ALL_JOYO_KANJI: Array<{ kanji: string; kunyomi: string[]; onyomi: string[]; compounds?: Array<{ word: string; reading: string }> }> }).ALL_JOYO_KANJI
      for (const entry of list) {
        if (!QUICK_KANJI_DICT[entry.kanji]) {
          const reading = entry.kunyomi[0]?.replace(/[.-].*$/, '') || entry.onyomi[0]
          if (reading) QUICK_KANJI_DICT[entry.kanji] = reading
        }
        if (entry.compounds) {
          for (const c of entry.compounds) {
            if (c.word && c.reading && !QUICK_KANJI_DICT[c.word]) QUICK_KANJI_DICT[c.word] = c.reading
          }
        }
      }
    } catch {
      // offline/dynamic import failed — keep base 90-entry dict
    }
    _joyoPopulated = true
  })()
  // Defer to idle if available, otherwise run immediately (still async)
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    await new Promise<void>((resolve) => {
      ;(window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => resolve())
    })
    await _joyoLoadPromise
  } else {
    await _joyoLoadPromise
  }
}
// Kick off lazy population without blocking initial paint
void ensureJoyoPopulated()

/**
 * Resolves synchronous offline tokens if available
 */
export function getInstantFurigana(text: string, reading?: string | null): RubySegment[] | null {
  if (!text) return []

  // 1. Explicit reading
  if (reading && !text.includes('[') && !text.includes('{')) {
    return alignFurigana(text, reading)
  }

  // 2. Bracket markup [Kanji|reading]
  if (text.includes('[') || text.includes('{')) {
    return parseRubyMarkup(text)
  }

  // Ensure lazy dict ready for quick match (no-op if already populated)
  // Note: if not yet populated, quick match may miss — ok, will be caught by API later
  // 3. Cache lookup
  if (FURIGANA_CACHE.has(text)) {
    return FURIGANA_CACHE.get(text)!
  }

  // 4. If no Kanji characters exist, return pure text
  if (!KANJI_REGEX.test(text)) {
    const plain = [{ text }]
    lruSet(FURIGANA_CACHE, text, plain)
    return plain
  }

  // 5. Quick exact single word match in local dictionary
  if (QUICK_KANJI_DICT[text]) {
    const segments = alignFurigana(text, QUICK_KANJI_DICT[text])
    lruSet(FURIGANA_CACHE, text, segments)
    return segments
  }

  return null
}

/**
 * Asynchronously fetch Furigana from Backend SudachiPy API and cache result
 */
export async function fetchSudachiFurigana(text: string): Promise<RubySegment[]> {
  if (!text) return []

  const instant = getInstantFurigana(text)
  if (instant) return instant

  if (FURIGANA_CACHE.has(text)) {
    return FURIGANA_CACHE.get(text)!
  }

  if (PENDING_REQUESTS.has(text)) {
    return PENDING_REQUESTS.get(text)!
  }

  const promise = (async () => {
    try {
      const response = await api.convertFurigana(text)
      const segments: RubySegment[] = []

      for (const token of response.tokens) {
        if (token.is_kanji && token.reading) {
          const hiraganaReading = katakanaToHiragana(token.reading)
          // Align individual morpheme if it has okurigana (e.g. 食べる -> 食[た]べる)
          const aligned = alignFurigana(token.surface, hiraganaReading)
          segments.push(...aligned)
        } else {
          segments.push({ text: token.surface })
        }
      }

      lruSet(FURIGANA_CACHE, text, segments)
      return segments
    } catch {
      // Fallback: plain text
      const plain = [{ text }]
      lruSet(FURIGANA_CACHE, text, plain)
      return plain
    } finally {
      PENDING_REQUESTS.delete(text)
    }
  })()

  PENDING_REQUESTS.set(text, promise)
  return promise
}
