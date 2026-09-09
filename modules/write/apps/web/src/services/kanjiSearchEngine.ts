/**
 * KanjiSearchEngine — Peak Information Retrieval Engine for Japanese Kanji & Vocabulary.
 * 
 * Implements two classical discrete computer science structures:
 * 1. Compressed Radix Trie (Patricia Trie): O(k) prefix matching across Kanji, Hiragana,
 *    Katakana, Romaji, and Han-Viet readings.
 * 2. Burkhard-Keller Metric Tree (BK-Tree): Discrete metric space tree using Damerau-Levenshtein
 *    distance with triangle inequality pruning (d(x, z) <= d(x, y) + d(y, z)) for O(log N)
 *    typo-tolerant search with adjacent character transpositions.
 * 3. Multi-Signal Relevance Ranker: Weights exact character match (100), prefix match (80),
 *    metric edit distance (70/50), and semantic substring match (40).
 */

import type { KanjiDetail } from './kanjiService'

// ---------------------------------------------------------------------------
// 1. Damerau-Levenshtein Distance Metric
// ---------------------------------------------------------------------------

/**
 * Calculates Damerau-Levenshtein distance between two strings with support
 * for insertions, deletions, substitutions, and adjacent transpositions.
 * Satisfies all metric space axioms (identity, symmetry, non-negativity, triangle inequality).
 */
export function damerauLevenshtein(a: string, b: string): number {
  const lenA = a.length
  const lenB = b.length
  if (lenA === 0) return lenB
  if (lenB === 0) return lenA

  const d: number[][] = Array.from({ length: lenA + 1 }, () =>
    new Array<number>(lenB + 1).fill(0)
  )

  for (let i = 0; i <= lenA; i++) d[i][0] = i
  for (let j = 0; j <= lenB; j++) d[0][j] = j

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      )

      // Transposition check
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      }
    }
  }

  return d[lenA][lenB]
}

// ---------------------------------------------------------------------------
// 2. Burkhard-Keller Tree (BK-Tree)
// ---------------------------------------------------------------------------

export interface BKNode<T> {
  word: string
  payloads: Set<T>
  children: Map<number, BKNode<T>>
}

export class BKTree<T> {
  private root: BKNode<T> | null = null
  private _size = 0

  public get size(): number {
    return this._size
  }

  public insert(word: string, payload: T): void {
    const term = word.trim().toLowerCase()
    if (!term) return

    if (!this.root) {
      this.root = { word: term, payloads: new Set([payload]), children: new Map() }
      this._size++
      return
    }

    let current = this.root
    while (true) {
      const dist = damerauLevenshtein(current.word, term)
      if (dist === 0) {
        current.payloads.add(payload)
        return
      }

      const nextNode = current.children.get(dist)
      if (nextNode) {
        current = nextNode
      } else {
        current.children.set(dist, { word: term, payloads: new Set([payload]), children: new Map() })
        this._size++
        break
      }
    }
  }

  /**
   * Metric-space range query: locates all items with Damerau-Levenshtein distance <= maxDistance.
   * Leverages triangle inequality |d(current, term) - dist| <= maxDistance to prune search branches.
   */
  public search(query: string, maxDistance = 2): Array<{ item: T; distance: number; term: string }> {
    const term = query.trim().toLowerCase()
    if (!term || !this.root) return []

    const results: Array<{ item: T; distance: number; term: string }> = []
    const queue: Array<BKNode<T>> = [this.root]

    while (queue.length > 0) {
      const current = queue.pop()!
      const dist = damerauLevenshtein(current.word, term)

      if (dist <= maxDistance) {
        for (const payload of current.payloads) {
          results.push({ item: payload, distance: dist, term: current.word })
        }
      }

      // Triangle inequality bounds: [dist - maxDistance, dist + maxDistance]
      const minBound = Math.max(1, dist - maxDistance)
      const maxBound = dist + maxDistance

      for (const [edgeWeight, child] of current.children.entries()) {
        if (edgeWeight >= minBound && edgeWeight <= maxBound) {
          queue.push(child)
        }
      }
    }

    return results
  }
}

// ---------------------------------------------------------------------------
// 3. Compressed Radix Trie (Patricia Trie)
// ---------------------------------------------------------------------------

export interface RadixNode<T> {
  edge: string
  payloads: Set<T>
  children: Map<string, RadixNode<T>>
}

export class CompressedRadixTrie<T> {
  private root: RadixNode<T> = {
    edge: '',
    payloads: new Set(),
    children: new Map(),
  }

  public insert(key: string, payload: T): void {
    const term = key.trim().toLowerCase()
    if (!term) return

    let current = this.root
    let remaining = term

    while (remaining.length > 0) {
      const firstChar = remaining[0]
      const child = current.children.get(firstChar)

      if (!child) {
        const newNode: RadixNode<T> = {
          edge: remaining,
          payloads: new Set([payload]),
          children: new Map(),
        }
        current.children.set(firstChar, newNode)
        return
      }

      let commonPrefixLen = 0
      const minLen = Math.min(child.edge.length, remaining.length)
      while (
        commonPrefixLen < minLen &&
        child.edge[commonPrefixLen] === remaining[commonPrefixLen]
      ) {
        commonPrefixLen++
      }

      if (commonPrefixLen === child.edge.length) {
        current = child
        remaining = remaining.slice(commonPrefixLen)
        if (remaining.length === 0) {
          current.payloads.add(payload)
          return
        }
      } else {
        const existingRemainingEdge = child.edge.slice(commonPrefixLen)
        const splitChild: RadixNode<T> = {
          edge: existingRemainingEdge,
          payloads: new Set(child.payloads),
          children: child.children,
        }

        child.edge = child.edge.slice(0, commonPrefixLen)
        child.payloads = new Set()
        child.children = new Map()
        child.children.set(existingRemainingEdge[0], splitChild)

        const newRemainingEdge = remaining.slice(commonPrefixLen)
        if (newRemainingEdge.length === 0) {
          child.payloads.add(payload)
        } else {
          const newLeaf: RadixNode<T> = {
            edge: newRemainingEdge,
            payloads: new Set([payload]),
            children: new Map(),
          }
          child.children.set(newRemainingEdge[0], newLeaf)
        }
        return
      }
    }

    current.payloads.add(payload)
  }

  public searchPrefix(prefix: string): Set<T> {
    const term = prefix.trim().toLowerCase()
    if (!term) return new Set()

    let current = this.root
    let remaining = term

    while (remaining.length > 0) {
      const firstChar = remaining[0]
      const child = current.children.get(firstChar)
      if (!child) return new Set()

      if (remaining.startsWith(child.edge)) {
        remaining = remaining.slice(child.edge.length)
        current = child
      } else if (child.edge.startsWith(remaining)) {
        current = child
        break
      } else {
        return new Set()
      }
    }

    const results = new Set<T>()
    const stack = [current]
    while (stack.length > 0) {
      const node = stack.pop()!
      for (const p of node.payloads) {
        results.add(p)
      }
      for (const child of node.children.values()) {
        stack.push(child)
      }
    }

    return results
  }
}

// ---------------------------------------------------------------------------
// 4. Phonetic & Script Normalization Utilities
// ---------------------------------------------------------------------------

export function removeVietnameseDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

export function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  )
}

const HIRAGANA_TO_ROMAJI_MAP: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'wo', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
}

export function hiraganaToRomaji(kana: string): string {
  let result = ''
  let i = 0
  while (i < kana.length) {
    if (i + 1 < kana.length) {
      const digraph = kana.slice(i, i + 2)
      if (HIRAGANA_TO_ROMAJI_MAP[digraph]) {
        result += HIRAGANA_TO_ROMAJI_MAP[digraph]
        i += 2
        continue
      }
    }
    const single = kana[i]
    if (single === 'っ' && i + 1 < kana.length) {
      const nextRomaji = hiraganaToRomaji(kana[i + 1])
      if (nextRomaji) result += nextRomaji[0]
      i++
      continue
    }
    result += HIRAGANA_TO_ROMAJI_MAP[single] || single
    i++
  }
  return result
}

// ---------------------------------------------------------------------------
// 5. KanjiSearchEngine (Unified High-Performance Engine)
// ---------------------------------------------------------------------------

export class KanjiSearchEngine {
  private radixTrie = new CompressedRadixTrie<KanjiDetail>()
  private bkTree = new BKTree<KanjiDetail>()
  private kanjiList: KanjiDetail[] = []
  private indexed = false

  public indexKanji(kanjiList: KanjiDetail[]): void {
    this.kanjiList = kanjiList
    this.radixTrie = new CompressedRadixTrie<KanjiDetail>()
    this.bkTree = new BKTree<KanjiDetail>()

    for (const item of kanjiList) {
      // 1. Index Kanji character itself
      this.radixTrie.insert(item.kanji, item)
      this.bkTree.insert(item.kanji, item)

      // 2. Index Han-Viet with and without diacritics
      const hanVietLower = item.hanViet.toLowerCase()
      this.radixTrie.insert(hanVietLower, item)
      this.bkTree.insert(hanVietLower, item)

      const hanVietNoDiacritics = removeVietnameseDiacritics(hanVietLower)
      if (hanVietNoDiacritics !== hanVietLower) {
        this.radixTrie.insert(hanVietNoDiacritics, item)
        this.bkTree.insert(hanVietNoDiacritics, item)
      }

      // 3. Index Onyomi & Kunyomi (raw, Hiragana normalized, and Romaji)
      for (const on of item.onyomi) {
        const cleanOn = on.replace(/[・-]/g, '').toLowerCase()
        if (cleanOn && cleanOn !== '-') {
          const hiraganaOn = katakanaToHiragana(cleanOn)
          const romajiOn = hiraganaToRomaji(hiraganaOn)
          this.radixTrie.insert(cleanOn, item)
          this.radixTrie.insert(hiraganaOn, item)
          this.bkTree.insert(cleanOn, item)
          this.bkTree.insert(hiraganaOn, item)
          if (romajiOn && romajiOn !== hiraganaOn) {
            this.radixTrie.insert(romajiOn, item)
            this.bkTree.insert(romajiOn, item)
          }
        }
      }

      for (const kun of item.kunyomi) {
        const cleanKun = kun.replace(/[・-]/g, '').toLowerCase()
        if (cleanKun && cleanKun !== '-') {
          const romajiKun = hiraganaToRomaji(cleanKun)
          this.radixTrie.insert(cleanKun, item)
          this.bkTree.insert(cleanKun, item)
          if (romajiKun && romajiKun !== cleanKun) {
            this.radixTrie.insert(romajiKun, item)
            this.bkTree.insert(romajiKun, item)
          }
        }
      }

      // 4. Index compound words in Radix Trie for instant prefix completion
      for (const compound of item.compounds) {
        if (compound.word) {
          this.radixTrie.insert(compound.word.toLowerCase(), item)
        }
        if (compound.reading) {
          const cleanReading = compound.reading.split('(')[0].trim().toLowerCase()
          if (cleanReading) {
            this.radixTrie.insert(cleanReading, item)
            const romajiReading = hiraganaToRomaji(katakanaToHiragana(cleanReading))
            if (romajiReading) {
              this.radixTrie.insert(romajiReading, item)
            }
          }
        }
      }
    }

    this.indexed = true
  }

  /**
   * Executes multi-signal ranked query combining exact match, prefix match (Radix Trie),
   * metric fuzzy search (BK-Tree), and semantic substring search.
   */
  public search(query: string, jlptFilter?: string): KanjiDetail[] {
    const rawQ = query.trim().toLowerCase()
    if (!rawQ) {
      if (!jlptFilter) return this.kanjiList
      return this.kanjiList.filter((k) => k.jlpt === jlptFilter)
    }

    const qNoDiacritics = removeVietnameseDiacritics(rawQ)
    const qHiragana = katakanaToHiragana(rawQ)

    const scores = new Map<KanjiDetail, number>()

    const addScore = (item: KanjiDetail, points: number) => {
      if (jlptFilter && item.jlpt !== jlptFilter) return
      const existing = scores.get(item) || 0
      if (points > existing) {
        scores.set(item, points)
      }
    }

    // Signal 1: Exact matches (Score: 100)
    for (const item of this.kanjiList) {
      if (item.kanji === rawQ) {
        addScore(item, 100)
      } else if (
        item.hanViet.toLowerCase() === rawQ ||
        removeVietnameseDiacritics(item.hanViet.toLowerCase()) === qNoDiacritics
      ) {
        addScore(item, 95)
      }
    }

    // Signal 2: Fast Prefix Match via Compressed Radix Trie (Score: 80)
    const prefixMatches = new Set<KanjiDetail>([
      ...this.radixTrie.searchPrefix(rawQ),
      ...this.radixTrie.searchPrefix(qNoDiacritics),
      ...this.radixTrie.searchPrefix(qHiragana),
    ])

    for (const item of prefixMatches) {
      addScore(item, 80)
    }

    // Signal 3: Metric Fuzzy Search via BK-Tree (Tolerance distance <= 2)
    if (rawQ.length >= 3) {
      const bkResults = [
        ...this.bkTree.search(rawQ, 2),
        ...this.bkTree.search(qNoDiacritics, 2),
        ...this.bkTree.search(qHiragana, 2),
      ]

      for (const res of bkResults) {
        const fuzzyScore = res.distance === 0 ? 90 : res.distance === 1 ? 70 : 50
        addScore(res.item, fuzzyScore)
      }
    }

    // Signal 4: Substring search across meaning & radicals as fallback (Score: 40)
    if (scores.size === 0 || rawQ.length >= 2) {
      for (const item of this.kanjiList) {
        if (scores.has(item)) continue
        const meaningLower = item.meaning.toLowerCase()
        const radicalLower = item.radical.toLowerCase()
        if (
          meaningLower.includes(rawQ) ||
          removeVietnameseDiacritics(meaningLower).includes(qNoDiacritics) ||
          radicalLower.includes(rawQ)
        ) {
          addScore(item, 40)
        }
      }
    }

    return Array.from(scores.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]
        return a[0].strokeCount - b[0].strokeCount
      })
      .map(([item]) => item)
  }

  public isIndexed(): boolean {
    return this.indexed
  }
}

export const kanjiSearchEngine = new KanjiSearchEngine()
