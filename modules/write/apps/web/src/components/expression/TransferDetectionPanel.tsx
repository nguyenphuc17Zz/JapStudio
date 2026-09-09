import React, { useState } from 'react'
import type { ExpressionRecord } from '../../types/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'

interface TransferDetectionPanelProps {
  records: ExpressionRecord[]
  onPracticeAlternative?: (expression: string, alternative: string) => void
}

export const TransferDetectionPanel: React.FC<TransferDetectionPanelProps> = ({
  records,
  onPracticeAlternative,
}) => {
  const [filterClass, setFilterClass] = useState<string>('all')

  const transferRecords = records.filter(
    (r) => r.vietnamese_literal || r.transfer_classification !== 'natural'
  )

  const filtered = transferRecords.filter((r) => {
    if (filterClass === 'all') return true
    return r.transfer_classification === filterClass
  })

  const getTierInfo = (classification: string) => {
    switch (classification) {
      case 'literal_translation':
        return {
          label: 'Dịch thô nguyên văn (Translationese)',
          tone: 'error' as const,
          desc: 'Ghép từ theo trật tự câu tiếng Việt thay vì tư duy diễn đạt tiếng Nhật',
          icon: '⚠️',
        }
      case 'grammatically_possible_but_unnatural':
        return {
          label: 'Đúng ngữ pháp nhưng không tự nhiên',
          tone: 'warning' as const,
          desc: 'Người Nhật hiểu được nhưng bản xứ sẽ không diễn đạt theo cách này',
          icon: '△',
        }
      case 'native_preferred':
      case 'native_preferred_alternative':
        return {
          label: 'Đã có quán ngữ/cách nói bản xứ chuẩn',
          tone: 'info' as const,
          desc: 'Tiếng Nhật có mẫu câu hoặc thành ngữ định sẵn tự nhiên hơn nhiều',
          icon: '⭕',
        }
      default:
        return {
          label: 'Tự nhiên',
          tone: 'success' as const,
          desc: 'Biểu đạt thuần Nhật',
          icon: '✓',
        }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* 3-Tier Classification Explanation Card */}
      <Card variant="ai">
        <CardHeader
          title="Phân loại 3 Mức độ Chuyển di Ngôn ngữ (Vietnamese → Japanese)"
          description="Hệ thống không đơn giản đánh giá 'sai' mà chỉ rõ nguồn gốc tư duy tiếng Việt và cách người Nhật thực sự nghĩ"
        />
        <CardContent>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-sm)' }}>
            <div style={{ padding: 'var(--space-sm)', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-error)' }}>
              <div style={{ fontWeight: 600, color: 'var(--color-error)', marginBottom: '4px' }}>
                1. Dịch nguyên văn (Literal Translation)
              </div>
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
                Dịch từng chữ từ tiếng Việt sang tiếng Nhật khiến câu kỳ quặc hoặc sai ngữ nghĩa.
              </div>
            </div>

            <div style={{ padding: 'var(--space-sm)', background: 'rgba(245, 158, 11, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-warning)' }}>
              <div style={{ fontWeight: 600, color: 'var(--color-warning)', marginBottom: '4px' }}>
                2. Đúng ngữ pháp nhưng gượng gạo
              </div>
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
                Không sai ngữ pháp sách giáo khoa, nhưng người Nhật hầu như không nói/viết như vậy.
              </div>
            </div>

            <div style={{ padding: 'var(--space-sm)', background: 'rgba(59, 130, 246, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-accent)' }}>
              <div style={{ fontWeight: 600, color: 'var(--color-accent)', marginBottom: '4px' }}>
                3. Đã có cách nói bản ngữ ưu tiên
              </div>
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
                Có mẫu câu định sẵn, cụm từ kết hợp (collocation) đặc trưng tiếng Nhật hay hơn.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter and List */}
      <Card>
        <CardHeader
          title="Các điểm chuyển di phát hiện từ bài viết của bạn"
          actions={
            <div style={{ minWidth: '220px' }}>
              <Select
                id="transfer-filter-tier"
                label=""
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
              >
                <option value="all">Tất cả mức độ phân loại</option>
                <option value="literal_translation">Dịch nguyên văn</option>
                <option value="possible_but_unnatural">Đúng ngữ pháp nhưng gượng</option>
                <option value="native_preferred">Có cách nói bản xứ chuẩn</option>
              </Select>
            </div>
          }
        />
        <CardContent>
          {filtered.length === 0 ? (
            <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>
              Không có biểu đạt nào thuộc phân loại này. Bạn đang tư duy rất thuần Nhật!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {filtered.map((item) => {
                const tier = getTierInfo(item.transfer_classification)
                return (
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
                        <span style={{ fontWeight: 600, fontSize: 'var(--text-body)', color: 'var(--color-foreground)' }}>
                          {item.expression}
                        </span>
                        <Badge tone={tier.tone}>
                          {tier.icon} {tier.label}
                        </Badge>
                      </div>

                      <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)' }}>
                        Gặp {item.used_count} lần
                      </span>
                    </div>

                    {item.nuance_notes && (
                      <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)', fontStyle: 'italic' }}>
                        💡 {item.nuance_notes}
                      </div>
                    )}

                    {item.native_alternatives && item.native_alternatives.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-xs) var(--space-sm)', background: 'var(--glass-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', marginTop: '4px', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ai)', fontWeight: 600 }}>
                            ⭕ Cách người Nhật diễn đạt:
                          </span>
                          <strong style={{ color: 'var(--color-foreground)', fontSize: 'var(--text-body-sm)' }}>
                            {item.native_alternatives.join(' / ')}
                          </strong>
                        </div>

                        {onPracticeAlternative && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => onPracticeAlternative(item.expression, item.native_alternatives[0])}
                            aria-label={`Luyện viết câu với ${item.native_alternatives[0]}`}
                          >
                            Luyện viết cách này →
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
