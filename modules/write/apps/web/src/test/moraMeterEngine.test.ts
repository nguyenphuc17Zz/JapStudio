import { describe, it, expect } from 'vitest'
import {
  parseMoraTokens,
  countMora,
  analyzeHaikuMeter,
  extractCleanKanaReading,
} from '../services/moraMeterEngine'

describe('Japanese Phonotactic Mora Meter FST', () => {
  it('extracts clean kana reading and strips romaji annotations', () => {
    expect(extractCleanKanaReading('ふるいけや (Furuike ya)')).toBe('ふるいけや')
    expect(extractCleanKanaReading('かわずとびこむ [kawazu]')).toBe('かわずとびこむ')
  })

  it('treats contracted sounds (yōon 拗音) as a single mora', () => {
    // "きょう" -> "きょ" (1 mora) + "う" (1 mora) = 2 morae
    const tokens = parseMoraTokens('きょう')
    expect(tokens.length).toBe(2)
    expect(tokens[0]).toEqual({ text: 'きょ', type: 'yoon', moraCount: 1 })
    expect(tokens[1]).toEqual({ text: 'う', type: 'standard', moraCount: 1 })
    expect(countMora('きょう')).toBe(2)

    // "とうきょう" -> "と", "う", "きょ", "う" = 4 morae
    expect(countMora('とうきょう')).toBe(4)
  })

  it('counts sokuon (促音 っ) and hatsun (撥音 ん) as distinct morae', () => {
    // "きって" -> "き" (1) + "っ" (1) + "て" (1) = 3 morae
    expect(countMora('きって')).toBe(3)

    // "にっぽん" -> "に" (1) + "っ" (1) + "ぽ" (1) + "ん" (1) = 4 morae
    expect(countMora('にっぽん')).toBe(4)

    // "コーヒー" -> "コ" (1) + "ー" (1) + "ヒ" (1) + "ー" (1) = 4 morae
    expect(countMora('コーヒー')).toBe(4)
  })

  it('validates classical Bashō Haiku as perfect 5-7-5 meter', () => {
    const linesJp = ['古池や', '蛙飛び込む', '水の音']
    const linesReading = [
      'ふるいけや (Furuike ya)',
      'かわずとびこむ (Kawazu tobikomu)',
      'みずのおと (Mizu no oto)',
    ]

    const analysis = analyzeHaikuMeter(linesJp, linesReading)
    expect(analysis.isClassic575).toBe(true)
    expect(analysis.totalMoraCount).toBe(17)
    expect(analysis.lines[0].moraCount).toBe(5)
    expect(analysis.lines[1].moraCount).toBe(7)
    expect(analysis.lines[2].moraCount).toBe(5)
    expect(analysis.summaryVi).toContain('hoàn hảo')
  })

  it('detects ji-amari (hypermetric) and ji-tarazu (hypometric) lines', () => {
    const linesJp = ['春の海', '終日ひねもすのたりのたりかな', 'のどかさよ']
    const linesReading = [
      'はるのうみ', // 5 morae
      'ひねもすのたりのたりかな', // 12 morae (ji-amari)
      'のどかさ', // 4 morae (ji-tarazu)
    ]

    const analysis = analyzeHaikuMeter(linesJp, linesReading)
    expect(analysis.isClassic575).toBe(false)
    expect(analysis.lines[0].isExact).toBe(true)
    expect(analysis.lines[1].difference).toBe(5) // 12 - 7 = 5 (ji-amari)
    expect(analysis.lines[2].difference).toBe(-1) // 4 - 5 = -1 (ji-tarazu)
  })
})
