import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useVocabularyLookup } from '../../context/VocabularyLookupContext'
import { useAIProvider } from '../../context/AIProviderContext'

import { api } from '../../services/api'
import { sound } from '../../services/sound'
import type {
  VocabLookupResponse,
  VocabLookupBestMatch,
  VocabLookupAlternative,
} from '../../types/api'

import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Card, CardContent } from '../ui/Card'
import { FuriganaText } from '../ui/FuriganaText'

import { Spinner } from '../ui/Spinner'
import { Alert } from '../ui/Alert'
import { AIModelPicker } from '../ai/AIModelPicker'
import { KanjiStrokeModal } from '../gamification/KanjiStrokeModal'

export function AIVocabularyLookupBox() {
  const {
    isOpen,
    closeLookup,
    query,
    setQuery,
    contextText,
    setContextText,
    direction,
    setDirection,
    registerPreference,
    setRegisterPreference,
    autoSearchTrigger,
    insertText,
  } = useVocabularyLookup()

  const { selectedProvider, selectedModel } = useAIProvider()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<VocabLookupResponse | null>(null)
  const [selectedWord, setSelectedWord] = useState<VocabLookupBestMatch | VocabLookupAlternative | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [kanjiModalChar, setKanjiModalChar] = useState<string | null>(null)
  const [showContextInput, setShowContextInput] = useState(false)
  const [showFurigana, setShowFurigana] = useState(true)

  const inputRef = useRef<HTMLInputElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const handleSearch = useCallback(
    async (overrideQuery?: string, overrideContext?: string) => {
      const q = (overrideQuery !== undefined ? overrideQuery : query).trim()
      if (!q) return

      const ctx = (overrideContext !== undefined ? overrideContext : contextText).trim()

      setLoading(true)
      setError(null)
      setSaveSuccessMsg(null)
      setResult(null)
      setSelectedWord(null)
      sound.playWashiStroke()

      try {
        const res = await api.lookupVocabularyAI({
          query: q,
          context: ctx || undefined,
          direction,
          register_preference: registerPreference || undefined,
          provider: selectedProvider || undefined,
          model: selectedModel || undefined,
        })
        setResult(res)
        setSelectedWord(res.best_match)
        sound.playKatanaSlice()
        setTimeout(() => {
          if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = 0
          }
        }, 50)
      } catch (err) {

        setError(err instanceof Error ? err.message : 'Không thể tra cứu từ vựng lúc này.')
      } finally {
        setLoading(false)
      }
    },
    [query, contextText, direction, registerPreference, selectedProvider, selectedModel],
  )

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [isOpen])

  // Automatically trigger search whenever autoSearchTrigger fires or when opened with a query
  useEffect(() => {
    if (isOpen && query.trim()) {
      void handleSearch(query, contextText)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, autoSearchTrigger])

  if (!isOpen) return null


  const handleInsert = (expression: string) => {
    sound.playKatanaSlice()
    const inserted = insertText(expression)
    if (inserted) {
      setSaveSuccessMsg(`Đã chèn「${expression}」vào bài viết!`)
      setTimeout(() => {
        closeLookup()
      }, 700)
    } else {
      setCopied(true)
      setSaveSuccessMsg(`Đã sao chép「${expression}」vào clipboard!`)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSaveToBank = async (item: VocabLookupBestMatch | VocabLookupAlternative) => {
    setSaving(true)
    setSaveSuccessMsg(null)
    sound.playWashiStroke()

    try {
      const best = item as VocabLookupBestMatch
      const res = await api.saveLookupVocabulary({
        expression: item.expression,
        reading: item.reading || null,
        meaning_vi: item.meaning_vi,
        part_of_speech: best.part_of_speech || null,
        estimated_jlpt_level: item.estimated_jlpt_level || null,
        difficulty: best.difficulty || 5,
        register: item.register || null,
        nuance_explanation: best.nuance_explanation || (item as VocabLookupAlternative).difference_explanation || null,
        example_sentence: best.example_sentence || null,
      })
      setSaveSuccessMsg(res.message)
      sound.playKatanaSlice()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu từ vựng.')
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ja-JP'
      utterance.rate = 0.9
      window.speechSynthesis.speak(utterance)
    }
  }

  const bestMatch = result?.best_match
  const currentDisplayWord = selectedWord || bestMatch
  const isViewingBestMatch = !selectedWord || selectedWord.expression === bestMatch?.expression


  // Collect practical examples from best_match or fallback
  const realWorldExamples: Array<{ ja: string; vi: string; situation: string }> = []
  if (isViewingBestMatch && bestMatch) {
    if (bestMatch.examples && bestMatch.examples.length > 0) {
      for (const ex of bestMatch.examples) {
        if (ex && ex.ja && ex.ja.trim()) {
          realWorldExamples.push({
            ja: ex.ja,
            vi: ex.vi || '',
            situation: ex.situation || 'Tình huống thực tế',
          })
        }
      }
    }
    // If examples list is empty or had only 1, fallback or add example_sentence
    if (realWorldExamples.length === 0 && bestMatch.example_sentence) {
      realWorldExamples.push({
        ja: bestMatch.example_sentence,
        vi: bestMatch.example_sentence_vi || '',
        situation: 'Ví dụ ngữ cảnh chính',
      })
    }
  }

  return createPortal(
    <div
      className="jw-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
        overflow: 'hidden',
        animation: 'jw-fade-in 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeLookup()
      }}
    >
      <div
        className="jw-lookup-box"
        data-furigana={showFurigana ? 'on' : 'off'}
        style={{
          width: '100%',
          maxWidth: '760px',
          height: 'min(88vh, 800px)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '20px',
          background: 'linear-gradient(180deg, rgba(22, 22, 32, 0.98) 0%, rgba(14, 14, 22, 0.99) 100%)',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(139, 92, 246, 0.2)',
          overflow: 'hidden',
          animation: 'jw-scale-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(147, 51, 234, 0.18), rgba(59, 130, 246, 0.08))',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '18px',
                background: 'linear-gradient(135deg, #c084fc, #38bdf8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ✦
            </span>
            <strong style={{ fontSize: '15px', color: '#ffffff', letterSpacing: '0.01em', fontWeight: 600 }}>
              Tra Cứu Từ Vựng AI Theo Ngữ Cảnh
            </strong>
          </div>


          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AIModelPicker variant="compact" />

            <button
              type="button"
              onClick={() => {
                sound.playClick()
                setShowFurigana((v) => !v)
              }}
              aria-label={showFurigana ? 'Tắt Furigana' : 'Bật Furigana'}
              title={showFurigana ? 'Đang BẬT Furigana — Bấm để ẩn âm đọc' : 'Đang TẮT Furigana — Bấm để hiện âm đọc'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: showFurigana ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                border: showFurigana ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: showFurigana ? '#c084fc' : 'var(--color-foreground-muted, #9ca3af)',
                cursor: 'pointer',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: 'var(--radius-md, 8px)',
                fontFamily: 'var(--font-sans)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                boxShadow: showFurigana ? '0 0 12px rgba(168, 85, 247, 0.3)' : 'none',
              }}
            >
              <span style={{ fontSize: '13px' }}>🈳</span>
              <span>{showFurigana ? 'Furigana' : 'Furigana (Tắt)'}</span>
            </button>

            <button
              type="button"
              onClick={closeLookup}
              aria-label="Đóng tra cứu"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'var(--color-foreground-muted, #9ca3af)',
                cursor: 'pointer',
                padding: '4px 8px',
                fontSize: '14px',
                borderRadius: 'var(--radius-md, 8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search Inputs & Direction Bar */}
        <div
          style={{
            padding: '14px 20px 12px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            flexShrink: 0,
            background: 'rgba(255, 255, 255, 0.015)',
          }}
        >
          {/* Direction Switch & Register Preference */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div
              role="group"
              aria-label="Chọn chiều tra cứu"
              style={{
                display: 'inline-flex',
                padding: '3px',
                borderRadius: 'var(--radius-md, 8px)',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                gap: '3px',
              }}
            >
              {[
                { id: 'auto', label: '🔄 Tự động', title: 'Tự động nhận diện ngôn ngữ' },
                { id: 'vi_to_ja', label: '🇻🇳 Việt ➔ 🇯🇵 Nhật', title: 'Dịch từ Tiếng Việt sang Tiếng Nhật' },
                { id: 'ja_to_vi', label: '🇯🇵 Nhật ➔ 🇻🇳 Việt', title: 'Dịch từ Tiếng Nhật sang Tiếng Việt' },
              ].map((item) => {
                const isActive = direction === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      sound.playClick()
                      setDirection(item.id as any)
                    }}
                    title={item.title}
                    style={{
                      border: 'none',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: isActive ? 600 : 400,
                      borderRadius: 'var(--radius-sm, 6px)',
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(147, 51, 234, 0.6), rgba(217, 70, 239, 0.4))'
                        : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--color-foreground-secondary, #9ca3af)',
                      boxShadow: isActive ? '0 2px 8px rgba(139, 92, 246, 0.35), inset 0 0 0 1px rgba(168, 85, 247, 0.4)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>

            <div
              role="group"
              aria-label="Chọn văn phong"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--color-foreground-muted, #9ca3af)', marginRight: '2px' }}>Văn phong:</span>
              {[
                { id: '', label: 'Tự do' },
                { id: 'casual', label: 'Thân mật' },
                { id: 'polite', label: 'Lịch sự' },
                { id: 'business', label: 'Công sở' },
              ].map((reg) => {
                const isActive = registerPreference === reg.id
                return (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => {
                      sound.playClick()
                      setRegisterPreference(reg.id as any)
                    }}
                    style={{
                      border: isActive ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '3px 9px',
                      fontSize: '11px',
                      fontWeight: isActive ? 600 : 400,
                      borderRadius: 'var(--radius-sm, 6px)',
                      background: isActive ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                      color: isActive ? '#c084fc' : 'var(--color-foreground-secondary, #9ca3af)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {reg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Primary Query Input */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSearch()
                }}
                placeholder={
                  direction === 'ja_to_vi'
                    ? 'Nhập từ tiếng Nhật cần tra (ví dụ: 善処する, 立て込む...)'
                    : 'Nhập từ hoặc cụm tiếng Việt cần tra (ví dụ: bận ngập mặt, bàn bạc lại...)'
                }
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 36px 0 14px',
                  borderRadius: 'var(--radius-md, 10px)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(168, 85, 247, 0.25)',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-foreground-muted)',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <Button
              variant="primary"
              size="md"
              loading={loading}
              onClick={() => void handleSearch()}
              disabled={!query.trim()}
              style={{
                minWidth: '105px',
                height: '42px',
                background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
                border: 'none',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
              }}
            >
              🔍 Tra AI
            </Button>
          </div>

          {/* Context toggle & textarea */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => setShowContextInput((v) => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#c084fc',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '2px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: 500,
                }}
              >
                <span>{showContextInput ? '▼' : '▶'}</span>
                <span>{showContextInput ? 'Ẩn câu ngữ cảnh' : '+ Thêm câu văn ngữ cảnh (Context) để AI dịch chuẩn hơn'}</span>
              </button>

              {contextText && (
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(139, 92, 246, 0.15)',
                    color: '#c084fc',
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                  }}
                >
                  ✓ Có ngữ cảnh ({contextText.length} ký tự)
                </span>
              )}
            </div>

            {showContextInput && (
              <div style={{ marginTop: '8px' }}>
                <textarea
                  rows={2}
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                  placeholder="Dán hoặc gõ câu văn/đoạn văn chứa từ này để AI phân tích chính xác sắc thái..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md, 8px)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(168, 85, 247, 0.2)',
                    color: '#ffffff',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Result View */}
        <div
          ref={scrollAreaRef}
          className="jw-lookup-scroll-area"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehavior: 'contain',
            padding: '16px 20px 24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {saveSuccessMsg && (
            <Alert tone="success" title="Thành công">
              {saveSuccessMsg}
            </Alert>
          )}

          {error && (
            <Alert tone="error" title="Lỗi tra cứu">
              <div>
                <p style={{ margin: '0 0 6px 0' }}>{error}</p>
                {(error.toLowerCase().includes('not configured') ||
                  error.toLowerCase().includes('empty') ||
                  error.toLowerCase().includes('api_key') ||
                  error.toLowerCase().includes('chưa được')) && (
                  <p style={{ margin: 0, fontSize: '12px', opacity: 0.85 }}>
                    💡 <em>Gợi ý:</em> Hãy chọn một mô hình AI khác ở góc phải trên cùng (ví dụ: Groq / Ollama) hoặc truy cập <a href="/settings" style={{ color: '#c084fc', textDecoration: 'underline' }}>Trang Cài đặt</a> để nhập API Key.
                  </p>
                )}
              </div>
            </Alert>
          )}

          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <Spinner size={36} />
              <p style={{ fontSize: '14px', color: '#d1d5db', fontWeight: 500 }}>
                ✦ AI đang phân tích ngữ cảnh và tìm cách diễn đạt tự nhiên nhất…
              </p>
            </div>
          ) : result && currentDisplayWord ? (
            <>
              {/* Primary Match Card */}
              <Card
                variant="ai"
                style={{
                  background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.14), rgba(59, 130, 246, 0.07))',
                  border: '1px solid rgba(168, 85, 247, 0.35)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
                  borderRadius: '16px',
                }}
              >
                <CardContent style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Word Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', paddingTop: '4px' }}>
                      <FuriganaText
                        text={currentDisplayWord.expression}
                        reading={currentDisplayWord.reading}
                        hideFurigana={!showFurigana}
                        style={{
                          fontSize: '30px',
                          fontWeight: 700,
                          color: '#c084fc',
                          fontFamily: 'var(--font-japanese)',
                          lineHeight: '1.8',
                          display: 'inline-block',
                          letterSpacing: '0.02em',
                        }}
                      />
                      <span style={{ fontSize: '16px', color: '#ffffff', fontWeight: 600 }}>
                        {currentDisplayWord.meaning_vi}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {currentDisplayWord.estimated_jlpt_level && (
                        <Badge tone="accent">JLPT {currentDisplayWord.estimated_jlpt_level}</Badge>
                      )}
                      {currentDisplayWord.register && (
                        <Badge tone="neutral">{currentDisplayWord.register}</Badge>
                      )}
                      {(currentDisplayWord as VocabLookupBestMatch).part_of_speech && (
                        <Badge tone="neutral">{(currentDisplayWord as VocabLookupBestMatch).part_of_speech}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Nuance & Context Explanation */}
                  {((currentDisplayWord as VocabLookupBestMatch).nuance_explanation ||
                    (currentDisplayWord as VocabLookupAlternative).difference_explanation) && (
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md, 10px)',
                        background: 'rgba(139, 92, 246, 0.09)',
                        borderLeft: '3px solid #a855f7',
                        fontSize: '13.5px',
                        lineHeight: '1.65',
                        color: '#e2e8f0',
                      }}
                    >
                      <strong style={{ color: '#c084fc', display: 'block', marginBottom: '3px', fontSize: '13px' }}>
                        💡 Sắc thái & Phân tích ngữ cảnh:
                      </strong>
                      {(currentDisplayWord as VocabLookupBestMatch).nuance_explanation ||
                        (currentDisplayWord as VocabLookupAlternative).difference_explanation}
                    </div>
                  )}

                  {/* Usage Collocation */}
                  {(currentDisplayWord as VocabLookupBestMatch).usage_collocation && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        fontSize: '13px',
                      }}
                    >
                      <span style={{ color: 'var(--color-foreground-muted, #9ca3af)', whiteSpace: 'nowrap' }}>
                        🔗 Cụm kết hợp (Collocation):
                      </span>
                      <strong style={{ color: '#ffffff', fontFamily: 'var(--font-sans), var(--font-jp)', letterSpacing: '0.02em' }}>
                        {(currentDisplayWord as VocabLookupBestMatch).usage_collocation}
                      </strong>
                    </div>
                  )}

                  {/* Unified Real-World Practical Examples (2-3 items) */}
                  {realWorldExamples.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#c084fc',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}
                        >
                          📝 Ví dụ sử dụng trong thực tế ({realWorldExamples.length} tình huống):
                        </span>
                      </div>

                      {realWorldExamples.map((ex, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: idx % 2 === 0
                              ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.07), rgba(139, 92, 246, 0.02))'
                              : 'linear-gradient(135deg, rgba(56, 189, 248, 0.07), rgba(56, 189, 248, 0.02))',
                            border: idx % 2 === 0
                              ? '1px solid rgba(168, 85, 247, 0.22)'
                              : '1px solid rgba(56, 189, 248, 0.22)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: idx % 2 === 0 ? 'rgba(168, 85, 247, 0.18)' : 'rgba(56, 189, 248, 0.18)',
                                color: idx % 2 === 0 ? '#c084fc' : '#38bdf8',
                              }}
                            >
                              {ex.situation}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                sound.playClick()
                                handleSpeak(ex.ja)
                              }}
                              title="Nghe phát âm ví dụ này"
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: idx % 2 === 0 ? '#c084fc' : '#38bdf8',
                                cursor: 'pointer',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <span>🔊</span>
                              <span>Nghe</span>
                            </button>
                          </div>

                          <div style={{ paddingTop: '2px' }}>
                            <FuriganaText
                              text={ex.ja}
                              hideFurigana={!showFurigana}
                              style={{
                                fontSize: '14.5px',
                                fontFamily: 'var(--font-japanese)',
                                color: '#ffffff',
                                lineHeight: '1.8',
                              }}
                            />
                          </div>

                          <span style={{ fontSize: '13px', color: 'rgba(226, 232, 240, 0.85)', lineHeight: '1.45' }}>
                            {ex.vi}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Alternatives List */}
              {result.alternatives && result.alternatives.length > 0 && (
                <div style={{ marginTop: '4px' }}>
                  <h4
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--color-foreground-muted, #9ca3af)',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>🔄</span>
                    <span>Các cách diễn đạt tương đương / thay thế:</span>
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '12px' }}>
                    {result.alternatives.map((alt, idx) => {
                      const isSelected = selectedWord?.expression === alt.expression
                      return (
                        <div
                          key={`${alt.expression}-${idx}`}
                          onClick={() => {
                            sound.playClick()
                            setSelectedWord(alt)
                          }}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '12px',
                            background: isSelected ? 'rgba(147, 51, 234, 0.22)' : 'rgba(255, 255, 255, 0.03)',
                            border: isSelected ? '1px solid rgba(168, 85, 247, 0.65)' : '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: isSelected ? '0 0 16px rgba(168, 85, 247, 0.3)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                            <FuriganaText
                              text={alt.expression}
                              reading={alt.reading}
                              hideFurigana={!showFurigana}
                              style={{
                                fontFamily: 'var(--font-japanese)',
                                fontSize: '17px',
                                fontWeight: 700,
                                color: '#c084fc',
                                lineHeight: '1.6',
                              }}
                            />
                            {alt.estimated_jlpt_level && (
                              <Badge tone="neutral">{alt.estimated_jlpt_level}</Badge>
                            )}
                          </div>
                          <p style={{ fontSize: '13.5px', color: '#ffffff', margin: '4px 0 3px 0', fontWeight: 500 }}>
                            {alt.meaning_vi}
                          </p>
                          <p style={{ fontSize: '12px', color: 'var(--color-foreground-muted, #9ca3af)', lineHeight: '1.45', margin: 0 }}>
                            {alt.difference_explanation}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-foreground-muted)' }}>
              <span style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }}>💡</span>
              <p style={{ fontSize: '15px', color: '#e2e8f0', fontWeight: 500 }}>
                Nhập từ cần tra và câu ngữ cảnh rồi bấm <strong>Tra AI</strong>.
              </p>
              <p style={{ fontSize: '12.5px', color: 'var(--color-foreground-subtle, #6b7280)', marginTop: '6px' }}>
                Mẹo: Bạn có thể bấm <kbd style={{ padding: '2px 7px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.15)' }}>Ctrl + K</kbd> ở bất kỳ đâu để mở nhanh!
              </p>
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        {result && currentDisplayWord && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(14, 14, 20, 0.96)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button
                variant="primary"
                size="sm"
                icon="write"
                onClick={() => handleInsert(currentDisplayWord.expression)}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
                  border: 'none',
                  fontWeight: 600,
                  boxShadow: '0 3px 12px rgba(139, 92, 246, 0.35)',
                }}
              >
                📥 Chèn vào bài
              </Button>

              <Button
                variant="secondary"
                size="sm"
                loading={saving}
                onClick={() => void handleSaveToBank(currentDisplayWord)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                💾 Lưu từ vựng
              </Button>
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  sound.playClick()
                  handleSpeak(currentDisplayWord.expression)
                }}
                title="Nghe phát âm từ này"
              >
                🔊 Phát âm
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(currentDisplayWord.expression)}
                title="Sao chép từ này vào clipboard"
              >
                {copied ? '✓ Đã chép' : '📋 Chép'}
              </Button>

              {currentDisplayWord.expression && /[\u4e00-\u9faf]/.test(currentDisplayWord.expression) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    sound.playClick()
                    const match = currentDisplayWord.expression.match(/[\u4e00-\u9faf]/)
                    if (match) setKanjiModalChar(match[0])
                  }}
                  title="Tập viết chữ Hán trong từ này"
                >
                  🖌️ Viết Kanji
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {kanjiModalChar && (
        <KanjiStrokeModal
          open={Boolean(kanjiModalChar)}
          kanji={kanjiModalChar}
          onClose={() => setKanjiModalChar(null)}
        />
      )}
    </div>,
    document.body,
  )
}


