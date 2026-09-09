import { describe, it, expect } from 'vitest'
import {
  alignFurigana,
  parseRubyMarkup,
  katakanaToHiragana,
} from '../lib/furiganaAligner'

describe('furiganaAligner', () => {
  it('converts katakana to hiragana correctly', () => {
    expect(katakanaToHiragana('カンジ')).toBe('かんじ')
    expect(katakanaToHiragana('タベル')).toBe('たべる')
    expect(katakanaToHiragana('ニホンゴ')).toBe('にほんご')
  })

  it('aligns single kanji words', () => {
    const result = alignFurigana('漢字', 'かんじ')
    expect(result).toEqual([{ text: '漢字', ruby: 'かんじ' }])
  })

  it('aligns words with okurigana (e.g. 食べる -> たべる)', () => {
    const result = alignFurigana('食べる', 'たべる')
    expect(result).toEqual([
      { text: '食', ruby: 'た' },
      { text: 'べる' },
    ])
  })

  it('aligns words with middle kana (e.g. 引っ越す -> ひっこす)', () => {
    const result = alignFurigana('引っ越す', 'ひっこす')
    expect(result).toEqual([
      { text: '引', ruby: 'ひ' },
      { text: 'っ' },
      { text: '越', ruby: 'こ' },
      { text: 'す' },
    ])
  })

  it('handles pure kana without kanji', () => {
    const result = alignFurigana('ありがとう', 'ありがとう')
    expect(result).toEqual([{ text: 'ありがとう' }])
  })

  it('parses bracketed ruby markdown syntax [漢字|かんじ]', () => {
    const result = parseRubyMarkup('[私|わたし]は[日本人|にほんじん]です')
    expect(result).toEqual([
      { text: '私', ruby: 'わたし' },
      { text: 'は' },
      { text: '日本人', ruby: 'にほんじん' },
      { text: 'です' },
    ])
  })

  it('handles mixed bracketed words with okurigana', () => {
    const result = parseRubyMarkup('[食べる|たべる]ことが[好|す]き')
    expect(result).toEqual([
      { text: '食', ruby: 'た' },
      { text: 'べる' },
      { text: 'ことが' },
      { text: '好', ruby: 'す' },
      { text: 'き' },
    ])
  })

  it('aligns complex compound words with repeated kana using Dynamic Programming', () => {
    // "思い出す" has "い" and "す"
    const omoidasu = alignFurigana('思い出す', 'おもいだす')
    expect(omoidasu).toEqual([
      { text: '思', ruby: 'おも' },
      { text: 'い' },
      { text: '出', ruby: 'だ' },
      { text: 'す' },
    ])

    // "引き受ける" has "き" and "ける"
    const hikiukeru = alignFurigana('引き受ける', 'ひきうける')
    expect(hikiukeru).toEqual([
      { text: '引', ruby: 'ひ' },
      { text: 'き' },
      { text: '受', ruby: 'う' },
      { text: 'ける' },
    ])
  })
})
