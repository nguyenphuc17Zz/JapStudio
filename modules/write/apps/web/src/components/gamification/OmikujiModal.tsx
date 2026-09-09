import { useState } from 'react'
import { createPortal } from 'react-dom'
import { sound } from '../../services/sound'
import { api } from '../../services/api'
import { useAIProvider } from '../../context/AIProviderContext'
import type { OmikujiFortuneResponse } from '../../types/api'
import { ConfettiCannon } from './ConfettiCannon'
import { TiltCard } from '../ui/TiltCard'
import { Button } from '../ui/Button'

export type OmikujiFortune = OmikujiFortuneResponse

export interface OmikujiModalProps {
  open: boolean
  onClose: () => void
  onDrawn?: (fortune: OmikujiFortuneResponse) => void
}

export function OmikujiModal({ open, onClose, onDrawn }: OmikujiModalProps) {
  const { selectedProvider, selectedModel } = useAIProvider()
  const [shaking, setShaking] = useState(false)
  const [drawnFortune, setDrawnFortune] = useState<OmikujiFortuneResponse | null>(null)

  if (!open) return null

  const handleDraw = async () => {
    setShaking(true)
    sound.playClick()

    setTimeout(() => sound.playClick(), 200)
    setTimeout(() => sound.playClick(), 400)

    let clanId = 'sakura'
    try {
      clanId = localStorage.getItem('jws.clan.selected') || 'sakura'
    } catch {}

    try {
      const fortune = await api.drawOmikuji({
        clan_id: clanId,
        provider: selectedProvider || undefined,
        model: selectedModel || undefined,
      })
      setDrawnFortune(fortune)
      setShaking(false)
      onDrawn?.(fortune)
      if (fortune.rank === '大吉') {
        sound.playLevelUp()
      } else {
        sound.playFurin()
      }
    } catch {
      // Safe fallback
      const fallback: OmikujiFortuneResponse = {
        rank: '大吉',
        rank_vi: 'Đại Cát · Rất May Mắn',
        buff: '+20% EXP luyện tập hôm nay 🌟',
        exp_buff_percent: 20,
        color: '#fbbf24',
        waka_jp: '雲晴れて 月の光の さやけきに 心の筆も 澄み渡りけり',
        waka_reading: 'くもはれて つきのひかりの さやけきに こころのふでも すみわたりけり',
        waka_vi: 'Mây tan trăng rọi sáng ngời,\nNgọn bút trong trẻo lòng người an yên.',
        writing_advice: 'Hôm nay tâm trí sáng tỏ, hãy thử sức viết những câu văn dài và giàu cảm xúc.',
        grammar_advice: 'Chú ý liên kết câu mượt mà (〜て、〜ながら).',
        vocab_advice: 'Lĩnh hội 3 từ vựng mới về trạng thái tâm hồn.',
        streak_advice: 'Giữ ngọn lửa kiên định mỗi ngày.',
        lucky_kanji: '光',
        lucky_kanji_reading: 'ひかり (Hikari)',
        lucky_kanji_meaning: 'Ánh sáng rạng ngời',
        lucky_grammar: '〜はずだ (Chắc chắn là)',
        lucky_color: 'Vàng Hoàng Kim (金箔)',
      }
      setDrawnFortune(fallback)
      setShaking(false)
      sound.playLevelUp()
    }
  }

  const handleCloseAndReset = () => {
    setDrawnFortune(null)
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
      aria-label="Bốc quẻ thần đạo may mắn Omikuji AI"
    >
      {drawnFortune && drawnFortune.rank === '大吉' && <ConfettiCannon />}

      <div
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '92vh',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
          padding: 'var(--space-lg) var(--space-xl)',
          position: 'relative',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <button
          type="button"
          onClick={handleCloseAndReset}
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

        {!drawnFortune ? (
          /* Shrine Drawer View */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-xs) 0' }}>
            <span
              className="jw-badge"
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.04em',
                background: 'rgba(225, 77, 63, 0.15)',
                border: '1px solid rgba(225, 77, 63, 0.35)',
                color: 'var(--nihon-shu)',
                padding: '4px 12px',
              }}
            >
              ⛩️ 神社 · ĐỀN BÚT ĐẠO CẦU MAY AI
            </span>

            <h2 style={{ fontSize: 'var(--text-title-lg)', fontWeight: 800, margin: 0 }}>
              Bốc Quẻ Omikuji Thần Đạo
            </h2>

            <p style={{ color: 'var(--color-foreground-secondary)', margin: 0, fontSize: 'var(--text-body-sm)', maxWidth: 400, lineHeight: 1.5 }}>
              Lắc ống xăm đền thần đạo AI để đón nhận thơ Waka sấm truyền, lời khuyên bút đạo và chữ Hán may mắn hôm nay!
            </p>

            {/* Hexagonal Bamboo Omikuji Box */}
            <div
              onClick={!shaking ? handleDraw : undefined}
              style={{
                width: 105,
                height: 160,
                borderRadius: '12px 12px 18px 18px',
                background: 'linear-gradient(135deg, #d97706 0%, #b45309 50%, #78350f 100%)',
                boxShadow: '0 12px 32px rgba(180, 83, 9, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
                border: '3px solid rgba(251, 191, 36, 0.6)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                margin: 'var(--space-sm) 0',
                position: 'relative',
                animation: shaking ? 'flamePulse 0.15s infinite' : 'none',
                transform: shaking ? 'rotate(12deg)' : 'none',
                transition: 'transform 0.1s ease',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 6,
                  borderRadius: 3,
                  background: '#1c1917',
                  position: 'absolute',
                  top: 10,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-japanese)',
                  fontWeight: 900,
                  fontSize: 24,
                  color: '#fef3c7',
                  letterSpacing: '0.1em',
                  writingMode: 'vertical-rl',
                }}
              >
                おみくじ
              </span>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleDraw}
              disabled={shaking}
              style={{
                background: 'linear-gradient(135deg, #e14d3f 0%, #b91c1c 100%)',
                boxShadow: '0 4px 18px rgba(225, 77, 63, 0.45)',
                border: 'none',
                marginTop: 'var(--space-xs)',
              }}
            >
              {shaking ? 'Đang Lắc Ống Xăm... 🎋' : 'Lắc Ống Rút Quẻ ⛩️'}
            </Button>
          </div>
        ) : (
          /* Revealed Fortune Scroll */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-xs) 0' }}>
            <span
              className="jw-badge"
              style={{
                fontFamily: 'var(--font-japanese)',
                fontSize: 12,
                letterSpacing: '0.08em',
                background: `${drawnFortune.color}22`,
                border: `1px solid ${drawnFortune.color}66`,
                color: drawnFortune.color,
                fontWeight: 700,
                padding: '4px 12px',
              }}
            >
              ✨ QUẺ XĂM THẦN ĐẠO CỦA BẠN
            </span>

            <TiltCard maxRotation={6} scale={1.02}>
              <div
                style={{
                  width: '100%',
                  maxWidth: 400,
                  margin: '0 auto',
                  background: 'linear-gradient(180deg, rgba(254, 243, 199, 0.08) 0%, rgba(254, 243, 199, 0.02) 100%)',
                  border: `2px solid ${drawnFortune.color}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-md) var(--space-lg)',
                  boxShadow: `0 12px 36px ${drawnFortune.color}33`,
                  textAlign: 'center',
                }}
              >
                <h3
                  style={{
                    fontFamily: 'var(--font-japanese)',
                    fontSize: 38,
                    fontWeight: 900,
                    margin: 0,
                    color: drawnFortune.color,
                    letterSpacing: '0.1em',
                  }}
                >
                  {drawnFortune.rank}
                </h3>
                <p style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--color-foreground)', marginTop: 2, marginBottom: 8 }}>
                  {drawnFortune.rank_vi}
                </p>

                {/* EXP Buff */}
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: drawnFortune.color }}>
                    {drawnFortune.buff || `+${drawnFortune.exp_buff_percent}% EXP luyện tập hôm nay 🌟`}
                  </span>
                </div>

                {/* Sacred Waka Poem */}
                {drawnFortune.waka_jp && (
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-japanese)', color: '#ffffff', letterSpacing: '0.04em' }}>
                      {drawnFortune.waka_jp}
                    </div>
                    {drawnFortune.waka_reading && (
                      <div style={{ fontSize: 11, color: 'var(--nihon-kikyo)', marginTop: 2 }}>
                        {drawnFortune.waka_reading}
                      </div>
                    )}
                    <p style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--color-foreground-secondary)', margin: '6px 0 0', lineHeight: 1.4 }}>
                      "{drawnFortune.waka_vi}"
                    </p>
                  </div>
                )}

                {/* 4 Pillars of Writing Advice */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left', marginBottom: 12 }}>
                  <div style={{ fontSize: 11.5, color: 'var(--color-foreground)', lineHeight: 1.35 }}>
                    <strong style={{ color: 'var(--nihon-yamabuki)' }}>✍️ Bút Đạo:</strong> {drawnFortune.writing_advice}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-foreground)', lineHeight: 1.35 }}>
                    <strong style={{ color: 'var(--nihon-kikyo)' }}>📖 Ngữ Pháp:</strong> {drawnFortune.grammar_advice}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-foreground)', lineHeight: 1.35 }}>
                    <strong style={{ color: 'var(--nihon-moegi)' }}>🔤 Từ Vựng:</strong> {drawnFortune.vocab_advice}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-foreground)', lineHeight: 1.35 }}>
                    <strong style={{ color: '#38bdf8' }}>🏔️ Tâm Thế:</strong> {drawnFortune.streak_advice}
                  </div>
                </div>

                {/* Lucky Details */}
                <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.15)', paddingTop: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 10, color: 'var(--color-foreground-muted)', display: 'block' }}>
                        CHỮ HÁN MAY MẮN
                      </span>
                      <div style={{ fontSize: 36, fontFamily: 'var(--font-japanese)', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
                        {drawnFortune.lucky_kanji}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--nihon-kikyo)' }}>
                        {drawnFortune.lucky_kanji_reading}
                      </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 11, color: 'var(--color-foreground-secondary)' }}>
                        <strong>Ý nghĩa:</strong> {drawnFortune.lucky_kanji_meaning}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--nihon-yamabuki)', marginTop: 2 }}>
                        <strong>Ngữ pháp:</strong> {drawnFortune.lucky_grammar}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-foreground-muted)', marginTop: 2 }}>
                        <strong>Sắc màu:</strong> {drawnFortune.lucky_color}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TiltCard>

            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <Button variant="secondary" size="md" onClick={() => setDrawnFortune(null)}>
                Rút Quẻ Khác 🎋
              </Button>
              <Button variant="primary" size="md" onClick={handleCloseAndReset}>
                Đón Nhận Phước Lành 🙏
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
