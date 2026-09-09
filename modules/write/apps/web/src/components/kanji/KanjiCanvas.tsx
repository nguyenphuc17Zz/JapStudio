import React, { useRef, useState, useEffect, useCallback } from 'react'
import { sound } from '../../services/sound'
import {
  type Point,
  type KanjiStrokeSet,
  validateStroke,
  calculateOverallScore,
} from '../../services/kanjiStrokeEngine'
import { kanjiService } from '../../services/kanjiService'

export type PracticeMode = 'demo' | 'guide' | 'quiz' | 'shodo'
export type GridType = 'nine' | 'four' | 'none'
export type InkColor = 'sumi' | 'shu' | 'kin' | 'aizome'

export interface KanjiCanvasProps {
  strokeSet: KanjiStrokeSet
  mode: PracticeMode
  gridType?: GridType
  speed?: number // 0.5, 1, 1.5, 2
  isPlaying?: boolean
  currentStep?: number
  inkColor?: InkColor
  showStrokeNumbers?: boolean
  hintTrigger?: number
  undoTrigger?: number
  clearTrigger?: number
  onStepChange?: (step: number) => void
  onComplete?: (result: { score: number; stars: number; grade: string }) => void
  onMistake?: (reason: string) => void
}

const INK_COLORS: Record<InkColor, { stroke: string; glow: string }> = {
  sumi: { stroke: 'var(--nihon-gofun)', glow: 'var(--color-surface-active)' },
  shu: { stroke: 'var(--color-error)', glow: 'var(--color-error-muted)' },
  kin: { stroke: 'var(--nihon-kin)', glow: 'var(--color-warning-muted)' },
  aizome: { stroke: 'var(--color-info)', glow: 'var(--color-info-muted)' },
}

export const KanjiCanvas: React.FC<KanjiCanvasProps> = React.memo(({
  strokeSet,
  mode,
  gridType = 'nine',
  speed = 1,
  isPlaying = false,
  currentStep = 1,
  inkColor = 'sumi',
  showStrokeNumbers = true,
  hintTrigger = 0,
  undoTrigger = 0,
  clearTrigger = 0,
  onStepChange,
  onComplete,
  onMistake,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentDrawnPoints, setCurrentDrawnPoints] = useState<Point[]>([])
  const [completedStrokes, setCompletedStrokes] = useState<number>(0)
  const [userStrokeAccuracies, setUserStrokeAccuracies] = useState<number[]>([])
  const [mistakesCount, setMistakesCount] = useState<number>(0)
  const [hintsUsedCount, setHintsUsedCount] = useState<number>(0)
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [freeStrokes, setFreeStrokes] = useState<Array<{ points: Point[]; color: string }>>([])
  const [showHintPulse, setShowHintPulse] = useState(false)
  const feedbackTimerRef = useRef<number | null>(null)

  const showFeedback = useCallback((text: string, type: 'success' | 'error' | 'info') => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current)
    }
    setFeedbackMessage({ text, type })
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedbackMessage(null)
      feedbackTimerRef.current = null
    }, 1200)
  }, [])

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current)
      }
    }
  }, [])

  // Handle external hint trigger
  useEffect(() => {
    if (hintTrigger > 0) {
      sound.playClick()
      setHintsUsedCount((c) => c + 1)
      setShowHintPulse(true)
      const timer = setTimeout(() => setShowHintPulse(false), 1600)
      return () => clearTimeout(timer)
    }
  }, [hintTrigger])

  // Handle external undo trigger
  useEffect(() => {
    if (undoTrigger > 0) {
      sound.playClick()
      setFreeStrokes((prev) => prev.slice(0, -1))
    }
  }, [undoTrigger])

  // Handle external clear trigger
  useEffect(() => {
    if (clearTrigger > 0) {
      sound.playClick()
      setFreeStrokes([])
      setCurrentDrawnPoints([])
    }
  }, [clearTrigger])

  const totalStrokes = strokeSet.strokes.length

  // Reset when character or mode changes
  useEffect(() => {
    setCompletedStrokes(0)
    setUserStrokeAccuracies([])
    setCurrentDrawnPoints([])
    setMistakesCount(0)
    setHintsUsedCount(0)
    setFeedbackMessage(null)
    setFreeStrokes([])
    setShowHintPulse(false)
    if (onStepChange) onStepChange(1)
  }, [strokeSet.kanji, mode, onStepChange])

  // Coordinate conversion helper: client pixel coordinates -> 109x109 KanjiVG scale
  const getScaledPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 109
    const y = ((e.clientY - rect.top) / rect.height) * 109
    return { x, y }
  }, [])

  // Handle Demo Mode animation tick
  useEffect(() => {
    if (mode !== 'demo' || !isPlaying) return

    const interval = window.setInterval(() => {
      sound.playWashiStroke()
      const nextStep = currentStep >= totalStrokes ? 1 : currentStep + 1
      if (onStepChange) onStepChange(nextStep)
      if (nextStep === totalStrokes) {
        sound.playKatanaSlice()
      }
    }, 900 / speed)

    return () => window.clearInterval(interval)
  }, [mode, isPlaying, currentStep, totalStrokes, speed, onStepChange])

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas dimensions with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1
    const displayWidth = canvas.clientWidth || 320
    const displayHeight = canvas.clientHeight || 320

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr
      canvas.height = displayHeight * dpr
    }

    ctx.save()
    ctx.scale((displayWidth * dpr) / 109, (displayHeight * dpr) / 109)
    ctx.clearRect(0, 0, 109, 109)

    // 1. Draw Free Shodo Strokes if in free mode
    if (mode === 'shodo') {
      freeStrokes.forEach((stroke) => {
        if (stroke.points.length < 2) return
        ctx.beginPath()
        ctx.strokeStyle = stroke.color
        ctx.lineWidth = 4
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.shadowColor = stroke.color
        ctx.shadowBlur = 4
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
        }
        ctx.stroke()
      })
    }

    // 2. Draw active user drawn stroke in progress
    if (currentDrawnPoints.length > 1) {
      ctx.beginPath()
      ctx.strokeStyle = INK_COLORS[inkColor].stroke
      ctx.lineWidth = 4.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.shadowColor = INK_COLORS[inkColor].glow
      ctx.shadowBlur = 6
      ctx.moveTo(currentDrawnPoints[0].x, currentDrawnPoints[0].y)

      // Smooth Bezier Curve
      for (let i = 1; i < currentDrawnPoints.length - 1; i++) {
        const xc = (currentDrawnPoints[i].x + currentDrawnPoints[i + 1].x) / 2
        const yc = (currentDrawnPoints[i].y + currentDrawnPoints[i + 1].y) / 2
        ctx.quadraticCurveTo(currentDrawnPoints[i].x, currentDrawnPoints[i].y, xc, yc)
      }
      ctx.lineTo(
        currentDrawnPoints[currentDrawnPoints.length - 1].x,
        currentDrawnPoints[currentDrawnPoints.length - 1].y
      )
      ctx.stroke()
    }

    ctx.restore()
  }, [currentDrawnPoints, freeStrokes, mode, inkColor])

  // Pointer event handlers for drawing
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode === 'demo') return
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)
    setIsDrawing(true)
    const pt = getScaledPoint(e)
    setCurrentDrawnPoints([pt])
    sound.playWashiStroke()
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || mode === 'demo') return
    const pt = getScaledPoint(e)
    setCurrentDrawnPoints((prev) => {
      const last = prev[prev.length - 1]
      if (last && Math.hypot(pt.x - last.x, pt.y - last.y) < 1.5) {
        return prev
      }
      return [...prev, pt]
    })
  }

  const handlePointerUp = () => {
    if (!isDrawing || mode === 'demo') return
    setIsDrawing(false)

    if (mode === 'shodo') {
      if (currentDrawnPoints.length > 1) {
        setFreeStrokes((prev) => [
          ...prev,
          { points: currentDrawnPoints, color: INK_COLORS[inkColor].stroke },
        ])
      }
      setCurrentDrawnPoints([])
      return
    }

    // In Guide or Quiz mode: Validate against current expected stroke
    const targetStrokeIndex = completedStrokes // 0-indexed
    const expectedStroke = strokeSet.strokes[targetStrokeIndex]

    if (!expectedStroke) {
      setCurrentDrawnPoints([])
      return
    }

    const result = validateStroke(currentDrawnPoints, expectedStroke)

    if (result.valid) {
      sound.playCorrectStroke()
      const nextCompleted = completedStrokes + 1
      setCompletedStrokes(nextCompleted)
      setUserStrokeAccuracies((prev) => [...prev, result.accuracy])
      showFeedback(result.message || `Đúng nét (${result.accuracy}%)`, 'success')
      if (onStepChange) onStepChange(nextCompleted + 1)

      // If finished all strokes
      if (nextCompleted >= totalStrokes) {
        sound.playKatanaSlice()
        sound.playStamp()
        const allAccuracies = [...userStrokeAccuracies, result.accuracy]
        const scoreResult = calculateOverallScore(
          allAccuracies,
          totalStrokes,
          mistakesCount,
          hintsUsedCount
        )

        kanjiService.saveMastery(strokeSet.kanji, scoreResult.score, scoreResult.stars)

        if (onComplete) {
          onComplete(scoreResult)
        }
      }
    } else {
      sound.playWrongStroke()
      setMistakesCount((c) => c + 1)
      showFeedback(result.message || 'Chưa đúng nét', 'error')
      if (onMistake) onMistake(result.message || 'Lỗi nét')
    }

    setCurrentDrawnPoints([])
  }

  return (
    <div
      ref={containerRef}
      className="jw-kanji-canvas-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 320,
        aspectRatio: '1/1',
        margin: '0 auto',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* 9-Grid (Cửu Cung 格) / 4-Grid (Điền Tự 格) Guidelines */}
      <div
        className="jw-kanji-grid-background"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--color-surface)',
          border: '2px solid var(--color-border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          // dogfood layout tokens via class would be jw-stack but canvas wrapper keeps absolute grid
          
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {gridType === 'nine' && (
          <>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '33.3%', width: 1, borderLeft: '1px dashed rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '66.6%', width: 1, borderLeft: '1px dashed rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: '33.3%', height: 1, borderTop: '1px dashed rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: '66.6%', height: 1, borderTop: '1px dashed rgba(255,255,255,0.08)' }} />
            {/* Diagonal Guide Lines */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.05 }}>
              <line x1="0" y1="0" x2="100%" y2="100%" stroke="#fff" strokeDasharray="3,3" />
              <line x1="100%" y1="0" x2="0" y2="100%" stroke="#fff" strokeDasharray="3,3" />
            </svg>
          </>
        )}
        {gridType === 'four' && (
          <>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, borderLeft: '1px dashed rgba(255,255,255,0.1)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, borderTop: '1px dashed rgba(255,255,255,0.1)' }} />
          </>
        )}
      </div>

      {/* SVG Layer for Stroke Order Rendering / Ghosts */}
      <svg
        viewBox={strokeSet.viewBox || '0 0 109 109'}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {/* 1. Ghost Outlines in Guide Mode or Demo Mode */}
        {mode !== 'shodo' &&
          strokeSet.strokes.map((stroke, idx) => {
            const isCompleted = mode === 'demo' ? idx < currentStep : idx < completedStrokes
            const isCurrent = mode === 'demo' ? idx === currentStep - 1 : idx === completedStrokes
            const isNextGhost = mode === 'guide' && idx === completedStrokes

            // In Quiz mode, hide all upcoming ghost strokes
            if (mode === 'quiz' && !isCompleted) return null

            return (
              <g key={idx}>
                {/* Completed / Active Statically Drawn Path */}
                {isCompleted && (
                  <path
                    d={stroke.path}
                    fill="none"
                    stroke="var(--nihon-gofun)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      filter: 'drop-shadow(0 0 4px var(--color-foreground-muted))',
                      transition: 'stroke 0.2s ease',
                    }}
                  />
                )}

                {/* Ghost guide stroke for active step */}
                {isNextGhost && (
                  <path
                    d={stroke.path}
                    fill="none"
                    stroke={showHintPulse ? 'var(--color-error)' : 'var(--color-foreground-muted)'}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={showHintPulse ? 'none' : '4, 4'}
                    style={{
                      transition: 'all 0.3s ease',
                      filter: showHintPulse ? 'drop-shadow(0 0 10px var(--color-error))' : 'none',
                    }}
                  />
                )}

                {/* Demo active animated stroke highlight */}
                {mode === 'demo' && isCurrent && (
                  <path
                    d={stroke.path}
                    fill="none"
                    stroke="var(--color-error)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      filter: 'drop-shadow(0 0 10px var(--color-error))',
                    }}
                  />
                )}

                {/* Stroke Numbers */}
                {showStrokeNumbers && (mode === 'demo' || (mode === 'guide' && isCurrent)) && (
                  <g transform={`translate(${stroke.startPoint.x - 4}, ${stroke.startPoint.y - 4})`}>
                    <circle cx="4" cy="4" r="5" fill="var(--color-error)" />
                    <text
                      x="4"
                      y="6"
                      textAnchor="middle"
                      fill="var(--color-on-accent)"
                      fontSize="5"
                      fontWeight="bold"
                    >
                      {stroke.index}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
      </svg>

      {/* Interactive HTML5 Canvas for Real-time Ink Drawing */}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Bảng tập viết chữ ${strokeSet.kanji} — dùng chuột hoặc cảm ứng để viết`}
        tabIndex={mode === 'demo' ? -1 : 0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          cursor: mode === 'demo' ? 'default' : 'crosshair',
          touchAction: 'none',
        }}
      />

      {/* Top-Left: Reference Sample Kanji (Chữ mẫu) */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          padding: '2px 8px',
          zIndex: 10,
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
        }}
      >
        <span style={{ fontSize: 16, fontFamily: 'var(--font-japanese)', fontWeight: 800, color: 'var(--nihon-kin)', lineHeight: 1 }}>
          {strokeSet.kanji}
        </span>
        <span style={{ fontSize: 11, color: 'var(--color-foreground-secondary)', fontWeight: 600 }}>
          Nét {Math.min(totalStrokes, (mode === 'demo' ? currentStep : completedStrokes + 1))}/{totalStrokes}
        </span>
      </div>

      {/* Top-Right: Floating Compact Feedback Notification */}
      {feedbackMessage && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background:
              feedbackMessage.type === 'success'
                ? 'var(--color-success)'
                : feedbackMessage.type === 'error'
                ? 'var(--color-error)'
                : 'var(--color-info)',
            backdropFilter: 'var(--glass-blur)',
            color: 'var(--color-on-accent)',
            padding: '3px 8px',
            borderRadius: 'var(--radius-full)',
            fontSize: '11px',
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
            zIndex: 10,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          {feedbackMessage.text}
        </div>
      )}
    </div>
  )
})
