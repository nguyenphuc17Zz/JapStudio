/**
 * Optimal Counting Bloom Filter with Kirsch-Mitzenmacher Double-Hashing
 *
 * Implements a 4-bit nibble Counting Bloom Filter for sub-microsecond
 * probabilistic membership testing and real-time JLPT Lexical Coverage.
 *
 * Mathematics:
 * - Optimal bits: m = ceil( -n * ln(p) / (ln(2)^2) )
 * - Optimal hash count: k = ceil( (m / n) * ln(2) )
 * - Kirsch-Mitzenmacher hashing: g_i(x) = (h1(x) + i * h2(x) + i^2) mod m
 */

export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface JLPTCoverageResult {
  totalTokens: number;
  classifiedTokens: number;
  levelCounts: Record<JLPTLevel, number>;
  levelPercentages: Record<JLPTLevel, number>;
  unclassifiedTokens: string[];
  estimatedLevel: JLPTLevel;
  difficultyScore: number; // 1.0 (pure N5) to 5.0 (pure N1)
}

/**
 * 32-bit FNV-1a Hash
 */
export function fnv1a32(str: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

/**
 * 32-bit MurmurHash3-style finalizer / secondary hash
 */
export function murmurHash3Finalizer(str: string): number {
  let h = fnv1a32(str) ^ 0x5bd1e995;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
  }
  return (h ^ 0x31415926) >>> 0;
}

export class CountingBloomFilter {
  readonly m: number; // Number of buckets
  readonly k: number; // Number of hash functions
  private storage: Uint8Array; // 4 bits per bucket -> 2 buckets per byte

  constructor(expectedItems: number = 1000, targetFPR: number = 0.01) {
    const n = Math.max(10, expectedItems);
    const p = Math.max(0.0001, Math.min(0.2, targetFPR));

    // Optimal m and k
    this.m = Math.ceil((-n * Math.log(p)) / (Math.LN2 * Math.LN2));
    this.k = Math.max(2, Math.ceil((this.m / n) * Math.LN2));

    // Allocate memory: ceil(m / 2) bytes
    const byteSize = Math.ceil(this.m / 2);
    this.storage = new Uint8Array(byteSize);
  }

  /**
   * Generates k hash indices using Kirsch-Mitzenmacher double-hashing.
   */
  private getIndices(item: string): number[] {
    const h1 = fnv1a32(item);
    const h2 = murmurHash3Finalizer(item);
    const indices: number[] = new Array(this.k);

    for (let i = 0; i < this.k; i++) {
      // g_i(x) = (h1 + i * h2 + i^2) mod m
      const hashVal = (h1 + (i * h2) + (i * i)) >>> 0;
      indices[i] = hashVal % this.m;
    }

    return indices;
  }

  private getCounter(idx: number): number {
    const byteIdx = idx >> 1;
    const isOdd = (idx & 1) === 1;
    const byteVal = this.storage[byteIdx];
    return isOdd ? (byteVal >> 4) & 0x0f : byteVal & 0x0f;
  }

  private setCounter(idx: number, val: number): void {
    const byteIdx = idx >> 1;
    const isOdd = (idx & 1) === 1;
    const clamped = Math.max(0, Math.min(15, val));
    const current = this.storage[byteIdx];

    if (isOdd) {
      this.storage[byteIdx] = (current & 0x0f) | (clamped << 4);
    } else {
      this.storage[byteIdx] = (current & 0xf0) | clamped;
    }
  }

  /**
   * Adds an item to the Counting Bloom Filter.
   */
  add(item: string): void {
    const indices = this.getIndices(item);
    for (const idx of indices) {
      const curr = this.getCounter(idx);
      if (curr < 15) {
        this.setCounter(idx, curr + 1);
      }
    }
  }

  /**
   * Removes an item from the Counting Bloom Filter.
   * Returns true if the item was likely present, false if not.
   */
  remove(item: string): boolean {
    if (!this.has(item)) {
      return false;
    }
    const indices = this.getIndices(item);
    for (const idx of indices) {
      const curr = this.getCounter(idx);
      if (curr > 0) {
        this.setCounter(idx, curr - 1);
      }
    }
    return true;
  }

  /**
   * Checks if an item is likely in the filter.
   */
  has(item: string): boolean {
    const indices = this.getIndices(item);
    for (const idx of indices) {
      if (this.getCounter(idx) === 0) {
        return false; // Zero false negatives
      }
    }
    return true;
  }

  /**
   * Returns the minimum count across all hash indices for an item.
   */
  estimateCount(item: string): number {
    const indices = this.getIndices(item);
    let minVal = 15;
    for (const idx of indices) {
      const c = this.getCounter(idx);
      if (c < minVal) {
        minVal = c;
      }
      if (minVal === 0) break;
    }
    return minVal;
  }

  clear(): void {
    this.storage.fill(0);
  }
}

// Built-in JLPT canonical vocabularies
const JLPT_VOCAB_MAP: Record<JLPTLevel, string[]> = {
  N5: [
    '私', '本', '学生', '学校', '食べる', '飲む', '行く', '来る', '見る', '聞く',
    '友達', '先生', '車', '日本', '水', '魚', '犬', '猫', '家', '今日',
    '明日', '昨日', '時間', '毎日', '勉強', '買う', '読む', '話す', '歩く', '雨',
  ],
  N4: [
    '試験', '運転', '案内', '準備', '連絡', '都合', '遠慮', '予定', '故障', '注意',
    '心配', '経験', '説明', '利用', '参加', '関係', '必要', '複雑', '簡単', '特別',
    '安全', '危険', '親切', '便利', '不便', '案内', '相談', '招待', '紹介', '出発',
  ],
  N3: [
    '敬語', '尊敬', '謙譲', '会議', '敬意', '丁寧', '面接', '書類', '手続き', '解決',
    '成功', '原因', '結果', '改善', '目的', '報告', '相談', '賛成', '反対', '調査',
    '比較', '開発', '管理', '協力', '感謝', '苦労', '効果', '限界', '状況', '伝統',
  ],
  N2: [
    '傾向', '効率', '構造', '契機', '把握', '考慮', '維持', '需要', '供給', '適切',
    '迅速', '詳細', '範囲', '影響', '前提', '促進', '展開', '分析', '反映', '確立',
    '妥協', '配慮', '要約', '矛盾', '措置', '格差', '動向', '過剰', '基盤', '徹底',
  ],
  N1: [
    '概念', '網羅', '齟齬', '乖離', '躊躇', '俯瞰', '変革', '妥当', '顕著', '精緻',
    '示唆', '懸念', '包括', '模索', '遵守', '帰結', '是正', '整合', '介在', '補填',
    '看過', '喚起', '淘汰', '脆弱', '顕在', '潜在', '変遷', '台頭', '偏重', '脈絡',
  ],
};

export class JLPTLexicalCoverageEngine {
  private filters: Record<JLPTLevel, CountingBloomFilter>;

  constructor() {
    this.filters = {
      N5: new CountingBloomFilter(100, 0.005),
      N4: new CountingBloomFilter(100, 0.005),
      N3: new CountingBloomFilter(100, 0.005),
      N2: new CountingBloomFilter(100, 0.005),
      N1: new CountingBloomFilter(100, 0.005),
    };

    // Pre-populate filters
    for (const level of (['N5', 'N4', 'N3', 'N2', 'N1'] as JLPTLevel[])) {
      for (const word of JLPT_VOCAB_MAP[level]) {
        this.filters[level].add(word);
      }
    }
  }

  /**
   * Identifies the JLPT level of a token.
   */
  classifyToken(token: string): JLPTLevel | null {
    const clean = token.trim();
    if (!clean) return null;

    // Scan hierarchy N1 -> N2 -> N3 -> N4 -> N5 or N5 -> N1
    // Most specific / advanced level takes precedence if collision occurs
    for (const level of (['N1', 'N2', 'N3', 'N4', 'N5'] as JLPTLevel[])) {
      if (this.filters[level].has(clean)) {
        return level;
      }
    }
    return null;
  }

  /**
   * Analyzes an array of Japanese words/tokens and calculates the live JLPT distribution.
   */
  analyzeCoverage(tokens: string[]): JLPTCoverageResult {
    const levelCounts: Record<JLPTLevel, number> = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
    const unclassified: string[] = [];
    let classifiedTotal = 0;

    for (const token of tokens) {
      const level = this.classifyToken(token);
      if (level) {
        levelCounts[level]++;
        classifiedTotal++;
      } else if (token.trim()) {
        unclassified.push(token.trim());
      }
    }

    const total = tokens.length;
    const levelPercentages: Record<JLPTLevel, number> = {
      N5: classifiedTotal > 0 ? Math.round((levelCounts.N5 / classifiedTotal) * 100) : 0,
      N4: classifiedTotal > 0 ? Math.round((levelCounts.N4 / classifiedTotal) * 100) : 0,
      N3: classifiedTotal > 0 ? Math.round((levelCounts.N3 / classifiedTotal) * 100) : 0,
      N2: classifiedTotal > 0 ? Math.round((levelCounts.N2 / classifiedTotal) * 100) : 0,
      N1: classifiedTotal > 0 ? Math.round((levelCounts.N1 / classifiedTotal) * 100) : 0,
    };

    // Calculate weighted difficulty score (1.0 for N5 ... 5.0 for N1)
    const weights: Record<JLPTLevel, number> = { N5: 1.0, N4: 2.0, N3: 3.0, N2: 4.0, N1: 5.0 };
    let weightedSum = 0;
    for (const lvl of (['N5', 'N4', 'N3', 'N2', 'N1'] as JLPTLevel[])) {
      weightedSum += levelCounts[lvl] * weights[lvl];
    }
    const difficultyScore = classifiedTotal > 0
      ? Math.round((weightedSum / classifiedTotal) * 100) / 100
      : 1.0;

    // Project estimated overall JLPT tier
    let estimatedLevel: JLPTLevel = 'N5';
    if (difficultyScore >= 4.2) estimatedLevel = 'N1';
    else if (difficultyScore >= 3.2) estimatedLevel = 'N2';
    else if (difficultyScore >= 2.3) estimatedLevel = 'N3';
    else if (difficultyScore >= 1.6) estimatedLevel = 'N4';

    return {
      totalTokens: total,
      classifiedTokens: classifiedTotal,
      levelCounts,
      levelPercentages,
      unclassifiedTokens: unclassified,
      estimatedLevel,
      difficultyScore,
    };
  }
}
