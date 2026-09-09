import { useEffect, useRef, useState } from 'react'

export const INK_CURSOR_STORAGE_KEY = 'jws.ink_cursor.enabled'

interface Point {
  x: number
  y: number
  alpha: number
  size: number
}

export function InkBrushCursor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [enabled, setEnabled] = useState(() => {
    try {
      const val = localStorage.getItem(INK_CURSOR_STORAGE_KEY)
      return val !== null ? val === 'true' : true
    } catch {
      return true
    }
  })

  useEffect(() => {
    const handleToggle = (e: CustomEvent<boolean>) => {
      setEnabled(e.detail)
    }
    window.addEventListener('jws:toggle-ink-cursor', handleToggle as EventListener)
    return () => window.removeEventListener('jws:toggle-ink-cursor', handleToggle as EventListener)
  }, [])

  useEffect(() => {
    if (!enabled) return
    // Disable on mobile/touch screens
    if (typeof window === 'undefined' || 'ontouchstart' in window) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const points: Point[] = []
    let lastX = -100
    let lastY = -100

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    const handleMouseMove = (e: MouseEvent) => {
      const speed = Math.hypot(e.clientX - lastX, e.clientY - lastY)
      lastX = e.clientX
      lastY = e.clientY

      points.push({
        x: e.clientX,
        y: e.clientY,
        alpha: 0.6,
        size: Math.max(3, Math.min(14, speed * 0.4)),
      })

      if (points.length > 25) {
        points.shift()
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < points.length; i++) {
        const pt = points[i]
        pt.alpha *= 0.9

        if (i > 0) {
          const prev = points[i - 1]
          ctx.save()
          ctx.beginPath()
          ctx.moveTo(prev.x, prev.y)
          ctx.lineTo(pt.x, pt.y)
          ctx.strokeStyle = `rgba(139, 92, 246, ${pt.alpha})`
          ctx.lineWidth = pt.size
          ctx.lineCap = 'round'
          ctx.shadowBlur = 8
          ctx.shadowColor = '#8b5cf6'
          ctx.stroke()
          ctx.restore()
        }
      }

      // Filter dead points
      while (points.length > 0 && points[0].alpha < 0.02) {
        points.shift()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
      aria-hidden="true"
    />
  )
}
