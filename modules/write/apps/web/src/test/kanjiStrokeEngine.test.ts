import { describe, it, expect } from 'vitest'
import {
  distance,
  vectorAngle,
  angleDifference,
  resamplePoints,
  parseKanjiVgSvg,
  validateStroke,
  calculateOverallScore,
  computeDTWDistance,
} from '../services/kanjiStrokeEngine'

describe('kanjiStrokeEngine', () => {
  it('calculates Euclidean distance correctly', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5)
    expect(distance({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(0)
  })

  it('calculates angle differences correctly', () => {
    const p1 = { x: 0, y: 0 }
    const pRight = { x: 10, y: 0 } // angle 0
    const pDown = { x: 0, y: 10 } // angle PI/2
    const pLeft = { x: -10, y: 0 } // angle PI

    const a1 = vectorAngle(p1, pRight)
    const a2 = vectorAngle(p1, pDown)
    const a3 = vectorAngle(p1, pLeft)

    expect(angleDifference(a1, a2)).toBeCloseTo(Math.PI / 2)
    expect(angleDifference(a1, a3)).toBeCloseTo(Math.PI)
  })

  it('resamples polyline points evenly', () => {
    const raw = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]
    const resampled = resamplePoints(raw, 5)
    expect(resampled.length).toBe(5)
    expect(resampled[0]).toEqual({ x: 0, y: 0 })
    expect(resampled[2]).toEqual({ x: 50, y: 0 })
    expect(resampled[4]).toEqual({ x: 100, y: 0 })
  })

  it('parses KanjiVG SVG into structured stroke set', () => {
    const mockSvg = `
      <svg viewBox="0 0 109 109">
        <g id="kvg:test">
          <path id="s1" d="M10,20 L80,20" />
          <path id="s2" d="M45,20 L45,90" />
        </g>
      </svg>
    `
    const set = parseKanjiVgSvg(mockSvg, '十')
    expect(set.kanji).toBe('十')
    expect(set.strokeCount).toBe(2)
    expect(set.strokes.length).toBe(2)
    expect(set.strokes[0].index).toBe(1)
    expect(set.strokes[1].index).toBe(2)
  })

  it('validates correct stroke drawing and rejects reverse stroke', () => {
    const mockSvg = `
      <svg viewBox="0 0 109 109">
        <path d="M10,20 L80,20" />
      </svg>
    `
    const set = parseKanjiVgSvg(mockSvg, '一')
    const stroke1 = set.strokes[0]

    // Correct stroke from left to right
    const validDrawn = [
      { x: 10, y: 20 },
      { x: 45, y: 21 },
      { x: 80, y: 20 },
    ]
    const resultGood = validateStroke(validDrawn, stroke1)
    expect(resultGood.valid).toBe(true)
    expect(resultGood.accuracy).toBeGreaterThanOrEqual(70)

    // Reverse stroke from right to left
    const reverseDrawn = [
      { x: 80, y: 20 },
      { x: 45, y: 20 },
      { x: 10, y: 20 },
    ]
    const resultReverse = validateStroke(reverseDrawn, stroke1)
    expect(resultReverse.valid).toBe(false)
    expect(resultReverse.errorReason).toBe('direction')

    // Too short / incomplete stroke
    const shortDrawn = [{ x: 10, y: 20 }, { x: 11, y: 20 }]
    const resultShort = validateStroke(shortDrawn, stroke1)
    expect(resultShort.valid).toBe(false)
    expect(resultShort.errorReason).toBe('incomplete')
  })

  it('calculates performance score with stars and Hanko stamp', () => {
    const perfect = calculateOverallScore([95, 92, 98], 3, 0, 0)
    expect(perfect.stars).toBe(3)
    expect(perfect.grade).toBe('S')
    expect(perfect.hankoTop).toBe('大変よく')
    expect(perfect.hankoBottom).toBe('できました')

    const withMistakes = calculateOverallScore([80, 80], 2, 2, 1)
    expect(withMistakes.score).toBeLessThan(80)
    expect(withMistakes.stars).toBeLessThanOrEqual(2)
  })

  it('computes DTW distance with non-linear speed tolerance', () => {
    // Two identical lines, but one drawn with non-linear velocity (bunching at start)
    const lineA = [
      { x: 0, y: 0 },
      { x: 25, y: 0 },
      { x: 50, y: 0 },
      { x: 75, y: 0 },
      { x: 100, y: 0 },
    ]
    const lineB = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 15, y: 0 },
      { x: 70, y: 0 },
      { x: 100, y: 0 },
    ]
    const dtw = computeDTWDistance(lineA, lineB, 0.4)
    expect(dtw).toBeLessThan(15) // DTW warps non-linear points gracefully
  })
})
