import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import type { RewriteLabSession, SelfCorrectionAttemptResult, RecentSnippetItem } from '../types/api'
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Textarea } from '../components/ui/Textarea'
import { Tabs } from '../components/ui/Tabs'
import { Spinner } from '../components/ui/Spinner'
import { Alert } from '../components/ui/Alert'
import { PageContainer } from '../components/layout/PageContainer'
import { AIModelPicker } from '../components/ai/AIModelPicker'
import {
  SelfCorrectionLadder,
  RewriteModesWorkspace,
  TransferCheckWorkspace,
  RecentSnippetsModal,
} from '../components/rewrite'
import { sound } from '../services/sound'

export const RewriteLabPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryText = searchParams.get('text') || ''
  const queryContext = searchParams.get('context') || ''

  const [activeTab, setActiveTab] = useState<string>('self_correction')
  const [inputText, setInputText] = useState(queryText || '')
  const [contextVi, setContextVi] = useState(queryContext || '')
  const [aiModel, setAiModel] = useState<{ provider?: string; model?: string }>({})

  const [session, setSession] = useState<RewriteLabSession | null>(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSnippetsModal, setShowSnippetsModal] = useState(false)

  const handleStartSession = useCallback(
    async (customText?: string, customContext?: string) => {
      const textToUse = customText || inputText
      if (!textToUse.trim() || starting) return
      setStarting(true)
      setError(null)
      try {
        const newSession = await api.createRewriteLabSession({
          text: textToUse.trim(),
          context_vi: (customContext || contextVi).trim() || undefined,
          provider: aiModel.provider || undefined,
          model: aiModel.model || undefined,
        })
        setSession(newSession)
        sound.playSuccess()
      } catch (err: unknown) {
        const e = err as { message?: string }
        setError(e.message || 'Không thể bắt đầu phiên tự sửa lỗi. Vui lòng thử lại.')
        sound.playNeutral()
      } finally {
        setStarting(false)
      }
    },
    [inputText, starting, contextVi, aiModel],
  )

  const autoStartedRef = useRef(false)
  // Auto-start if redirected from evaluation view with query text
  useEffect(() => {
    if (queryText && !session && !starting && !autoStartedRef.current) {
      autoStartedRef.current = true
      setInputText(queryText)
      if (queryContext) setContextVi(queryContext)
      void handleStartSession(queryText, queryContext)
    }
  }, [queryText, queryContext, session, starting, handleStartSession])

  const handleAttemptSubmit = async (attemptText: string): Promise<SelfCorrectionAttemptResult | undefined> => {
    if (!session) return
    try {
      const evalRes = await api.submitSelfCorrectionAttempt(session.id, {
        attempt_text: attemptText,
        provider: aiModel.provider || undefined,
        model: aiModel.model || undefined,
      })
      // Refresh session
      const refreshed = await api.getRewriteLabSession(session.id)
      setSession(refreshed)
      return evalRes
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || 'Không thể gửi câu tự sửa.')
      return undefined
    }
  }

  const handleReveal = async () => {
    if (!session) return
    try {
      await api.revealRewriteLabVariants(session.id, {
        provider: aiModel.provider || undefined,
        model: aiModel.model || undefined,
      })
      const refreshed = await api.getRewriteLabSession(session.id)
      setSession(refreshed)
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || 'Không thể mở đáp án đối chiếu.')
    }
  }

  const handleResetSession = () => {
    setSession(null)
    setInputText('')
    setContextVi('')
    setError(null)
    setSearchParams({})
    sound.playNeutral()
  }

  const handleReloadSession = async () => {
    if (!session) return
    try {
      const refreshed = await api.getRewriteLabSession(session.id)
      setSession(refreshed)
      sound.playSuccess()
    } catch {
      sound.playNeutral()
    }
  }

  const handleSnippetSelect = (snippet: RecentSnippetItem) => {
    setInputText(snippet.text)
    if (snippet.context_vi) {
      setContextVi(snippet.context_vi)
    }
  }

  const tabsConfig = [
    { id: 'self_correction', label: '1. Tự sửa lỗi (Self-Correction)' },
    { id: 'rewrite_modes', label: '2. 6 Phong cách biến đổi (Rewrite Modes)' },
    { id: 'transfer_arena', label: '3. Đấu trường chuyển giao (Transfer Arena)' },
  ]

  return (
    <PageContainer size="wide">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {/* Slim Studio Header */}
        <div className="jw-studio-subbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700, margin: 0, color: 'var(--color-foreground)' }}>
              Phòng Thí Nghiệm Sửa Câu & Diễn Đạt (Rewrite Lab)
            </h1>
            <Badge tone="ai">Self-Correction</Badge>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSnippetsModal(true)}
              aria-label="Lấy câu từ bài viết gần đây"
            >
              Lấy câu gần đây
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetSession}
              aria-label="Làm mới trang"
            >
              Làm mới
            </Button>
          </div>
        </div>

        {/* Pedagogical Step Guide Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface-subtle)',
            border: '1px solid var(--color-border-subtle)',
            fontSize: 'var(--text-caption)',
            flexWrap: 'wrap',
            gap: 'var(--space-xs)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-foreground-muted)' }}>Quy trình 3 bước:</span>
            <span style={{ fontWeight: activeTab === 'self_correction' ? 700 : 500, color: activeTab === 'self_correction' ? 'var(--color-primary)' : 'var(--color-foreground-secondary)' }}>
              1. Tự sửa lỗi
            </span>
            <span style={{ color: 'var(--color-foreground-muted)' }}>➔</span>
            <span style={{ fontWeight: activeTab === 'rewrite_modes' ? 700 : 500, color: activeTab === 'rewrite_modes' ? 'var(--color-primary)' : 'var(--color-foreground-secondary)' }}>
              2. Đối chiếu phong cách
            </span>
            <span style={{ color: 'var(--color-foreground-muted)' }}>➔</span>
            <span style={{ fontWeight: activeTab === 'transfer_arena' ? 700 : 500, color: activeTab === 'transfer_arena' ? 'var(--color-primary)' : 'var(--color-foreground-secondary)' }}>
              3. Ứng dụng sang câu mới
            </span>
          </div>
          {session && (
            <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
              ● Đang phân tích phiên #{session.id.slice(0, 6)}
            </span>
          )}
        </div>

        {/* Tab Navigation */}
        <Tabs
          items={tabsConfig}
          value={activeTab}
          onChange={setActiveTab}
        />

        {error && <Alert tone="error" title="Lỗi">{error}</Alert>}

        {/* TAB 1: Self-Correction Lab */}
        {activeTab === 'self_correction' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {/* Start New Session if no session active */}
            {!session ? (
              <Card variant="elevated">
                <CardHeader
                  title="Bắt đầu phân tích & Tự sửa câu mới"
                  actions={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSnippetsModal(true)}
                      aria-label="Lấy câu từ bài viết gần đây"
                    >
                      Lấy câu gần đây
                    </Button>
                  }
                />
                <CardContent>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {/* Quick Punctuation & Sample Sentence Pills */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-foreground-muted)' }}>Mẫu thử:</span>
                      {[
                        '私は日本語を勉強することが楽しいです。',
                        '昨日は友達とご飯を食べに行きました。',
                        'この本はとても面白くて役に立つと思います。',
                      ].map((sample, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            sound.playWashiStroke()
                            setInputText(sample)
                          }}
                          style={{
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--color-foreground-secondary)',
                            fontSize: '11px',
                            fontFamily: 'var(--font-japanese)',
                            cursor: 'pointer',
                          }}
                        >
                          {sample.length > 20 ? `${sample.slice(0, 18)}...` : sample}
                        </button>
                      ))}
                    </div>

                    <Textarea
                      id="self-correction-start-text"
                      label="Nhập câu tiếng Nhật của bạn:"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Nhập câu tiếng Nhật muốn kiểm tra..."
                      rows={2}
                      aria-label="Nhập câu tiếng Nhật của bạn"
                    />
                    <AIModelPicker
                      variant="inline"
                      value={aiModel}
                      onChange={setAiModel}
                      label="Mô hình AI chẩn đoán"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetSession}
                      aria-label="Xóa nội dung nhập"
                    >
                      Xóa trắng
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => handleStartSession()}
                      disabled={!inputText.trim() || starting}
                      aria-label="Bắt đầu tự sửa câu này"
                    >
                      {starting ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Spinner size={16} /> Đang phát hiện lỗi...
                        </span>
                      ) : (
                        'Bắt đầu chu trình tự sửa (Step 1-6)'
                      )}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetSession}
                    aria-label="Bắt đầu câu khác"
                  >
                    ← Phân tích câu khác (Làm mới)
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleReloadSession}
                    aria-label="Tải lại phiên hiện tại"
                  >
                    Đồng bộ lại dữ liệu
                  </Button>
                </div>
                <SelfCorrectionLadder
                  session={session}
                  onSubmitAttempt={handleAttemptSubmit}
                  onReveal={handleReveal}
                  onProceedToTransfer={() => setActiveTab('transfer_arena')}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: 6 Rewrite Modes Lab */}
        {activeTab === 'rewrite_modes' && (
          <div>
            <RewriteModesWorkspace
              initialText={session?.original_text || inputText}
              onTextChange={(val) => {
                if (!session) {
                  setInputText(val)
                }
              }}
              onOpenRecent={() => setShowSnippetsModal(true)}
            />
          </div>
        )}

        {/* TAB 3: Transfer Check Arena */}
        {activeTab === 'transfer_arena' && (
          <div>
            <TransferCheckWorkspace
              session={session}
              onTaskGenerated={(task) => {
                if (session) {
                  setSession({ ...session, transfer_task: task })
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Quick Import Modal */}
      <RecentSnippetsModal
        open={showSnippetsModal}
        onClose={() => setShowSnippetsModal(false)}
        onSelectSnippet={handleSnippetSelect}
      />
    </PageContainer>
  )
}
export default RewriteLabPage
