import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'
import { Alert } from '../ui/Alert'
import { sound } from '../../services/sound'
import { api } from '../../services/api'
import { useAIProvider } from '../../context/AIProviderContext'
import type { GoldenPhraseItem, IdeaAngleItem, WritingScaffoldResponse } from '../../types/api'

export type IdeaAngle = IdeaAngleItem
export type GoldenPhrase = GoldenPhraseItem

export interface AIWritingAssistantDrawerProps {
  title?: string
  prompt_vi?: string
  context_vi?: string | null
  jlpt_level?: string | null
  register?: string | null
  genre?: string | null
  keywords?: string[]
  outlineSteps?: string[]
  ideaAngles?: IdeaAngle[]
  goldenPhrases?: GoldenPhrase[]
  onInsertPhrase?: (text: string) => void
}

const DEFAULT_OUTLINE = [
  '1. Mở bài: Nêu bối cảnh hoặc cảm xúc khởi đầu.',
  '2. Thân bài: Trình bày chi tiết nguyên nhân, sự việc hoặc trải nghiệm.',
  '3. Kết bài: Đưa ra nhận xét, bài học hoặc kế hoạch tương lai.',
]

const DEFAULT_ANGLES: IdeaAngle[] = [
  {
    title: 'Góc nhìn Trải nghiệm',
    description: 'Chia sẻ cảm nhận và câu chuyện thực tế của bản thân.',
    starter: '私の経験から言うと、',
  },
  {
    title: 'Góc nhìn Khách quan',
    description: 'Phân tích từ góc độ logic, ưu và nhược điểm.',
    starter: '客観的に見れば、',
  },
  {
    title: 'Góc nhìn Tương lai',
    description: 'Hướng tới mục tiêu, kế hoạch hoặc mong muốn phát triển.',
    starter: '将来的には、',
  },
]

const DEFAULT_PHRASES: GoldenPhrase[] = [
  { japanese: 'その結果、', meaning: 'Kết quả là...', type: 'connector' },
  { japanese: '〜だけでなく、', meaning: 'Không chỉ... mà còn', type: 'connector' },
  { japanese: '〜と考えております', meaning: 'Tôi nghĩ/cho rằng (Lịch sự)', type: 'expression' },
  { japanese: '具体的には、', meaning: 'Cụ thể là...', type: 'starter' },
  { japanese: '〜のおかげで、', meaning: 'Nhờ vào...', type: 'expression' },
]

export function AIWritingAssistantDrawer({
  title = 'Trợ lực AI (AI Writing Assistant)',
  prompt_vi,
  context_vi,
  jlpt_level,
  register,
  genre,
  keywords,
  outlineSteps,
  ideaAngles,
  goldenPhrases,
  onInsertPhrase,
}: AIWritingAssistantDrawerProps) {
  const { selectedProvider, selectedModel } = useAIProvider()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'angles' | 'phrases' | 'outline'>('angles')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dynamicData, setDynamicData] = useState<WritingScaffoldResponse | null>(null)

  // In-memory cache for prompt scaffolds
  const cacheRef = useRef<Record<string, WritingScaffoldResponse>>({})
  const dynamicDataRef = useRef<WritingScaffoldResponse | null>(null)
  dynamicDataRef.current = dynamicData

  const effectiveOutline = dynamicData?.outline_steps || outlineSteps || DEFAULT_OUTLINE
  const effectiveAngles = dynamicData?.idea_angles || ideaAngles || DEFAULT_ANGLES
  const effectivePhrases = dynamicData?.golden_phrases || goldenPhrases || DEFAULT_PHRASES

  const fetchDynamicScaffold = useCallback(
    async (force = false) => {
      if (!prompt_vi || (!force && dynamicDataRef.current)) return

      const cacheKey = `${prompt_vi}::${jlpt_level || ''}::${register || ''}::${genre || ''}`
      if (!force && cacheRef.current[cacheKey]) {
        setDynamicData(cacheRef.current[cacheKey])
        return
      }

      setLoading(true)
      setError(null)
      try {
        const response = await api.getWritingScaffold({
          prompt_vi,
          context_vi: context_vi || null,
          jlpt_level: jlpt_level || null,
          register: register || null,
          genre: genre || null,
          keywords: keywords || [],
          ...(selectedProvider ? { provider: selectedProvider } : {}),
          ...(selectedModel ? { model: selectedModel } : {}),
        })
        cacheRef.current[cacheKey] = response
        setDynamicData(response)
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Không thể tạo gợi ý từ AI. Đang sử dụng mẫu dự phòng.'
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    [prompt_vi, jlpt_level, register, genre, context_vi, keywords, selectedProvider, selectedModel],
  )

  const handleToggle = () => {
    setIsOpen((prev) => !prev)
  }

  const prevPromptRef = useRef(prompt_vi)
  useEffect(() => {
    if (!isOpen || !prompt_vi) return

    if (prevPromptRef.current !== prompt_vi) {
      prevPromptRef.current = prompt_vi
      setDynamicData(null)
      void fetchDynamicScaffold(false)
    } else if (!dynamicDataRef.current) {
      void fetchDynamicScaffold(false)
    }
  }, [isOpen, prompt_vi, fetchDynamicScaffold])

  const handleInsert = (text: string) => {
    sound.playWashiStroke()
    onInsertPhrase?.(text)
  }

  return (
    <div
      className="jw-ai-drawer"
      style={{
        borderRadius: 'var(--radius-md)',
        background: 'rgba(99, 102, 241, 0.04)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        padding: '10px 14px',
        marginBottom: 'var(--space-md)',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>💡</span>
          <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-primary)' }}>
            {title}
          </span>
          <Badge tone="accent">{dynamicData ? 'AI Động' : '1-Chạm Gợi ý'}</Badge>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isOpen && prompt_vi && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchDynamicScaffold(true)}
              disabled={loading}
              title="Yêu cầu AI phân tích lại đề bài và tạo góc nhìn mới"
              style={{ fontSize: '11px', height: '26px', padding: '0 8px' }}
            >
              🔄 Gợi ý khác
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            aria-expanded={isOpen}
            style={{ fontSize: '12px', height: '26px', padding: '0 8px' }}
          >
            {isOpen ? 'Thu gọn ▲' : 'Xem gợi ý hướng viết & từ vựng ▼'}
          </Button>
        </div>
      </div>

      {isOpen && (
        <div style={{ marginTop: '12px', borderTop: '1px solid rgba(99, 102, 241, 0.15)', paddingTop: '10px' }}>
          {loading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-md) 0',
                gap: '8px',
              }}
            >
              <Spinner size={16} />
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
                AI đang phân tích đề bài và tạo dàn ý, hướng tiếp cận & cụm từ vàng...
              </span>
            </div>
          ) : (
            <>
              {error && (
                <Alert tone="warning" title="Lưu ý AI" className="jw-mb-sm">
                  {error}
                </Alert>
              )}

              {/* Sub Tabs */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('angles')}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11px',
                    fontWeight: activeTab === 'angles' ? 700 : 500,
                    background: activeTab === 'angles' ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: activeTab === 'angles' ? 'var(--color-on-primary)' : 'var(--color-foreground-secondary)',
                    border: '1px solid var(--glass-border)',
                    cursor: 'pointer',
                  }}
                >
                  💡 Hướng tiếp cận ({effectiveAngles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('phrases')}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11px',
                    fontWeight: activeTab === 'phrases' ? 700 : 500,
                    background: activeTab === 'phrases' ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.05)',
                    color: activeTab === 'phrases' ? 'var(--color-on-accent)' : 'var(--color-foreground-secondary)',
                    border: '1px solid var(--glass-border)',
                    cursor: 'pointer',
                  }}
                >
                  📖 Mẫu câu & Từ nối ({effectivePhrases.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('outline')}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11px',
                    fontWeight: activeTab === 'outline' ? 700 : 500,
                    background: activeTab === 'outline' ? 'var(--color-ai)' : 'rgba(255, 255, 255, 0.05)',
                    color: activeTab === 'outline' ? '#fff' : 'var(--color-foreground-secondary)',
                    border: '1px solid var(--glass-border)',
                    cursor: 'pointer',
                  }}
                >
                  📋 Dàn ý gợi ý ({effectiveOutline.length})
                </button>
              </div>

              {/* Tab 1: Idea Angles */}
              {activeTab === 'angles' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {effectiveAngles.map((angle, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--glass-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)' }}>
                          {angle.title}
                        </span>
                        {onInsertPhrase && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleInsert(angle.starter)}
                            style={{ fontSize: '11px', height: '22px', padding: '0 6px' }}
                            title={`Chèn "${angle.starter}" vào bài viết`}
                          >
                            + Chèn câu mở
                          </Button>
                        )}
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--color-foreground-secondary)', margin: 0 }}>
                        {angle.description}
                      </p>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          fontFamily: 'var(--font-japanese)',
                          color: 'var(--color-foreground)',
                          background: 'rgba(99, 102, 241, 0.08)',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          marginTop: '2px',
                        }}
                      >
                        {angle.starter}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 2: Golden Phrases */}
              {activeTab === 'phrases' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {effectivePhrases.map((phrase, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <Badge tone={phrase.type === 'connector' ? 'accent' : phrase.type === 'starter' ? 'info' : 'success'}>
                          {phrase.type === 'connector' ? 'Từ nối' : phrase.type === 'starter' ? 'Mở câu' : 'Cụm từ'}
                        </Badge>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            fontFamily: 'var(--font-japanese)',
                            color: 'var(--color-foreground)',
                          }}
                        >
                          {phrase.japanese}
                        </span>
                        {phrase.reading && (
                          <span style={{ fontSize: '11px', color: 'var(--color-foreground-muted)' }}>
                            ({phrase.reading})
                          </span>
                        )}
                        <span style={{ fontSize: '11px', color: 'var(--color-foreground-secondary)' }}>
                          · {phrase.meaning}
                        </span>
                      </div>
                      {onInsertPhrase && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInsert(phrase.japanese)}
                          style={{ fontSize: '11px', height: '22px', padding: '0 6px' }}
                          title={`Chèn "${phrase.japanese}" vào ô viết`}
                        >
                          + Chèn
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3: Outline */}
              {activeTab === 'outline' && (
                <div
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--color-foreground-secondary)', lineHeight: 1.6 }}>
                    {effectiveOutline.map((step, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
