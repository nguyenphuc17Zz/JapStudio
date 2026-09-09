import { useEffect, useRef } from 'react'
import { useSeason } from '../../context/SeasonContext'

interface ParticleItem {
  x: number
  y: number
  size: number
  vx: number
  vy: number
  rotation: number
  rotSpeed: number
  oscillationSpeed: number
  oscillationDistance: number
  color: string
  alpha: number
  type: 'sakura' | 'firefly' | 'momiji' | 'snow'
}

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const { season } = useSeason()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    let mouseX = -1000
    let mouseY = -1000

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    const sakuraColors = ['#ff8da1', '#ffb7c5', '#ffccd5', '#f472b6', '#c084fc']
    const fireflyColors = ['#00f5a0', '#38bdf8', '#fbbf24', '#a855f7']
    const momijiColors = ['#e11d48', '#f59e0b', '#d97706', '#ea580c', '#b91c1c']
    const snowColors = ['#ffffff', '#e0f2fe', '#bae6fd', '#7dd3fc']

    const currentColors =
      season === 'natsu'
        ? fireflyColors
        : season === 'aki'
          ? momijiColors
          : season === 'fuyu'
            ? snowColors
            : sakuraColors

    const particleType: ParticleItem['type'] =
      season === 'natsu' ? 'firefly' : season === 'aki' ? 'momiji' : season === 'fuyu' ? 'snow' : 'sakura'

    const particles: ParticleItem[] = Array.from({ length: 28 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: particleType === 'firefly' ? Math.random() * 3 + 2 : Math.random() * 8 + 6,
      vx: particleType === 'snow' ? (Math.random() - 0.5) * 0.4 : Math.random() * 0.8 + 0.3,
      vy: particleType === 'firefly' ? (Math.random() - 0.5) * 0.6 : Math.random() * 0.8 + 0.4,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 1.5,
      oscillationSpeed: Math.random() * 0.02 + 0.01,
      oscillationDistance: Math.random() * 1.5 + 0.5,
      color: currentColors[Math.floor(Math.random() * currentColors.length)],
      alpha: Math.random() * 0.6 + 0.25,
      type: particleType,
    }))

    let time = 0

    const render = () => {
      time += 0.02
      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        if (p.type === 'firefly') {
          // Floating Fireflies (Hotaru)
          p.x += p.vx + Math.sin(time + p.y * 0.01) * 0.6
          p.y += p.vy + Math.cos(time + p.x * 0.01) * 0.6
          p.alpha = 0.3 + Math.sin(time * 3 + p.x) * 0.45
        } else if (p.type === 'snow') {
          // Falling Snow Crystals
          p.x += Math.sin(time * 2 + p.y * 0.02) * 0.8
          p.y += p.vy
        } else {
          // Drifting Sakura / Momiji Leaves
          p.x += p.vx + Math.sin(time * p.oscillationSpeed * 10) * p.oscillationDistance
          p.y += p.vy
          p.rotation += p.rotSpeed
        }

        // Mouse gentle repulsion
        const dx = p.x - mouseX
        const dy = p.y - mouseY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 120) {
          p.x += (dx / dist) * 2.5
          p.y += (dy / dist) * 2.5
        }

        // Boundary wrap
        if (p.y > height + 20) {
          p.y = -20
          p.x = Math.random() * width
        }
        if (p.y < -20 && p.type === 'firefly') {
          p.y = height + 20
        }
        if (p.x > width + 20) p.x = -20
        if (p.x < -20) p.x = width + 20

        ctx.save()
        ctx.translate(p.x, p.y)

        if (p.type === 'firefly' || p.type === 'snow') {
          ctx.beginPath()
          ctx.arc(0, 0, p.size, 0, Math.PI * 2)
          ctx.fillStyle = p.color
          ctx.globalAlpha = Math.max(0.1, Math.min(0.9, p.alpha))
          ctx.shadowBlur = p.type === 'firefly' ? 14 : 6
          ctx.shadowColor = p.color
          ctx.fill()
        } else {
          // Sakura or Momiji Leaf shape
          ctx.rotate((p.rotation * Math.PI) / 180)
          ctx.scale(Math.sin(time + p.x * 0.01), 1) // 3D flipping simulation
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.bezierCurveTo(p.size * 0.5, -p.size * 0.8, p.size, -p.size * 0.3, 0, p.size)
          ctx.bezierCurveTo(-p.size, -p.size * 0.3, -p.size * 0.5, -p.size * 0.8, 0, 0)
          ctx.fillStyle = p.color
          ctx.globalAlpha = p.alpha
          ctx.shadowBlur = 8
          ctx.shadowColor = p.color
          ctx.fill()
        }

        ctx.restore()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [season])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.8,
      }}
      aria-hidden="true"
    />
  )
}
