import React, { useMemo } from 'react'
import type { DiffChunk, DiffExplanation, BadgeTone } from '../../types/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { computeJapaneseSentenceDiff } from '../../lib/myersDiff'

interface LinguisticDiffViewerProps {
  diff: DiffExplanation
  title?: string
  className?: string
}

export const LinguisticDiffViewer: React.FC<LinguisticDiffViewerProps> = ({
  diff,
  title = 'Phân tích biến đổi & Ngữ pháp (Linguistic Diff)',
  className = '',
}) => {
  const getImprovementTone = (status: string): BadgeTone => {
    switch (status) {
      case 'significantly_improved':
      case 'improved':
        return 'success'
      case 'partially_improved':
        return 'warning'
      case 'regressed':
        return 'error'
      default:
        return 'neutral'
    }
  }

  const getImprovementLabel = (status: string) => {
    switch (status) {
      case 'significantly_improved':
        return 'Cải thiện vượt bậc'
      case 'improved':
        return 'Cải thiện tốt'
      case 'partially_improved':
        return 'Cải thiện một phần'
      case 'regressed':
        return 'Cần điều chỉnh lại'
      default:
        return 'Không đổi'
    }
  }

  const displayChunks = useMemo(() => {
    if (diff.chunks && diff.chunks.length > 0) return diff.chunks
    if (diff.before && diff.after) return computeJapaneseSentenceDiff(diff.before, diff.after)
    return []
  }, [diff.chunks, diff.before, diff.after])

  return (
    <Card variant="ai" className={`jw-diff-viewer ${className}`}>
      <CardHeader
        title={title}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
            <Badge tone={getImprovementTone(diff.improvement_status)}>
              {getImprovementLabel(diff.improvement_status)}
            </Badge>
            {diff.quality_delta !== 0 && (
              <Badge tone={diff.quality_delta > 0 ? 'success' : 'error'}>
                {diff.quality_delta > 0 ? `+${diff.quality_delta}` : `${diff.quality_delta}`} điểm chất lượng
              </Badge>
            )}
          </div>
        }
      />
      <CardContent>
        {/* Visual Diff Stream */}
        <div
          style={{
            padding: 'var(--space-md)',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            marginBottom: 'var(--space-md)',
            fontSize: 'var(--text-body)',
            lineHeight: 1.8,
          }}
        >
          <div style={{ marginBottom: 'var(--space-xs)', color: 'var(--color-foreground-muted)', fontSize: 'var(--text-caption)' }}>
            Văn bản sau khi sửa đổi:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
            {displayChunks.map((chunk: DiffChunk, idx: number) => {
              if (chunk.type === 'equal') {
                return (
                  <span key={idx} style={{ color: 'var(--color-foreground)' }}>
                    {chunk.after_text || chunk.before_text}
                  </span>
                )
              }
              if (chunk.type === 'insert') {
                return (
                  <span
                    key={idx}
                    title={chunk.rationale_vi}
                    style={{
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: 'var(--color-success)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      borderBottom: '2px solid var(--color-success)',
                      fontWeight: 600,
                    }}
                  >
                    +{chunk.after_text}
                  </span>
                )
              }
              if (chunk.type === 'delete') {
                return (
                  <span
                    key={idx}
                    title={chunk.rationale_vi}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: 'var(--color-danger)',
                      textDecoration: 'line-through',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      opacity: 0.8,
                    }}
                  >
                    {chunk.before_text}
                  </span>
                )
              }
              if (chunk.type === 'replace') {
                return (
                  <span
                    key={idx}
                    title={chunk.rationale_vi}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(99, 102, 241, 0.12)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                    }}
                  >
                    <span style={{ textDecoration: 'line-through', color: 'var(--color-danger)', opacity: 0.75 }}>
                      {chunk.before_text}
                    </span>
                    <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                      → {chunk.after_text}
                    </span>
                  </span>
                )
              }
              return null
            })}
          </div>
        </div>

        {/* Detailed Grammatical Rationales */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, color: 'var(--color-foreground-secondary)' }}>
            Lý do ngữ pháp cho từng chỉnh sửa:
          </div>
          {diff.chunks
            .filter((c) => c.type !== 'equal' && c.rationale_vi)
            .map((chunk, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-sm)',
                  padding: 'var(--space-sm) var(--space-md)',
                  background: 'var(--color-surface-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: `3px solid ${
                    chunk.type === 'insert'
                      ? 'var(--color-success)'
                      : chunk.type === 'delete'
                      ? 'var(--color-danger)'
                      : 'var(--color-primary)'
                  }`,
                }}
              >
                <div style={{ fontWeight: 600, minWidth: '120px', fontSize: 'var(--text-body-sm)' }}>
                  {chunk.type === 'delete' && `Xóa「${chunk.before_text}」`}
                  {chunk.type === 'insert' && `Thêm「${chunk.after_text}」`}
                  {chunk.type === 'replace' && `「${chunk.before_text}」→「${chunk.after_text}」`}
                </div>
                <div style={{ color: 'var(--color-foreground-secondary)', fontSize: 'var(--text-body-sm)' }}>
                  {chunk.rationale_vi}
                </div>
              </div>
            ))}
          {diff.summary_rationale_vi && (
            <div
              style={{
                marginTop: 'var(--space-xs)',
                padding: 'var(--space-sm) var(--space-md)',
                background: 'rgba(99, 102, 241, 0.06)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(99, 102, 241, 0.15)',
                fontSize: 'var(--text-body-sm)',
                color: 'var(--color-foreground)',
              }}
            >
              <strong>Tổng kết:</strong> {diff.summary_rationale_vi}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
