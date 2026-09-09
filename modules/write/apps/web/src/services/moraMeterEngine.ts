/**
 * Japanese Phonotactic Mora Meter Automaton — Finite State Transducer (FST) for Haiku Poetics.
 *
 * Implements an exact Japanese phonotactic mora parser adhering to classical poetic meter (5-7-5):
 * - Yōon (拗音): Contracted diphthongs (e.g. きゃ, しゅ, ちょ) count as exactly 1 mora.
 * - Sokuon (促音): Geminate glottal stops (っ, ッ) count as 1 mora.
 * - Hatsun (撥音): Syllabic nasals (ん, ン) count as 1 mora.
 * - Chōonpu (長音符): Long vowels (ー) count as 1 mora.
 * - Identifies Ji-amari (字余り, hypermetric) and Ji-tarazu (字足らず, hypometric) variations.
 */

export interface MoraToken {
  text: string
  type: 'standard' | 'yoon' | 'sokuon' | 'chōon' | 'hatsun'
  moraCount: 1
}

export interface LineMoraAnalysis {
  line: string
  reading: string
  moraTokens: MoraToken[]
  moraCount: number
  targetMora: number
  difference: number
  isExact: boolean
  labelVi: string
}

export interface HaikuMeterAnalysis {
  lines: LineMoraAnalysis[]
  totalMoraCount: number
  isClassic575: boolean
  meterVariance: number
  summaryVi: string
}

const SMALL_KANA = new Set([
  'ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'ゎ',
  'ャ', 'ュ', 'ョ', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'ヮ',
])

const SOKUON = new Set(['っ', 'ッ'])
const HATSUN = new Set(['ん', 'ン'])
const CHOONPU = new Set(['ー'])

/**
 * Extracts clean Hiragana/Katakana phonetic reading from reading strings that might contain Romaji.
 * e.g. "ふるいけや (Furuike ya)" -> "ふるいけや"
 */
export function extractCleanKanaReading(rawReading: string): string {
  const withoutParens = rawReading.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim()
  // Keep only Hiragana, Katakana, and Chōonpu
  return withoutParens.replace(/[^\u3040-\u309F\u30A0-\u30FFー]/g, '')
}

/**
 * Finite State Transducer (FST) that parses Japanese phonetic text into formal Mora tokens.
 */
export function parseMoraTokens(kanaText: string): MoraToken[] {
  const clean = extractCleanKanaReading(kanaText)
  const tokens: MoraToken[] = []
  let i = 0
  const n = clean.length

  while (i < n) {
    const ch = clean[i]

    // Check for lookahead small kana (yōon 拗音): e.g. き + ょ -> きょ (1 mora)
    if (i + 1 < n && SMALL_KANA.has(clean[i + 1])) {
      tokens.push({
        text: ch + clean[i + 1],
        type: 'yoon',
        moraCount: 1,
      })
      i += 2
      continue
    }

    if (SOKUON.has(ch)) {
      tokens.push({
        text: ch,
        type: 'sokuon',
        moraCount: 1,
      })
      i += 1
      continue
    }

    if (HATSUN.has(ch)) {
      tokens.push({
        text: ch,
        type: 'hatsun',
        moraCount: 1,
      })
      i += 1
      continue
    }

    if (CHOONPU.has(ch)) {
      tokens.push({
        text: ch,
        type: 'chōon',
        moraCount: 1,
      })
      i += 1
      continue
    }

    // Standard single syllable mora
    tokens.push({
      text: ch,
      type: 'standard',
      moraCount: 1,
    })
    i += 1
  }

  return tokens
}

/**
 * Computes exact mora count for a given Japanese phonetic string.
 */
export function countMora(kanaText: string): number {
  return parseMoraTokens(kanaText).length
}

/**
 * Analyzes an authentic 3-line Japanese Haiku against classical 5-7-5 poetic meter.
 */
export function analyzeHaikuMeter(
  linesJp: string[],
  linesReading: string[]
): HaikuMeterAnalysis {
  const targets = [5, 7, 5]
  const lineAnalyses: LineMoraAnalysis[] = []

  let totalMora = 0
  let totalVariance = 0

  for (let idx = 0; idx < 3; idx++) {
    const line = linesJp[idx] || ''
    const reading = linesReading[idx] || line
    const tokens = parseMoraTokens(reading)
    const count = tokens.length
    const target = targets[idx]
    const diff = count - target

    totalMora += count
    totalVariance += Math.abs(diff)

    let labelVi = `${count} 拍 (Chuẩn ${target})`
    if (diff > 0) {
      labelVi = `${count} 拍 (Dư ${diff} - 字余り Ji-amari)`
    } else if (diff < 0) {
      labelVi = `${count} 拍 (Thiếu ${Math.abs(diff)} - 字足らず Ji-tarazu)`
    }

    lineAnalyses.push({
      line,
      reading,
      moraTokens: tokens,
      moraCount: count,
      targetMora: target,
      difference: diff,
      isExact: diff === 0,
      labelVi,
    })
  }

  const isClassic575 = totalVariance === 0

  let summaryVi = 'Nhịp điệu 5-7-5 cổ điển hoàn hảo tuyệt đối (正調俳句).'
  if (!isClassic575) {
    const varianceItems = lineAnalyses
      .filter((l) => !l.isExact)
      .map((l) => `Câu ${l.targetMora === 7 ? '2' : l.targetMora === 5 ? (lineAnalyses.indexOf(l) === 0 ? '1' : '3') : ''}: ${l.moraCount} 拍`)
    summaryVi = `Thể thơ tự do / biến thể nhịp điệu (${varianceItems.join(', ')}).`
  }

  return {
    lines: lineAnalyses,
    totalMoraCount: totalMora,
    isClassic575,
    meterVariance: totalVariance,
    summaryVi,
  }
}
