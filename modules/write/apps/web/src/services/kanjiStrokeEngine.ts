/**
 * Kanji Stroke Engine: Path analysis, vector direction validation,
 * stroke interpolation and accuracy scoring for Japanese Kanji practice.
 */

export interface Point {
  x: number
  y: number
}

export interface StrokeData {
  index: number
  path: string
  startPoint: Point
  endPoint: Point
  length: number
  samplePoints: Point[]
}

export interface KanjiStrokeSet {
  kanji: string
  strokeCount: number
  strokes: StrokeData[]
  viewBox: string
}

export interface StrokeValidationResult {
  valid: boolean
  accuracy: number
  errorReason?: 'direction' | 'shape' | 'order' | 'incomplete'
  message?: string
}

/**
 * Calculates Euclidean distance between two points.
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Calculates the angle (in radians) of the vector from p1 to p2.
 */
export function vectorAngle(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x)
}

/**
 * Difference between two angles in radians (0 to PI).
 */
export function angleDifference(a1: number, a2: number): number {
  let diff = Math.abs(a1 - a2) % (2 * Math.PI)
  if (diff > Math.PI) {
    diff = 2 * Math.PI - diff
  }
  return diff
}

/**
 * Resamples a polyline of drawn points into `targetCount` evenly-spaced points.
 */
export function resamplePoints(points: Point[], targetCount = 25): Point[] {
  if (points.length === 0) return []
  if (points.length === 1) {
    return Array(targetCount).fill(points[0])
  }

  // Calculate total cumulative lengths
  const cumLengths: number[] = [0]
  for (let i = 1; i < points.length; i++) {
    const d = distance(points[i - 1], points[i])
    cumLengths.push(cumLengths[i - 1] + d)
  }
  const totalLength = cumLengths[cumLengths.length - 1]

  if (totalLength === 0) {
    return Array(targetCount).fill(points[0])
  }

  const resampled: Point[] = [points[0]]
  const step = totalLength / (targetCount - 1)

  for (let i = 1; i < targetCount - 1; i++) {
    const targetDist = i * step
    // Find segment containing targetDist
    let segIdx = 0
    while (segIdx < cumLengths.length - 1 && cumLengths[segIdx + 1] < targetDist) {
      segIdx++
    }
    const segStartDist = cumLengths[segIdx]
    const segEndDist = cumLengths[segIdx + 1]
    const segLen = segEndDist - segStartDist
    const t = segLen > 0 ? (targetDist - segStartDist) / segLen : 0

    const pA = points[segIdx]
    const pB = points[segIdx + 1]
    resampled.push({
      x: pA.x + (pB.x - pA.x) * t,
      y: pA.y + (pB.y - pA.y) * t,
    })
  }

  resampled.push(points[points.length - 1])
  return resampled
}

/**
 * Computes Dynamic Time Warping (DTW) distance with a Sakoe-Chiba constraint band.
 * Solves non-linear temporal warping between drawn stroke trajectory and canonical SVG stroke.
 *
 * @param pointsA Drawn stroke points (length N)
 * @param pointsB Canonical stroke points (length M)
 * @param windowRatio Ratio of sequence length for Sakoe-Chiba band constraint (default 0.3)
 * @returns Normalized warping path distance
 */
export function computeDTWDistance(
  pointsA: Point[],
  pointsB: Point[],
  windowRatio = 0.3
): number {
  const n = pointsA.length
  const m = pointsB.length

  if (n === 0 || m === 0) return Infinity
  if (n === 1 && m === 1) return distance(pointsA[0], pointsB[0])

  // Sakoe-Chiba band width
  const w = Math.max(Math.abs(n - m) + 1, Math.max(3, Math.floor(Math.min(n, m) * windowRatio)))

  // Initialize DP cost matrix with Infinity
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(Infinity)
  )
  dp[0][0] = 0

  for (let i = 1; i <= n; i++) {
    const jStart = Math.max(1, i - w)
    const jEnd = Math.min(m, i + w)
    for (let j = jStart; j <= jEnd; j++) {
      const cost = distance(pointsA[i - 1], pointsB[j - 1])
      const minPrev = Math.min(
        dp[i - 1][j],     // insertion
        dp[i][j - 1],     // deletion
        dp[i - 1][j - 1]  // match
      )
      dp[i][j] = cost + minPrev
    }
  }

  const finalCost = dp[n][m]
  if (finalCost === Infinity) {
    // Fallback if warping outside band: average point-by-point distance
    let fallback = 0
    const len = Math.min(n, m)
    for (let i = 0; i < len; i++) fallback += distance(pointsA[i], pointsB[i])
    return fallback / len
  }

  const pathLength = Math.max(n, m)
  return finalCost / pathLength
}

/**
 * Approximate SVG Path sample points using DOM if available, or fallback geometric parsing.
 */
export function sampleSvgPath(pathStr: string, sampleCount = 25): {
  samplePoints: Point[]
  startPoint: Point
  endPoint: Point
  length: number
} {
  // Check if browser DOM is available
  if (typeof document !== 'undefined') {
    try {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      pathEl.setAttribute('d', pathStr)
      svg.appendChild(pathEl)
      document.body.appendChild(svg)
      const totalLen = pathEl.getTotalLength()

      const samples: Point[] = []
      for (let i = 0; i < sampleCount; i++) {
        const len = (i / (sampleCount - 1)) * totalLen
        const pt = pathEl.getPointAtLength(len)
        samples.push({ x: pt.x, y: pt.y })
      }
      document.body.removeChild(svg)

      return {
        samplePoints: samples,
        startPoint: samples[0],
        endPoint: samples[samples.length - 1],
        length: totalLen,
      }
    } catch {
      // fallback if DOM measurement fails
    }
  }

  // Fallback heuristic: Extract coordinate numbers from path string
  const coords: number[] = []
  const matches = pathStr.match(/-?\d+(?:\.\d+)?/g)
  if (matches) {
    for (const m of matches) {
      coords.push(parseFloat(m))
    }
  }

  const rawPoints: Point[] = []
  for (let i = 0; i < coords.length - 1; i += 2) {
    rawPoints.push({ x: coords[i], y: coords[i + 1] })
  }

  if (rawPoints.length === 0) {
    rawPoints.push({ x: 50, y: 50 }, { x: 60, y: 60 })
  }

  const samplePoints = resamplePoints(rawPoints, sampleCount)
  return {
    samplePoints,
    startPoint: samplePoints[0],
    endPoint: samplePoints[samplePoints.length - 1],
    length: rawPoints.length * 10,
  }
}

const kanjiStrokeCache = new Map<string, KanjiStrokeSet>()

/**
 * Parses KanjiVG SVG string into a structured KanjiStrokeSet — with LRU cache by kanji char.
 */
export function parseKanjiVgSvg(svgText: string, kanjiChar: string): KanjiStrokeSet {
  const cached = kanjiStrokeCache.get(kanjiChar)
  if (cached) return cached
  const strokePaths: string[] = []

  // Extract all <path ... d="..." /> elements
  const pathRegex = /<path[^>]+d="([^"]+)"/g
  let match: RegExpExecArray | null
  while ((match = pathRegex.exec(svgText)) !== null) {
    const d = match[1].trim()
    if (d && !d.includes('M0') && !d.includes('none')) {
      strokePaths.push(d)
    }
  }

  // Extract viewBox if available, default to "0 0 109 109" for KanjiVG
  const viewBoxMatch = svgText.match(/viewBox="([^"]+)"/)
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 109 109'

  const strokes: StrokeData[] = strokePaths.map((path, idx) => {
    const { samplePoints, startPoint, endPoint, length } = sampleSvgPath(path, 25)
    return {
      index: idx + 1,
      path,
      startPoint,
      endPoint,
      length,
      samplePoints,
    }
  })

  const result: KanjiStrokeSet = {
    kanji: kanjiChar,
    strokeCount: strokes.length,
    strokes,
    viewBox,
  }
  kanjiStrokeCache.set(kanjiChar, result)
  if (kanjiStrokeCache.size > 128) {
    const first = kanjiStrokeCache.keys().next().value as string | undefined
    if (first) kanjiStrokeCache.delete(first)
  }
  return result
}

/**
 * Validates a user's drawn stroke against the expected KanjiVG stroke.
 *
 * Checks:
 * 1. Minimum stroke length (not just a tap)
 * 2. Direction alignment (avoiding reverse strokes)
 * 3. Proximity and shape similarity (average distance threshold)
 */
export function validateStroke(
  drawnPoints: Point[],
  expectedStroke: StrokeData,
  maxAllowedAvgDistance = 24
): StrokeValidationResult {
  if (!drawnPoints || drawnPoints.length < 3) {
    return {
      valid: false,
      accuracy: 0,
      errorReason: 'incomplete',
      message: 'Nét quá ngắn',
    }
  }

  // Calculate drawn stroke length
  let drawnLength = 0
  for (let i = 1; i < drawnPoints.length; i++) {
    drawnLength += distance(drawnPoints[i - 1], drawnPoints[i])
  }

  if (drawnLength < 8) {
    return {
      valid: false,
      accuracy: 0,
      errorReason: 'incomplete',
      message: 'Nét quá ngắn',
    }
  }

  // Resample drawn stroke to same point count as expected stroke (25 points)
  const resampledDrawn = resamplePoints(drawnPoints, expectedStroke.samplePoints.length)
  const expected = expectedStroke.samplePoints

  // 1. Vector Direction Check: Compare overall start->end vector
  const drawnStart = resampledDrawn[0]
  const drawnEnd = resampledDrawn[resampledDrawn.length - 1]
  const expStart = expected[0]
  const expEnd = expected[expected.length - 1]

  const drawnAngle = vectorAngle(drawnStart, drawnEnd)
  const expAngle = vectorAngle(expStart, expEnd)
  const expDist = distance(expStart, expEnd)

  // If the stroke has noticeable length, check direction
  if (expDist > 12) {
    const angleDiff = angleDifference(drawnAngle, expAngle)
    // If drawn in reverse direction (> 100 degrees / ~1.75 rad)
    if (angleDiff > 1.75) {
      return {
        valid: false,
        accuracy: 25,
        errorReason: 'direction',
        message: 'Ngược hướng nét',
      }
    }
  }

  // 2. Start & End Point Proximity check
  const startDist = distance(drawnStart, expStart)
  const endDist = distance(drawnEnd, expEnd)

  if (startDist > 38 && endDist > 38) {
    return {
      valid: false,
      accuracy: 30,
      errorReason: 'shape',
      message: 'Vị trí nét chưa chuẩn',
    }
  }

  // 3. Dynamic Time Warping (DTW) Distance with Sakoe-Chiba constraint band
  // Provides non-linear temporal tolerance while strictly enforcing geometric trajectory
  const dtwDist = computeDTWDistance(resampledDrawn, expected, 0.3)

  // Point-by-point distance for global endpoint/position context
  let totalDistance = 0
  for (let i = 0; i < expected.length; i++) {
    totalDistance += distance(resampledDrawn[i], expected[i])
  }
  const pointAvgDist = totalDistance / expected.length

  // Hybrid metric: 70% DTW trajectory similarity + 30% point-by-point alignment
  const avgDist = Math.min(pointAvgDist, dtwDist * 0.7 + pointAvgDist * 0.3)

  if (avgDist > maxAllowedAvgDistance) {
    return {
      valid: false,
      accuracy: Math.max(10, Math.round(100 - avgDist * 2.8)),
      errorReason: 'shape',
      message: 'Nét chưa khớp',
    }
  }

  // Calculate accuracy percentage (70% - 100%)
  const accuracy = Math.min(100, Math.max(70, Math.round(100 - avgDist * 1.5)))

  return {
    valid: true,
    accuracy,
    message: accuracy >= 90 ? `Xuất sắc (${accuracy}%)` : `Đúng nét (${accuracy}%)`,
  }
}

/**
 * Calculates overall performance score for a Kanji writing practice session.
 */
export function calculateOverallScore(
  strokeAccuracies: number[],
  totalStrokes: number,
  mistakes = 0,
  hintsUsed = 0
): {
  score: number
  stars: number
  grade: 'S' | 'A' | 'B' | 'C'
  hankoTop: string
  hankoBottom: string
  expAward: number
} {
  if (strokeAccuracies.length === 0 || totalStrokes <= 0) {
    return {
      score: 0,
      stars: 0,
      grade: 'C',
      hankoTop: 'もう',
      hankoBottom: '一息',
      expAward: 0,
    }
  }

  const completionRatio = Math.min(1, strokeAccuracies.length / totalStrokes)
  const avgAccuracy =
    (strokeAccuracies.reduce((sum, val) => sum + val, 0) / strokeAccuracies.length) * completionRatio

  // Deductions for mistakes and hints
  const penalty = mistakes * 4 + hintsUsed * 5
  const finalScore = Math.max(30, Math.min(100, Math.round(avgAccuracy - penalty)))

  let stars = 1
  let grade: 'S' | 'A' | 'B' | 'C' = 'C'
  let hankoTop = 'もう'
  let hankoBottom = '一息'
  let expAward = 10

  if (finalScore >= 90) {
    stars = 3
    grade = 'S'
    hankoTop = '大変よく'
    hankoBottom = 'できました'
    expAward = 35
  } else if (finalScore >= 75) {
    stars = 2
    grade = 'A'
    hankoTop = '合'
    hankoBottom = '格'
    expAward = 25
  } else if (finalScore >= 60) {
    stars = 1
    grade = 'B'
    hankoTop = '良'
    hankoBottom = '好'
    expAward = 15
  }

  return {
    score: finalScore,
    stars,
    grade,
    hankoTop,
    hankoBottom,
    expAward,
  }
}
