import React, { useState, useEffect, useCallback } from 'react'
import type {
  ExpressionRecord,
  ExpressionBankSummary,
  CollocationAnalysisResult,
} from '../../types/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { Input } from '../ui/Input'
import { Tabs } from '../ui/Tabs'
import { Spinner } from '../ui/Spinner'
import { Alert } from '../ui/Alert'
import { AIModelPicker } from '../ai/AIModelPicker'
import { CollocationMap } from './CollocationMap'
import { OveruseRadar } from './OveruseRadar'
import { TransferDetectionPanel } from './TransferDetectionPanel'
import { RegisterLadderModal } from './RegisterLadderModal'
import { ExpressionVariationModal } from './ExpressionVariationModal'
import { api } from '../../services/api'
import { sound } from '../../services/sound'

interface ExpressionBankPanelProps {
  onPracticeExpression?: (expression: string, baseWord?: string) => void
}

export const ExpressionBankPanel: React.FC<ExpressionBankPanelProps> = ({
  onPracticeExpression,
}) => {
  const [subTab, setSubTab] = useState<string>('overview')
  const [records, setRecords] = useState<ExpressionRecord[]>([])
  const [summary, setSummary] = useState<ExpressionBankSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // AI interactive testing states
  const [testText, setTestText] = useState('')
  const [testContextVi, setTestContextVi] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<CollocationAnalysisResult | null>(null)
  const [aiModel, setAiModel] = useState<{ provider?: string; model?: string }>({})

  // Modals
  const [showLadderModal, setShowLadderModal] = useState(false)
  const [ladderInitialText, setLadderInitialText] = useState('')
  const [showVariationModal, setShowVariationModal] = useState(false)
  const [variationInitialText, setVariationInitialText] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [bankRes, sumRes] = await Promise.all([
        api.getExpressionBank({ limit: 100 }),
        api.getExpressionBankSummary(),
      ])
      setRecords(bankRes.items)
      setSummary(sumRes)
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || 'Không thể tải dữ liệu Ngân hàng biểu đạt.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAnalyzeText = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testText.trim() || analyzing) return
    setAnalyzing(true)
    setError(null)
    try {
      sound.playNeutral()
      const res = await api.analyzeExpressions({
        text: testText.trim(),
        context_vi: testContextVi.trim() || undefined,
        provider: aiModel.provider,
        model: aiModel.model,
      })
      setAnalysisResult(res)
      sound.playSuccess()
      // Reload bank records to reflect newly analyzed expressions
      loadData()
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || 'Phân tích biểu đạt thất bại.'
      setError(msg)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleOpenLadder = (text?: string) => {
    setLadderInitialText(text || '')
    setShowLadderModal(true)
  }

  const handleOpenVariation = (text?: string) => {
    setVariationInitialText(text || '')
    setShowVariationModal(true)
  }

  const subTabs = [
    { id: 'overview', label: 'Tổng quan & Phân tích' },
    { id: 'collocations', label: 'Bản đồ Collocation' },
    { id: 'overuse', label: 'Radar Lạm dụng' },
    { id: 'transfers', label: 'Dịch thô Tiếng Việt' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Top Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-title)', fontWeight: 700, margin: 0 }}>
            Trí Tuệ Biểu Đạt & Ngữ Vực (Expression Intelligence)
          </h2>
          <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground-secondary)', margin: '4px 0 0 0' }}>
            Nâng cao độ tự nhiên từ vựng, kết hợp từ (collocation) và chính xác hóa văn phong qua luyện viết.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            onClick={() => handleOpenLadder()}
            aria-label="Mở thang biến đổi ngữ vực 5 cấp"
          >
            Thang ngữ vực 5 cấp
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleOpenVariation()}
            aria-label="Mở tính năng viết 3 cách tự nhiên"
          >
            Viết 3 cách tự nhiên
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-sm)' }}>
          <Card>
            <CardContent>
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-muted)' }}>
                Tổng biểu đạt theo dõi
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '4px' }}>
                {summary.total_expressions}
              </div>
              <div style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-secondary)', marginTop: '2px' }}>
                {summary.collocations_count} collocations / {summary.sentence_endings_count + summary.discourse_markers_count} kết câu & từ nối
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-muted)' }}>
                Độ tự nhiên trung bình
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-ai)', marginTop: '4px' }}>
                {summary.average_naturalness}%
              </div>
              <div style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-secondary)', marginTop: '2px' }}>
                Đánh giá theo thói quen bản xứ
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-muted)' }}>
                Biểu đạt lạm dụng (Overuse)
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: summary.overused_count > 0 ? 'var(--color-error)' : 'var(--color-success)', marginTop: '4px' }}>
                {summary.overused_count}
              </div>
              <div style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-secondary)', marginTop: '2px' }}>
                Mẫu lặp lại đơn điệu cần mở rộng
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-muted)' }}>
                Chuyển di dịch thô tiếng Việt
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: summary.literal_count > 0 ? 'var(--color-warning)' : 'var(--color-success)', marginTop: '4px' }}>
                {summary.literal_count}
              </div>
              <div style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-secondary)', marginTop: '2px' }}>
                Điểm ảnh hưởng tư duy L1
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sub navigation tabs */}
      <Tabs
        items={subTabs}
        value={subTab}
        onChange={(val) => setSubTab(val)}
      />

      {loading ? (
        <div style={{ padding: 'var(--space-xl)', display: 'flex', justifyContent: 'center' }}>
          <Spinner size={24} />
        </div>
      ) : (
        <>
          {subTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {/* Interactive Analysis Tool */}
              <Card variant="ai">
                <CardHeader
                  title="Kiểm tra & Phân tích Biểu đạt Tự do"
                  description="Nhập một câu hoặc đoạn văn tiếng Nhật để quét Collocation, Lạm dụng từ và Dịch thô tiếng Việt"
                />
                <CardContent>
                  <form onSubmit={handleAnalyzeText} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    <Textarea
                      id="expression-test-text"
                      label="Câu tiếng Nhật cần kiểm tra"
                      value={testText}
                      onChange={(e) => setTestText(e.target.value)}
                      placeholder="VD: 私の考えは予定を決定すると思います。雨が降るから行きません..."
                      rows={3}
                    />

                    <Input
                      id="expression-test-context"
                      label="Ngữ cảnh / Ý định tiếng Việt (tùy chọn)"
                      value={testContextVi}
                      onChange={(e) => setTestContextVi(e.target.value)}
                      placeholder="VD: Thảo luận kế hoạch với đồng nghiệp..."
                    />

                    <div style={{ marginTop: 'var(--space-xs)' }}>
                      <AIModelPicker
                        variant="compact"
                        value={aiModel}
                        onChange={setAiModel}
                      />
                    </div>

                    {error && <Alert tone="error">{error}</Alert>}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-xs)' }}>
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={!testText.trim() || analyzing}
                        aria-label="Phân tích biểu đạt"
                      >
                        {analyzing ? <Spinner size={16} /> : 'Phân tích Biểu đạt bằng AI →'}
                      </Button>
                    </div>
                  </form>

                  {analysisResult && (
                    <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-ai)' }}>
                          Kết quả Phân tích: Điểm tự nhiên {analysisResult.overall_naturalness_score}%
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <Button size="sm" variant="ghost" onClick={() => handleOpenVariation(testText)}>
                            Tạo 3 biến thể ✨
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleOpenLadder(testText)}>
                            Chuyển ngữ vực 🪜
                          </Button>
                        </div>
                      </div>

                      {analysisResult.summary_vi && (
                        <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground-secondary)', marginBottom: 'var(--space-sm)' }}>
                          {analysisResult.summary_vi}
                        </div>
                      )}

                      {/* Collocations in result */}
                      {analysisResult.collocations.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-sm)' }}>
                          <strong style={{ fontSize: 'var(--text-caption)', color: 'var(--color-primary)' }}>
                            🔗 Kết hợp từ (Collocations):
                          </strong>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                            {analysisResult.collocations.map((c, i) => (
                              <div key={i} style={{ padding: '6px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px', fontSize: 'var(--text-body-sm)' }}>
                                <span style={{ fontWeight: 600 }}>{c.expression}</span> → Nên dùng: <strong style={{ color: 'var(--color-success)' }}>{c.native_alternative}</strong> ({c.explanation_vi})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Overuse in result */}
                      {analysisResult.overuse.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-sm)' }}>
                          <strong style={{ fontSize: 'var(--text-caption)', color: 'var(--color-error)' }}>
                            📡 Mẫu lặp (Overuse):
                          </strong>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                            {analysisResult.overuse.map((o, i) => (
                              <div key={i} style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '4px', fontSize: 'var(--text-body-sm)' }}>
                                <span>{o.expression}</span> (Lặp {o.count} lần) — {o.explanation_vi}
                                {o.suggested_alternatives.length > 0 && (
                                  <div style={{ fontSize: 'var(--text-micro)', color: 'var(--color-ai)', marginTop: '2px' }}>
                                    Thay bằng: {o.suggested_alternatives.join(', ')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Transfers in result */}
                      {analysisResult.transfers.length > 0 && (
                        <div>
                          <strong style={{ fontSize: 'var(--text-caption)', color: 'var(--color-warning)' }}>
                            🇻🇳 Chuyển di L1 Tiếng Việt:
                          </strong>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                            {analysisResult.transfers.map((t, i) => (
                              <div key={i} style={{ padding: '6px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '4px', fontSize: 'var(--text-body-sm)' }}>
                                <span style={{ fontWeight: 600 }}>{t.expression}</span> → Chuẩn Nhật: <strong style={{ color: 'var(--color-success)' }}>{t.native_alternative}</strong>
                                <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>{t.explanation_vi}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Expression Bank Listing */}
              <Card>
                <CardHeader
                  title="Danh mục Biểu đạt Cá nhân (Personal Expression Bank)"
                  description="Tất cả các cụm từ, kết câu và collocation đã ghi nhận từ quá trình làm bài viết của bạn"
                />
                <CardContent>
                  {records.length === 0 ? (
                    <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>
                      Chưa có biểu đạt nào trong ngân hàng. Hãy nộp bài viết hoặc phân tích câu ở trên để bắt đầu tích lũy!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                      {records.slice(0, 15).map((r) => (
                        <div
                          key={r.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 'var(--space-xs) var(--space-sm)',
                            background: 'var(--color-surface)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)',
                            flexWrap: 'wrap',
                            gap: 'var(--space-xs)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <span style={{ fontWeight: 600 }}>{r.expression}</span>
                            <Badge tone="neutral">{r.expression_type}</Badge>
                            {r.is_overused && <Badge tone="error">Lạm dụng</Badge>}
                            {r.vietnamese_literal && <Badge tone="warning">Dịch thô L1</Badge>}
                            {r.native_alternatives && r.native_alternatives.length > 0 && (
                              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ai)' }}>
                                → {r.native_alternatives[0]}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                            <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)' }}>
                              Dùng {r.used_count} lần
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenVariation(r.expression)}
                              aria-label={`Tạo biến thể cho ${r.expression}`}
                            >
                              Biến thể ✨
                            </Button>
                            {onPracticeExpression && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onPracticeExpression(r.expression, r.base_word || undefined)}
                                aria-label={`Luyện tập biểu đạt ${r.expression}`}
                              >
                                Luyện tập
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {subTab === 'collocations' && (
            <CollocationMap
              records={records}
              onPracticeExpression={onPracticeExpression}
              aiModel={aiModel}
            />
          )}

          {subTab === 'overuse' && (
            <OveruseRadar
              records={records}
              onPracticeAlternative={(expr, alt) => {
                handleOpenVariation(`${expr} / ${alt}`)
              }}
            />
          )}

          {subTab === 'transfers' && (
            <TransferDetectionPanel
              records={records}
              onPracticeAlternative={(expr, alt) => {
                if (onPracticeExpression) onPracticeExpression(alt, expr)
              }}
            />
          )}
        </>
      )}

      {/* Modals */}
      <RegisterLadderModal
        isOpen={showLadderModal}
        onClose={() => setShowLadderModal(false)}
        initialText={ladderInitialText}
      />

      <ExpressionVariationModal
        isOpen={showVariationModal}
        onClose={() => setShowVariationModal(false)}
        initialText={variationInitialText}
      />
    </div>
  )
}
