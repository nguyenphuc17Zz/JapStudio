import { useState, useEffect, useCallback } from 'react'
import { sound } from '../../services/sound'
import { api } from '../../services/api'
import { useAIProvider } from '../../context/AIProviderContext'
import type { KitsuneDialogueResponse } from '../../types/api'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { KotowazaModal } from './KotowazaModal'
import { OmikujiModal } from './OmikujiModal'
import { DailyHaikuModal } from './DailyHaikuModal'

export interface KitsuneCompanionProps {
  streak: number
  completedToday?: number
  clanId?: string
  onOpenKotowaza?: () => void
  onOpenOmikuji?: () => void
  onOpenHaiku?: () => void
}

const KITSUNE_MOOD_EMOJIS: Record<string, string> = {
  happy: '🦊✨',
  curious: '🦊🔍',
  thoughtful: '🦊💭',
  encouraging: '🦊🔥',
  proud: '🦊👑',
  meditative: '🦊🍵',
}

export function KitsuneCompanion({
  streak,
  completedToday = 0,
  clanId = 'sakura',
  onOpenKotowaza,
  onOpenOmikuji,
  onOpenHaiku,
}: KitsuneCompanionProps) {
  const { selectedProvider, selectedModel } = useAIProvider()
  const [dialogue, setDialogue] = useState<KitsuneDialogueResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const [localKotowazaOpen, setLocalKotowazaOpen] = useState(false)
  const [localOmikujiOpen, setLocalOmikujiOpen] = useState(false)
  const [localHaikuOpen, setLocalHaikuOpen] = useState(false)

  const fetchDialogue = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getKitsuneDialogue({
        streak,
        today_completed_count: completedToday,
        current_clan: clanId,
        provider: selectedProvider || undefined,
        model: selectedModel || undefined,
      })
      setDialogue(res)
    } catch {
      setDialogue({
        mood: 'happy',
        message_vi: 'Chào bạn hiền! Cùng ta mài mực và viết nên những câu văn thật đẹp hôm nay nhé! 🦊',
        message_jp: '今日も一緒に楽しく書こうコン！',
        action_tip: 'Thử thách dịch 1 câu đơn giản trước để khởi động nhé!',
      })
    } finally {
      setLoading(false)
    }
  }, [streak, completedToday, clanId, selectedProvider, selectedModel])

  useEffect(() => {
    void fetchDialogue()
  }, [fetchDialogue])

  const handleClickFox = () => {
    sound.playFurin()
    fetchDialogue()
  }

  const handleOpenKotowaza = () => {
    if (onOpenKotowaza) onOpenKotowaza()
    else setLocalKotowazaOpen(true)
  }

  const handleOpenOmikuji = () => {
    if (onOpenOmikuji) onOpenOmikuji()
    else setLocalOmikujiOpen(true)
  }

  const handleOpenHaiku = () => {
    if (onOpenHaiku) onOpenHaiku()
    else setLocalHaikuOpen(true)
  }

  const moodEmoji = dialogue ? KITSUNE_MOOD_EMOJIS[dialogue.mood] || '🦊' : '🦊'

  return (
    <div
      className="jw-glass jw-shimmer-border"
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-md) var(--space-lg)',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(139, 92, 246, 0.03) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.2)',
        boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-md)',
        position: 'relative',
        marginBottom: 'var(--space-lg)',
      }}
    >
      {/* Animated Fox Avatar */}
      <div
        onClick={handleClickFox}
        title="Bấm để trò chuyện với Linh thú Kitsune"
        style={{
          width: 50,
          height: 50,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f59e0b22 0%, #b45309 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
          border: '1.5px solid rgba(245, 158, 11, 0.4)',
          cursor: 'pointer',
          flexShrink: 0,
          userSelect: 'none',
          transition: 'transform 0.2s ease',
        }}
      >
        <span style={{ transform: loading ? 'scale(1.2) rotate(15deg)' : 'scale(1)', transition: 'transform 0.2s ease' }}>
          {moodEmoji}
        </span>
      </div>

      {/* Speech Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              className="jw-badge"
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.04em',
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: 'var(--nihon-yamabuki)',
                padding: '2px 8px',
              }}
            >
              🦊 稲荷狐 · HỒ LY ĐỒNG HÀNH AI
            </span>
            {dialogue?.message_jp && (
              <span style={{ fontSize: 11, color: 'var(--color-foreground-muted)', fontFamily: 'var(--font-japanese)', fontStyle: 'italic' }}>
                「{dialogue.message_jp}」
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-foreground-muted)',
              fontSize: 12,
              cursor: 'pointer',
              padding: '2px 6px',
            }}
          >
            {expanded ? '▲ Thu gọn' : '▼ Mở rộng'}
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <Spinner size={16} />
            <span style={{ fontSize: 12, color: 'var(--color-foreground-muted)' }}>
              Kitsune đang suy nghĩ...
            </span>
          </div>
        ) : dialogue ? (
          <div>
            <p style={{ fontSize: 13, color: 'var(--color-foreground)', margin: 0, lineHeight: 1.45, fontWeight: 500 }}>
              {dialogue.message_vi}
            </p>

            {expanded && dialogue.action_tip && (
              <div
                style={{
                  marginTop: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11.5,
                  color: 'var(--nihon-yamabuki)',
                }}
              >
                <span>💡 Gợi ý của Cáo:</span>
                <span style={{ color: 'var(--color-foreground-secondary)' }}>{dialogue.action_tip}</span>
              </div>
            )}
          </div>
        ) : null}

        {/* Quick Companion Actions */}
        {expanded && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 10,
              flexWrap: 'wrap',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              paddingTop: 8,
            }}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('jws:open-kitsune-chat', {
                    detail: { initialPrompt: 'Kon kon! Cáo ơi hôm nay có lời khuyên gì cho ta không?' },
                  })
                )
              }}
              style={{
                fontSize: 11,
                padding: '4px 10px',
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                color: 'var(--nihon-yamabuki)',
                fontWeight: 700,
              }}
            >
              💬 Trò Chuyện Cùng Cáo AI
            </Button>
            <Button variant="ghost" size="sm" onClick={handleOpenKotowaza} style={{ fontSize: 11, padding: '4px 8px' }}>
              📖 Ca dao Tục ngữ
            </Button>
            <Button variant="ghost" size="sm" onClick={handleOpenOmikuji} style={{ fontSize: 11, padding: '4px 8px' }}>
              ⛩️ Bốc Quẻ Omikuji
            </Button>
            <Button variant="ghost" size="sm" onClick={handleOpenHaiku} style={{ fontSize: 11, padding: '4px 8px' }}>
              📜 Thơ Haiku
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClickFox}
              disabled={loading}
              style={{ fontSize: 11, padding: '4px 8px', color: 'var(--nihon-yamabuki)' }}
            >
              🎲 Đổi câu chào
            </Button>
          </div>
        )}
      </div>

      <KotowazaModal open={localKotowazaOpen} onClose={() => setLocalKotowazaOpen(false)} />
      <OmikujiModal open={localOmikujiOpen} onClose={() => setLocalOmikujiOpen(false)} />
      <DailyHaikuModal open={localHaikuOpen} onClose={() => setLocalHaikuOpen(false)} />
    </div>
  )
}
