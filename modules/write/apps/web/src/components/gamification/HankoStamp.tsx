import { useEffect } from 'react'
import { sound } from '../../services/sound'

export interface HankoStampProps {
  score: number
  size?: number
  animate?: boolean
  className?: string
}

export function HankoStamp({ score, size = 96, animate = true, className = '' }: HankoStampProps) {
  useEffect(() => {
    if (animate) {
      sound.playStamp()
    }
  }, [animate])

  let kanjiTop = '大変よく'
  let kanjiBottom = 'できました'
  let sub = 'EXCELLENT'

  if (score < 75) {
    kanjiTop = 'もう'
    kanjiBottom = '一息'
    sub = 'KEEP TRYING'
  } else if (score < 90) {
    kanjiTop = '合'
    kanjiBottom = '格'
    sub = 'PASSED'
  }

  return (
    <div
      className={`jw-hanko-stamp ${className}`}
      style={{
        width: size,
        height: size,
        animation: animate ? 'hankoStamp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' : 'none',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '3.5px solid var(--nihon-shu)',
        borderRadius: '50%',
        color: 'var(--nihon-shu)',
        padding: 6,
        userSelect: 'none',
        position: 'relative',
        boxShadow: 'inset 0 0 12px rgba(225, 77, 63, 0.2), 0 4px 14px var(--nihon-shu-glow)',
        background: 'rgba(225, 77, 63, 0.04)',
      }}
      role="img"
      aria-label={`Con dấu đánh giá: ${kanjiTop}${kanjiBottom}`}
    >
      {/* Inner decorative double ring */}
      <div
        style={{
          position: 'absolute',
          inset: 3,
          border: '1px dashed var(--nihon-shu)',
          borderRadius: '50%',
          opacity: 0.75,
          pointerEvents: 'none',
        }}
      />
      <span
        className="jw-jp-text"
        lang="ja"
        style={{
          fontSize: score >= 90 ? size * 0.16 : size * 0.26,
          fontWeight: 800,
          lineHeight: 1.1,
          textAlign: 'center',
          letterSpacing: '0.05em',
        }}
      >
        {kanjiTop}
      </span>
      <span
        className="jw-jp-text"
        lang="ja"
        style={{
          fontSize: score >= 90 ? size * 0.16 : size * 0.26,
          fontWeight: 800,
          lineHeight: 1.1,
          textAlign: 'center',
          letterSpacing: '0.05em',
        }}
      >
        {kanjiBottom}
      </span>
      <span
        style={{
          fontSize: size * 0.09,
          fontWeight: 700,
          letterSpacing: '0.12em',
          opacity: 0.8,
          marginTop: 2,
        }}
      >
        {sub}
      </span>
    </div>
  )
}
