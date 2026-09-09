import { describe, it, expect } from 'vitest'
import {
  myersDiff,
  computeJapaneseSentenceDiff,
} from '../lib/myersDiff'

describe("Myers' O(ND) Difference Algorithm", () => {
  it('returns empty script for identical empty strings', () => {
    expect(myersDiff('', '')).toEqual([])
  })

  it('detects pure equality when strings are identical', () => {
    const script = myersDiff('日本語', '日本語')
    expect(script.every((op) => op.type === 'equal')).toBe(true)
    expect(script.map((op) => op.char).join('')).toBe('日本語')
  })

  it('detects pure insertions and pure deletions', () => {
    const insertScript = myersDiff('', '東京')
    expect(insertScript.every((op) => op.type === 'insert')).toBe(true)
    expect(insertScript.map((op) => op.char).join('')).toBe('東京')

    const deleteScript = myersDiff('京都', '')
    expect(deleteScript.every((op) => op.type === 'delete')).toBe(true)
    expect(deleteScript.map((op) => op.char).join('')).toBe('京都')
  })

  it('finds minimal edit script on Japanese sentence substitutions', () => {
    // "私は学生だ" -> "私が学生です"
    // 'は' -> 'が', 'だ' -> 'です'
    const chunks = computeJapaneseSentenceDiff('私は学生だ', '私が学生です')
    expect(chunks.length).toBeGreaterThanOrEqual(4)

    // First chunk: equal "私"
    expect(chunks[0]).toEqual({
      type: 'equal',
      before_text: '私',
      after_text: '私',
      rationale_vi: '',
    })

    // Second chunk: replace 'は' with 'が'
    expect(chunks[1].type).toBe('replace')
    expect(chunks[1].before_text).toBe('は')
    expect(chunks[1].after_text).toBe('が')
    expect(chunks[1].rationale_vi).toContain('trợ từ')

    // Third chunk: equal "学生"
    expect(chunks[2]).toEqual({
      type: 'equal',
      before_text: '学生',
      after_text: '学生',
      rationale_vi: '',
    })

    // Fourth chunk: replace 'だ' with 'です'
    expect(chunks[3].type).toBe('replace')
    expect(chunks[3].before_text).toBe('だ')
    expect(chunks[3].after_text).toBe('です')
    expect(chunks[3].rationale_vi).toContain('lịch sự')
  })

  it('groups consecutive insertions and deletions into semantic chunks', () => {
    // Adding a polite sentence connector
    const chunks = computeJapaneseSentenceDiff('雨が降った。', '雨が降ったので、行かなかった。')
    const insertChunk = chunks.find((c) => c.type === 'insert')
    expect(insertChunk).toBeDefined()
    expect(insertChunk?.after_text).toContain('ので、')
  })
})
