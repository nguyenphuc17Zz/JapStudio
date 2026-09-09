import React from 'react'
import type { ExpressionRecord } from '../../types/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

interface OveruseRadarProps {
  records: ExpressionRecord[]
  onPracticeAlternative?: (expression: string, alternative: string) => void
}

export const OveruseRadar: React.FC<OveruseRadarProps> = ({
  records,
  onPracticeAlternative,
}) => {
  const overusedRecords = records.filter(
    (r) => r.is_overused || r.overuse_count > 0 || r.expression_type === 'sentence_ending'
  )

  const commonOverusePatterns = [
    { pattern: 'と思います', label: 'Lạm dụng bày tỏ suy nghĩ cá nhân (hedging)', tips: 'Thay bằng 〜と考えております, 〜と推測されます, 〜のようです' },
    { pattern: 'ので / から', label: 'Lặp liên từ chỉ nguyên nhân liên tục', tips: 'Thay bằng 〜ため, 〜につき, 〜ことから' },
    { pattern: 'すごく / とても', label: 'Phó từ chỉ mức độ đơn điệu', tips: 'Thay bằng 大変, 非常に, 極めて, 著しく' },
    { pattern: '〜ことです', label: 'Lặp mẫu danh từ hóa kết câu', tips: 'Thay bằng cấu trúc động từ trực tiếp hoặc chia thể chủ động' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Overuse Radar Banner */}
      <Card variant="ai">
        <CardHeader
          title="Radar Phát hiện Lạm dụng Biểu đạt & Kết câu"
          description="Nhận diện các mẫu lặp tự động (思います, ので, すごく...) và phân biệt giữa lặp cố ý hợp lệ với thói quen đơn điệu"
        />
        <CardContent>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-sm)' }}>
            {commonOverusePatterns.map((p, idx) => {
              const matched = overusedRecords.find((r) => r.expression.includes(p.pattern))
              return (
                <div
                  key={idx}
                  style={{
                    padding: 'var(--space-sm)',
                    background: matched ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${matched ? 'var(--color-error)' : 'var(--color-border)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: matched ? 'var(--color-error)' : 'var(--color-foreground)' }}>
                      {p.pattern}
                    </span>
                    {matched ? (
                      <Badge tone="error">Đang bị lặp ({matched.overuse_count || matched.used_count} lần)</Badge>
                    ) : (
                      <Badge tone="neutral">Kiểm soát tốt</Badge>
                    )}
                  </div>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
                    {p.label}
                  </span>
                  <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-ai)', background: 'var(--glass-bg)', padding: '4px', borderRadius: '4px', marginTop: '4px' }}>
                    Gợi ý: {p.tips}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tracked Overused List */}
      <Card>
        <CardHeader
          title="Các biểu đạt lặp lại nhiều trong bài viết của bạn"
          description="Đánh giá nhạy ngữ cảnh — chỉ cảnh báo khi gây nghèo nàn vốn từ, không phạt khi lặp lại có chủ đích"
        />
        <CardContent>
          {overusedRecords.length === 0 ? (
            <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>
              Rất tốt! Bạn chưa bị lạm dụng biểu đạt nào một cách đơn điệu.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {overusedRecords.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: 'var(--space-md)',
                    background: 'var(--color-surface-subtle)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-xs)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-title-sm)', color: 'var(--color-foreground)' }}>
                        {item.expression}
                      </span>
                      <Badge tone="error">Lặp lại {item.overuse_count || item.used_count} lần</Badge>
                      <Badge tone="neutral">{item.expression_type}</Badge>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      {(item.registers_used || []).map((r) => (
                        <Badge key={r} tone="neutral">{r}</Badge>
                      ))}
                    </div>
                  </div>

                  {item.nuance_notes && (
                    <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
                      {item.nuance_notes}
                    </div>
                  )}

                  {item.native_alternatives && item.native_alternatives.length > 0 && (
                    <div style={{ marginTop: 'var(--space-xs)', padding: 'var(--space-sm)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                      <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-ai)', display: 'block', marginBottom: '4px' }}>
                        ✨ Đa dạng hóa bằng các phương án thay thế:
                      </span>
                      <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                        {item.native_alternatives.map((alt, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '2px 8px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '4px',
                              fontSize: 'var(--text-caption)',
                              color: 'var(--color-foreground)',
                              border: '1px solid var(--color-border)',
                            }}
                          >
                            <span>{alt}</span>
                            {onPracticeAlternative && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onPracticeAlternative(item.expression, alt)}
                                aria-label={`Luyện tập thay thế ${item.expression} bằng ${alt}`}
                              >
                                Thử →
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
