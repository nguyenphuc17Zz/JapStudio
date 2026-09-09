import { useState } from 'react'
import { sound } from '../../services/sound'

export function InteractiveFurin() {
  const [swaying, setSwaying] = useState(false)

  const handleRing = () => {
    setSwaying(true)
    sound.playFurin()
    setTimeout(() => {
      setSwaying(false)
    }, 1800)
  }

  return (
    <div
      onClick={handleRing}
      onMouseEnter={handleRing}
      style={{
        position: 'fixed',
        top: 0,
        right: 16,
        zIndex: 2100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        transformOrigin: 'top center',
        transform: swaying ? 'rotate(16deg)' : 'rotate(0deg)',
        transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      }}
      title="Chuông gió Furin - Chạm để nghe tiếng chuông thanh tịnh"
      aria-label="Chuông gió Furin"
    >
      {/* Hanging Cord */}
      <div style={{ width: 1.5, height: 16, background: 'rgba(255, 255, 255, 0.4)' }} />

      {/* Glass Dome */}
      <div
        style={{
          width: 24,
          height: 20,
          borderRadius: '12px 12px 6px 6px',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(139, 92, 246, 0.4) 100%)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Flower motif painted on glass */}
        <span style={{ fontSize: 9 }}>🌸</span>
      </div>

      {/* Inner Clapper String */}
      <div style={{ width: 1, height: 12, background: 'rgba(255, 255, 255, 0.3)' }} />

      {/* Tanzaku Paper Strip (短冊) */}
      <div
        style={{
          width: 8,
          height: 24,
          borderRadius: '1px 1px 2px 2px',
          background: 'linear-gradient(180deg, #f472b6 0%, #fbbf24 100%)',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
          transformOrigin: 'top center',
          transform: swaying ? 'rotate(-24deg)' : 'rotate(3deg)',
          transition: 'transform 0.5s ease',
        }}
      />
    </div>
  )
}
