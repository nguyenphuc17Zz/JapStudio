import React, { useState } from 'react'
import type { RewriteLabSession, SocraticCoachResult } from '../../types/api'
import { api } from '../../services/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Spinner } from '../ui/Spinner'
import { sound } from '../../services/sound'

interface SocraticCoachPaneProps {
  session?: RewriteLabSession | null
  className?: string
}

export const SocraticCoachPane: React.FC<SocraticCoachPaneProps> = ({
  session,
  className = '',
}) => {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<
    Array<{ q: string; a: SocraticCoachResult }>
  >([])

  const defaultSuggestions = [
    'Tại sao cách diễn đạt này chưa tự nhiên?',
    'Mẫu câu này có quy tắc trợ từ thế nào?',
    'Làm thế nào để sửa câu này theo văn phong bản ngữ?',
  ]

  const handleAsk = async (qText: string) => {
    const textToAsk = qText.trim() || question.trim()
    if (!textToAsk || loading) return
    setLoading(true)
    try {
      const res = await api.askSocraticWritingCoach({
        question: textToAsk,
        session_id: session?.id,
        current_weakness: session?.issue_category || undefined,
      })
      setHistory((prev) => [...prev, { q: textToAsk, a: res }])
      setQuestion('')
      sound.playSuccess()
    } catch {
      sound.playNeutral()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="ai" className={`jw-socratic-coach-pane ${className}`}>
      <CardHeader
        title="Trợ lý sư phạm Socratic (AI Writing Coach)"
        actions={<Badge tone="ai">Socratic Method</Badge>}
      />
      <CardContent>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground-secondary)' }}>
            Huấn luyện viên AI sẽ không đưa ra đáp án trực tiếp mà sẽ phân tích nguyên lý, đặt câu hỏi gợi mở và giúp bạn hiểu sâu bản chất ngữ pháp.
          </div>

          {/* Quick suggestions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
            {(history.length > 0 && history[history.length - 1].a.suggestions?.length
              ? history[history.length - 1].a.suggestions
              : defaultSuggestions
            ).map((sug, idx) => (
              <Button
                key={idx}
                variant="ghost"
                size="sm"
                onClick={() => handleAsk(sug)}
                disabled={loading}
                aria-label={`Gợi ý: ${sug}`}
              >
                💬 {sug}
              </Button>
            ))}
          </div>

          {/* Chat History */}
          {history.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxHeight: '380px', overflowY: 'auto' }}>
              {history.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* User Question */}
                  <div
                    style={{
                      alignSelf: 'flex-end',
                      background: 'var(--color-primary)',
                      color: '#ffffff',
                      padding: 'var(--space-sm) var(--space-md)',
                      borderRadius: 'var(--radius-md) var(--radius-md) 0 var(--radius-md)',
                      maxWidth: '85%',
                      fontSize: 'var(--text-body-sm)',
                    }}
                  >
                    {item.q}
                  </div>

                  {/* Coach Response */}
                  <div
                    style={{
                      alignSelf: 'flex-start',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      padding: 'var(--space-md)',
                      borderRadius: 'var(--radius-md) var(--radius-md) var(--radius-md) 0',
                      maxWidth: '90%',
                      fontSize: 'var(--text-body-sm)',
                      lineHeight: 1.6,
                    }}
                  >
                    <div style={{ color: 'var(--color-foreground)', marginBottom: 'var(--space-xs)' }}>
                      {item.a.answer}
                    </div>

                    {item.a.pattern_highlight && (
                      <div
                        style={{
                          marginTop: 'var(--space-xs)',
                          padding: '4px 8px',
                          background: 'rgba(99, 102, 241, 0.1)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--color-primary)',
                          fontWeight: 600,
                          fontSize: 'var(--text-caption)',
                        }}
                      >
                        📐 Điểm ngữ pháp: {item.a.pattern_highlight}
                      </div>
                    )}

                    {item.a.why_previous_failed_vi && (
                      <div
                        style={{
                          marginTop: 'var(--space-xs)',
                          fontSize: 'var(--text-caption)',
                          color: 'var(--color-foreground-secondary)',
                        }}
                      >
                        🔎 Nguyên nhân câu trước chưa chuẩn: {item.a.why_previous_failed_vi}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ask Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleAsk(question)
            }}
            style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}
          >
            <div style={{ flex: 1 }}>
              <Input
                id="socratic-coach-input"
                label=""
                placeholder="Hỏi huấn luyện viên AI về cấu trúc hoặc cách diễn đạt..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={loading}
                aria-label="Hỏi huấn luyện viên AI"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={!question.trim() || loading}
              aria-label="Gửi câu hỏi"
            >
              {loading ? <Spinner size={16} /> : 'Gửi hỏi'}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
