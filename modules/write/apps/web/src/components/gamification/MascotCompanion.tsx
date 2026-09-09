import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { sound } from '../../services/sound'
import { api } from '../../services/api'
import { useAIProvider } from '../../context/AIProviderContext'
import { CLANS, CLAN_STORAGE_KEY, type ClanId } from './clanData'
import type { KitsuneChatMessage } from '../../types/api'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { FuriganaText } from '../ui/FuriganaText'

const CHAT_STORAGE_KEY = 'jws.kitsune.chat'

const QUICK_STARTER_CHIPS = [
  '🦊 Đố vui chữ Hán',
  '✍️ Gợi ý mở bài văn',
  '📖 Phân biệt ngữ pháp khó',
  '⛩️ Bói quẻ may mắn',
  '🍵 Tâm sự Bút Đạo',
]

const KITSUNE_MOOD_EMOJIS: Record<string, string> = {
  happy: '🦊✨',
  curious: '🦊🔍',
  thoughtful: '🦊💭',
  encouraging: '🦊🔥',
  proud: '🦊👑',
  meditative: '🦊🍵',
  mystical: '🦊⛩️',
}

export function MascotCompanion() {
  const location = useLocation()
  const { selectedProvider, selectedModel } = useAIProvider()
  const [minimized, setMinimized] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [speech, setSpeech] = useState<string | null>(null)
  const [speechMood, setSpeechMood] = useState<string>('happy')
  const [loadingSpeech, setLoadingSpeech] = useState(false)

  // Chat State
  const [messages, setMessages] = useState<KitsuneChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(CHAT_STORAGE_KEY)
      return saved
        ? JSON.parse(saved)
        : [
            {
              role: 'assistant',
              content:
                'Kon kon! Ta là Inari Kitsune - Hồ ly Bút Đạo đồng hành cùng bạn! 🦊✨\nHôm nay bạn muốn đố vui Kanji, tìm cảm hứng viết câu hay giải đáp ngữ pháp?',
            },
          ]
    } catch {
      return [
        {
          role: 'assistant',
          content:
            'Kon kon! Ta là Inari Kitsune - Hồ ly Bút Đạo đồng hành cùng bạn! 🦊✨\nHôm nay bạn muốn đố vui Kanji, tìm cảm hứng viết câu hay giải đáp ngữ pháp?',
        },
      ]
    }
  })

  const [inputVal, setInputVal] = useState('')
  const [isAiTyping, setIsAiTyping] = useState(false)
  const [activeChips, setActiveChips] = useState<string[]>(QUICK_STARTER_CHIPS)
  const [latestJapanesePhrase, setLatestJapanesePhrase] = useState<string | null>(null)

  const [clanId, setClanId] = useState<ClanId>(() => {
    try {
      const saved = localStorage.getItem(CLAN_STORAGE_KEY)
      return (saved as ClanId) || 'sakura'
    } catch {
      return 'sakura'
    }
  })

  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const handleSendMessageRef = useRef<(textToSend?: string) => Promise<void>>(() => Promise.resolve())

  const currentClan = CLANS[clanId] || CLANS.sakura

  // Sync clan change
  useEffect(() => {
    const handleClanChange = (e: CustomEvent<ClanId>) => {
      if (e.detail && CLANS[e.detail]) {
        setClanId(e.detail)
        sound.playLevelUp()
        setSpeech(`✨ Cáo Kitsune đã khoác áo ${CLANS[e.detail].name}! Cùng mài mực rèn luyện nào!`)
        setTimeout(() => setSpeech(null), 5000)
      }
    }

    const handleOpenChat = (e: CustomEvent<{ initialPrompt?: string }>) => {
      setIsChatOpen(true)
      setMinimized(false)
      sound.playFurin()
      if (e.detail?.initialPrompt) {
        void handleSendMessageRef.current(e.detail.initialPrompt)
      }
    }

    window.addEventListener('jws:clan-changed', handleClanChange as EventListener)
    window.addEventListener('jws:open-kitsune-chat', handleOpenChat as EventListener)
    return () => {
      window.removeEventListener('jws:clan-changed', handleClanChange as EventListener)
      window.removeEventListener('jws:open-kitsune-chat', handleOpenChat as EventListener)
    }
  }, [])

  // Save chat to session storage
  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
    } catch {}
  }, [messages])

  // Auto scroll chat strictly inside the messages container
  useEffect(() => {
    if (isChatOpen && messagesContainerRef.current) {
      const container = messagesContainerRef.current
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        })
      } else {
        container.scrollTop = container.scrollHeight
      }
    }
  }, [messages, isAiTyping, isChatOpen])

  // Fetch spontaneous dynamic speech on page change or periodic
  const fetchRandomDialogue = async () => {
    if (loadingSpeech) return
    setLoadingSpeech(true)
    try {
      const res = await api.getKitsuneDialogue({
        current_clan: clanId,
        page_context: location.pathname,
        streak: 5,
        provider: selectedProvider || undefined,
        model: selectedModel || undefined,
      })
      setSpeech(res.message_vi)
      setSpeechMood(res.mood || 'happy')
      setTimeout(() => setSpeech(null), 6000)
    } catch {
      setSpeech('Hôm nay cùng mài mực và viết nên những câu văn thật đẹp nhé! 🦊')
      setTimeout(() => setSpeech(null), 4000)
    } finally {
      setLoadingSpeech(false)
    }
  }

  const handleMascotClick = () => {
    sound.playClick()
    if (!isChatOpen) {
      setIsChatOpen(true)
      setMinimized(false)
      sound.playFurin()
    } else {
      fetchRandomDialogue()
    }
  }

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputVal).trim()
    if (!content || isAiTyping) return

    sound.playClick()
    setInputVal('')

    const newMessages: KitsuneChatMessage[] = [...messagesRef.current, { role: 'user', content }]
    setMessages(newMessages)
    setIsAiTyping(true)

    try {
      const res = await api.chatWithKitsune({
        messages: newMessages,
        clan_id: clanId,
        page_context: location.pathname,
        provider: selectedProvider || undefined,
        model: selectedModel || undefined,
      })

      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }])
      setSpeechMood(res.mood || 'happy')
      if (res.japanese_phrase) {
        setLatestJapanesePhrase(res.japanese_phrase)
      }
      if (res.suggested_chips && res.suggested_chips.length > 0) {
        setActiveChips(res.suggested_chips)
      } else {
        setActiveChips(QUICK_STARTER_CHIPS)
      }
      sound.playFurin()
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Kon kon! Linh lực của ta đang hơi dao động một chút. Bạn hãy thử hỏi lại hoặc bấm vào các gợi ý bên dưới nhé! 🦊🍵',
        },
      ])
    } finally {
      setIsAiTyping(false)
    }
  }

  const handleClearChat = () => {
    sound.playClick()
    const initial: KitsuneChatMessage[] = [
      {
        role: 'assistant',
        content: `Khởi đầu cuộc trò chuyện mới cùng Cáo ${currentClan.name}! Hãy hỏi ta bất cứ điều gì về Bút Đạo nhé! 🦊✨`,
      },
    ]
    setMessages(initial)
    setActiveChips(QUICK_STARTER_CHIPS)
    setLatestJapanesePhrase(null)
    try {
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(initial))
    } catch {}
  }
  handleSendMessageRef.current = handleSendMessage

  const moodEmoji = KITSUNE_MOOD_EMOJIS[speechMood] || '🦊'

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => {
          setMinimized(false)
          sound.playClick()
        }}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1500,
          width: 50,
          height: 50,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${currentClan.color} 0%, #1e1b4b 100%)`,
          border: `2px solid ${currentClan.color}`,
          boxShadow: `0 4px 20px ${currentClan.color}88`,
          color: '#fff',
          fontSize: 22,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        title={`Mở linh thú Kitsune Chatbox (${currentClan.name})`}
        aria-label="Linh thú Kitsune"
      >
        <span>{moodEmoji}</span>
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1500,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'auto',
      }}
    >
      {/* Expanded Floating AI Chatbox Drawer */}
      {isChatOpen ? (
        <div
          className="jw-glass jw-shimmer-border"
          style={{
            width: 360,
            maxWidth: 'calc(100vw - 32px)',
            height: 500,
            maxHeight: 'calc(100vh - 100px)',
            borderRadius: 'var(--radius-xl)',
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: `1.5px solid ${currentClan.color}66`,
            boxShadow: `0 16px 48px rgba(0, 0, 0, 0.65), 0 0 24px ${currentClan.color}33`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            marginBottom: 12,
            animation: 'jw-pop-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
          role="dialog"
          aria-label="Hồ Ly Đồng Hành AI Chatbox"
          onScroll={(e) => {
            e.currentTarget.scrollTop = 0
          }}
        >
          {/* Chat Header */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: `linear-gradient(90deg, ${currentClan.color}22 0%, rgba(0,0,0,0.2) 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${currentClan.color} 0%, #111827 100%)`,
                  border: `1.5px solid ${currentClan.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  boxShadow: `0 0 10px ${currentClan.color}66`,
                }}
              >
                <span>{moodEmoji}</span>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-japanese)',
                      fontWeight: 800,
                      fontSize: 12,
                      color: currentClan.color,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {currentClan.kanji} · KITSUNE AI
                  </span>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#10b981',
                      boxShadow: '0 0 6px #10b981',
                    }}
                  />
                </div>
                <div style={{ fontSize: 9.5, color: 'var(--color-foreground-muted)' }}>
                  {currentClan.name} · Gia sư Bút Đạo
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                onClick={handleClearChat}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-foreground-muted)',
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: '4px',
                  borderRadius: 'var(--radius-sm)',
                }}
                title="Xóa đoạn chat"
                aria-label="Xóa đoạn chat"
              >
                🗑️
              </button>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-foreground-muted)',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: '4px 6px',
                  borderRadius: 'var(--radius-sm)',
                }}
                title="Đóng chatbox"
                aria-label="Đóng chatbox"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Key Japanese Phrase Banner if available */}
          {latestJapanesePhrase && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
                padding: '5px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: 'var(--nihon-yamabuki)',
                flexShrink: 0,
              }}
            >
              <span>🏮</span>
              <FuriganaText text={latestJapanesePhrase} style={{ fontFamily: 'var(--font-japanese)', fontWeight: 600 }} />
            </div>
          )}

          {/* Chat Messages List */}
          <div
            ref={messagesContainerRef}
            style={{
              flex: '1 1 0%',
              minHeight: 0,
              overflowY: 'auto',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              scrollbarWidth: 'thin',
            }}
          >
            {messages.map((m, idx) => {
              const isUser = m.role === 'user'
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '8px 12px',
                      borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      background: isUser
                        ? `linear-gradient(135deg, ${currentClan.color}cc 0%, #4338ca 100%)`
                        : 'rgba(255, 255, 255, 0.06)',
                      border: `1px solid ${isUser ? currentClan.color : 'rgba(255, 255, 255, 0.1)'}`,
                      color: '#ffffff',
                      fontSize: 12.5,
                      lineHeight: 1.45,
                      whiteSpace: 'pre-line',
                      boxShadow: isUser
                        ? `0 2px 10px ${currentClan.color}33`
                        : '0 2px 8px rgba(0,0,0,0.2)',
                    }}
                  >
                    <FuriganaText text={m.content} />
                  </div>
                </div>
              )
            })}

            {isAiTyping && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${currentClan.color}44 0%, #111827 100%)`,
                    border: `1px solid ${currentClan.color}88`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  <span>{moodEmoji}</span>
                </div>
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '14px 14px 14px 2px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Spinner size={13} />
                  <span style={{ fontSize: 11.5, color: 'var(--color-foreground-secondary)' }}>
                    Kitsune đang mài mực và suy nghĩ... 🦊✨
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Action Chips */}
          <div
            style={{
              padding: '6px 12px',
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              scrollbarWidth: 'none',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              background: 'rgba(0, 0, 0, 0.15)',
              flexShrink: 0,
            }}
          >
            {activeChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip)}
                disabled={isAiTyping}
                style={{
                  flexShrink: 0,
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'var(--color-foreground-secondary)',
                  cursor: isAiTyping ? 'not-allowed' : 'pointer',
                  opacity: isAiTyping ? 0.6 : 1,
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!isAiTyping) {
                    e.currentTarget.style.borderColor = currentClan.color
                    e.currentTarget.style.color = '#ffffff'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
                  e.currentTarget.style.color = 'var(--color-foreground-secondary)'
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div
            style={{
              padding: '8px 12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(0, 0, 0, 0.25)',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isAiTyping) handleSendMessage()
              }}
              placeholder={isAiTyping ? 'Kitsune đang trả lời...' : 'Hỏi Cáo ngữ pháp, Kanji, ý tưởng...'}
              disabled={isAiTyping}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 10px',
                fontSize: 12,
                color: '#ffffff',
                outline: 'none',
                opacity: isAiTyping ? 0.7 : 1,
              }}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSendMessage()}
              disabled={isAiTyping || !inputVal.trim()}
              style={{
                background: `linear-gradient(135deg, ${currentClan.color} 0%, #4338ca 100%)`,
                border: 'none',
                padding: '6px 12px',
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              {isAiTyping ? '...' : 'Gửi'}
            </Button>
          </div>
        </div>
      ) : (
        /* Speech Bubble when chat is closed */
        speech && (
          <div
            onClick={() => {
              setIsChatOpen(true)
              sound.playFurin()
            }}
            style={{
              maxWidth: 280,
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              WebkitBackdropFilter: 'var(--glass-blur)',
              border: `1.5px solid ${currentClan.color}66`,
              borderRadius: '14px 14px 2px 14px',
              padding: '10px 14px',
              boxShadow: `0 8px 24px rgba(0, 0, 0, 0.45), 0 0 16px ${currentClan.color}33`,
              marginBottom: 8,
              fontSize: 12,
              lineHeight: 1.45,
              color: 'var(--color-foreground)',
              animation: 'jw-pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              cursor: 'pointer',
              position: 'relative',
            }}
            title="Bấm để mở khung trò chuyện với Cáo AI"
          >
            <FuriganaText text={speech} />
          </div>
        )
      )}

      {/* Mascot Avatar Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          border: `1.5px solid ${currentClan.color}55`,
          borderRadius: 24,
          padding: '4px 12px 4px 6px',
          boxShadow: `0 6px 20px rgba(0, 0, 0, 0.35), 0 0 12px ${currentClan.color}22`,
        }}
      >
        <div
          onClick={handleMascotClick}
          className="jw-float"
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${currentClan.color} 0%, #090d16 120%)`,
            border: `2px solid ${currentClan.color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            cursor: 'pointer',
            boxShadow: `0 0 14px ${currentClan.color}77`,
            userSelect: 'none',
            position: 'relative',
          }}
          title={`Chạm vào chú Hồ Ly Kitsune (${currentClan.name}) để trò chuyện AI!`}
          role="button"
          tabIndex={0}
          aria-label="Linh thú Kitsune"
        >
          <span>{moodEmoji}</span>
          <span
            style={{
              position: 'absolute',
              bottom: -2,
              right: -4,
              fontSize: 11,
              background: '#090d16',
              borderRadius: '50%',
              width: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${currentClan.color}`,
            }}
          >
            {currentClan.icon}
          </span>
        </div>

        <div
          onClick={handleMascotClick}
          style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', userSelect: 'none' }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              fontFamily: 'var(--font-japanese)',
              color: currentClan.color,
              lineHeight: 1.1,
            }}
          >
            {currentClan.kanji} · KITSUNE AI
          </span>
          <span style={{ fontSize: 9.5, color: 'var(--color-foreground-muted)' }}>
            {isChatOpen ? 'Đang mở Chatbox' : 'Bấm để trò chuyện'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMinimized(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-foreground-muted)',
            cursor: 'pointer',
            fontSize: 12,
            padding: '2px 4px',
            marginLeft: 2,
          }}
          title="Thu nhỏ linh thú"
          aria-label="Thu nhỏ linh thú"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

