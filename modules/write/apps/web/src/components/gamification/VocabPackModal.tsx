import { useState } from 'react'
import { createPortal } from 'react-dom'
import { TiltCard } from '../ui/TiltCard'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { sound } from '../../services/sound'
import { ConfettiCannon } from './ConfettiCannon'
import type { VocabularyListItem } from '../../types/api'

export interface VocabPackModalProps {
  items: VocabularyListItem[]
  open: boolean
  onClose: () => void
}

const RARITY_MAP: Record<string, { label: string; tone: 'accent' | 'warning' | 'info' | 'success' | 'neutral'; color: string }> = {
  N1: { label: 'SSR · LEGENDARY', tone: 'warning', color: '#fbbf24' },
  N2: { label: 'SR · RARE', tone: 'accent', color: '#c084fc' },
  N3: { label: 'R · UNCOMMON', tone: 'info', color: '#38bdf8' },
  N4: { label: 'N · COMMON', tone: 'success', color: '#10b981' },
  N5: { label: 'N · NOVICE', tone: 'neutral', color: '#94a3b8' },
}

export function VocabPackModal({ items, open, onClose }: VocabPackModalProps) {
  const [opened, setOpened] = useState(false)
  const [cards, setCards] = useState<VocabularyListItem[]>([])

  if (!open) return null

  const handleOpenPack = () => {
    // Pick 3 random cards or mock items
    const sample = items.length >= 3 ? [...items].sort(() => 0.5 - Math.random()).slice(0, 3) : items
    setCards(sample)
    setOpened(true)
    sound.playLevelUp()
  }

  const handleResetAndClose = () => {
    setOpened(false)
    onClose()
  }

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 7, 15, 0.88)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-md)',
        overflowY: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Bóc gói thẻ từ vựng TCG"
    >
      {opened && <ConfettiCannon />}

      <div
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
          padding: 'var(--space-xl)',
          position: 'relative',
          textAlign: 'center',
        }}
      >
        <button
          type="button"
          onClick={handleResetAndClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            color: 'var(--color-foreground-muted)',
            cursor: 'pointer',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
          aria-label="Đóng"
        >
          ✕
        </button>

        {!opened ? (
          /* Unopened Foil Booster Pack */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)' }}>
            <span
              className="jw-badge jw-badge--accent"
              style={{ fontFamily: 'var(--font-japanese)', fontSize: 12, letterSpacing: '0.1em' }}
            >
              本日のおみくじ · TCG PACK
            </span>
            <h2 style={{ fontSize: 'var(--text-title-lg)', fontWeight: 800, margin: 0 }}>
              Gói Thẻ Từ Vựng Thần Bí
            </h2>
            <p style={{ color: 'var(--color-foreground-secondary)', margin: 0, maxWidth: 420, fontSize: 'var(--text-body)' }}>
              Mỗi ngày bóc một gói để ngẫu nhiên khám phá 3 từ vựng theo chuẩn độ hiếm JLPT!
            </p>

            {/* Booster Pack Graphic */}
            <div
              onClick={handleOpenPack}
              className="jw-float"
              style={{
                width: 170,
                height: 250,
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #fbbf24 100%)',
                boxShadow: '0 16px 40px rgba(139, 92, 246, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
                border: '2px solid rgba(255, 255, 255, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                margin: 'var(--space-md) 0',
                position: 'relative',
                overflow: 'hidden',
                userSelect: 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                  animation: 'goldShimmer 2.5s infinite linear',
                }}
              />
              <span style={{ fontSize: 48, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>🎴</span>
              <span style={{ fontFamily: 'var(--font-japanese)', fontWeight: 800, fontSize: 18, color: '#fff', marginTop: 8 }}>
                語彙巻
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.08em' }}>
                BOOSTER PACK
              </span>
            </div>

            <Button variant="primary" size="lg" onClick={handleOpenPack} icon="sparkles">
              Xé Gói Thẻ Ngay! 🌟
            </Button>
          </div>
        ) : (
          /* Opened Cards Showcase */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)' }}>
            <span
              className="jw-badge jw-badge--warning"
              style={{ fontFamily: 'var(--font-japanese)', fontSize: 12, letterSpacing: '0.1em' }}
            >
              ✨ REVEALED CARDS
            </span>
            <h2 style={{ fontSize: 'var(--text-title-lg)', fontWeight: 800, margin: 0 }}>
              Bộ Thẻ Vừa Nhận Được
            </h2>

            <div
              style={{
                display: 'flex',
                gap: 'var(--space-md)',
                justifyContent: 'center',
                flexWrap: 'wrap',
                margin: 'var(--space-md) 0',
                width: '100%',
              }}
            >
              {cards.map((card, idx) => {
                const jlpt = card.estimated_jlpt_level ?? 'N3'
                const rarity = RARITY_MAP[jlpt] ?? RARITY_MAP.N3

                return (
                  <TiltCard key={card.id ?? idx} maxRotation={8} scale={1.03}>
                    <div
                      style={{
                        width: 180,
                        minHeight: 220,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--glass-bg)',
                        backdropFilter: 'var(--glass-blur)',
                        border: `2px solid ${rarity.color}`,
                        boxShadow: `0 8px 24px ${rarity.color}33`,
                        padding: 'var(--space-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        position: 'relative',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Badge tone={rarity.tone}>
                            {jlpt}
                          </Badge>
                          <span style={{ fontSize: 10, fontWeight: 700, color: rarity.color }}>
                            {rarity.label.split(' · ')[0]}
                          </span>
                        </div>
                        <h4
                          className="jw-jp-text"
                          lang="ja"
                          style={{
                            fontSize: 22,
                            fontWeight: 800,
                            margin: '4px 0',
                            color: 'var(--color-foreground)',
                          }}
                        >
                          {card.expression}
                        </h4>
                        {card.reading && (
                          <p style={{ fontSize: 12, color: 'var(--color-foreground-muted)', margin: 0 }}>
                            {card.reading}
                          </p>
                        )}
                        <p style={{ fontSize: 13, color: 'var(--color-foreground-secondary)', marginTop: 8, lineHeight: 1.4 }}>
                          {card.meaning_vi}
                        </p>
                      </div>

                      <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 6, marginTop: 8 }}>
                        <span style={{ fontSize: 10, color: 'var(--color-foreground-muted)' }}>
                          Gặp {card.seen_count} lần
                        </span>
                      </div>
                    </div>
                  </TiltCard>
                )
              })}
            </div>

            <Button variant="secondary" size="md" onClick={handleResetAndClose}>
              Đã Nhận Thẻ ✓
            </Button>
          </div>
        )}
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
