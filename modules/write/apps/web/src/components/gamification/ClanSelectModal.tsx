import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { sound } from '../../services/sound'
import { TiltCard } from '../ui/TiltCard'
import { Button } from '../ui/Button'
import {
  type ClanId,
  type ClanInfo,
  CLANS,
  CLAN_STORAGE_KEY,
} from './clanData'

export type { ClanId, ClanInfo }


export interface ClanSelectModalProps {
  open: boolean
  onClose: () => void
  onSelect?: (clan: ClanInfo) => void
}

export function ClanSelectModal({ open, onClose, onSelect }: ClanSelectModalProps) {
  const [selectedClan, setSelectedClan] = useState<ClanId>(() => {
    try {
      const saved = localStorage.getItem(CLAN_STORAGE_KEY)
      return (saved as ClanId) || 'sakura'
    } catch {
      return 'sakura'
    }
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CLAN_STORAGE_KEY)
      if (saved && CLANS[saved as ClanId]) {
        setSelectedClan(saved as ClanId)
      }
    } catch {}
  }, [open])

  if (!open) return null

  const handleConfirm = () => {
    try {
      localStorage.setItem(CLAN_STORAGE_KEY, selectedClan)
    } catch {}
    sound.playLevelUp()
    window.dispatchEvent(new CustomEvent('jws:clan-changed', { detail: selectedClan }))
    onSelect?.(CLANS[selectedClan])
    onClose()
  }

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(5, 7, 15, 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-md)',
        overflowY: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Chọn Bang Phái Thư Đạo"
    >
      <div
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.85)',
          padding: 'var(--space-xl)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-md)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
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

        <span
          className="jw-badge"
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.04em',
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            color: 'var(--nihon-kikyo)',
            padding: '4px 12px',
          }}
        >
          ⛩️ 門派 · TỨ ĐẠI BANG PHÁI VĂN NHÂN
        </span>

        <h2 style={{ fontSize: 'var(--text-title-lg)', fontWeight: 800, margin: 0, textAlign: 'center' }}>
          Gia Nhập Bang Phái Thư Đạo
        </h2>

        {/* 4 Clan Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-md)',
            width: '100%',
            margin: 'var(--space-xs) 0',
          }}
        >
          {Object.values(CLANS).map((clan) => {
            const isSelected = clan.id === selectedClan

            return (
              <div
                key={clan.id}
                onClick={() => {
                  sound.playClick()
                  setSelectedClan(clan.id)
                }}
                style={{ cursor: 'pointer' }}
              >
                <TiltCard maxRotation={6} scale={1.03}>
                  <div
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      background: isSelected ? `${clan.color}18` : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? `2px solid ${clan.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: isSelected ? `0 8px 24px ${clan.color}33` : 'none',
                      padding: 'var(--space-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 24 }}>{clan.icon}</span>
                      <span
                        style={{
                          fontFamily: 'var(--font-japanese)',
                          fontWeight: 900,
                          fontSize: 14,
                          color: clan.color,
                          border: `1px solid ${clan.color}55`,
                          borderRadius: 4,
                          padding: '1px 6px',
                        }}
                      >
                        {clan.kanji}
                      </span>
                    </div>

                    <h4 style={{ fontSize: 15, fontWeight: 800, margin: '4px 0 0 0', color: '#ffffff' }}>
                      {clan.name}
                    </h4>
                    <span style={{ fontSize: 11, fontWeight: 700, color: clan.color }}>
                      {clan.title}
                    </span>
                    <p style={{ fontSize: 11, color: 'var(--color-foreground-secondary)', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                      {clan.philosophy}
                    </p>
                    <span style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--color-foreground-muted)', marginTop: 4 }}>
                      Khẩu hiệu: {clan.motto}
                    </span>
                  </div>
                </TiltCard>
              </div>
            )
          })}
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={handleConfirm}
          style={{
            width: '100%',
            background: `linear-gradient(135deg, ${CLANS[selectedClan].color} 0%, #000 160%)`,
            boxShadow: `0 4px 18px ${CLANS[selectedClan].color}55`,
            border: 'none',
            marginTop: 'var(--space-xs)',
          }}
        >
          Gia Nhập {CLANS[selectedClan].name} ⛩️
        </Button>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
