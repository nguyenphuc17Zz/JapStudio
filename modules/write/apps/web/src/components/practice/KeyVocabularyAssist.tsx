import { useState } from 'react'
import type { VocabularyHint } from '../../types/api'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardContent } from '../ui/Card'
import { FuriganaText } from '../ui/FuriganaText'
import { useVocabularyLookup } from '../../context/VocabularyLookupContext'
import { sound } from '../../services/sound'

export interface KeyVocabularyAssistProps {
  vocabulary?: VocabularyHint[] | null
  className?: string
  onInsertVocabulary?: (expression: string) => void
}

export function KeyVocabularyAssist({
  vocabulary,
  className,
  onInsertVocabulary,
}: KeyVocabularyAssistProps) {
  const [expanded, setExpanded] = useState(true)
  const [insertedExpr, setInsertedExpr] = useState<string | null>(null)

  let insertTextFn: ((text: string) => boolean) | undefined
  try {
    const vocabContext = useVocabularyLookup()
    insertTextFn = vocabContext.insertText
  } catch {
    // Component rendered outside VocabularyLookupProvider
  }

  const handleInsert = (expression: string) => {
    sound.playWashiStroke()
    if (onInsertVocabulary) {
      onInsertVocabulary(expression)
    } else if (insertTextFn) {
      insertTextFn(expression)
    }
    setInsertedExpr(expression)
    setTimeout(() => setInsertedExpr((curr) => (curr === expression ? null : curr)), 1500)
  }

  if (!vocabulary || vocabulary.length === 0) {
    return null
  }

  return (
    <Card
      variant="ai"
      className={className}
      style={{
        marginTop: 'var(--space-sm)',
        marginBottom: 'var(--space-md)',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(59, 130, 246, 0.04))',
        border: '1px solid rgba(168, 85, 247, 0.25)',
      }}
    >
      <CardContent style={{ padding: '12px 16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <strong style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground)' }}>
              Từ vựng then chốt trong câu
            </strong>
            <Badge tone="accent">
              {vocabulary.length} từ
            </Badge>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            style={{ fontSize: 12, height: 26, padding: '0 8px' }}
          >
            {expanded ? '🙈 Ẩn từ vựng' : '👁️ Hiện từ vựng'}
          </Button>
        </div>

        {expanded ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '10px',
              marginTop: '12px',
            }}
          >
            {vocabulary.map((item, idx) => {
              const isJustInserted = insertedExpr === item.expression
              return (
                <div
                  key={`${item.expression}-${idx}`}
                  onClick={() => handleInsert(item.expression)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleInsert(item.expression)
                    }
                  }}
                  title="Nhấn để chèn từ này vào bài viết"
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: isJustInserted
                      ? 'rgba(168, 85, 247, 0.18)'
                      : 'rgba(255, 255, 255, 0.04)',
                    border: isJustInserted
                      ? '1px solid var(--color-accent)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px' }}>
                    <FuriganaText
                      text={item.expression}
                      reading={item.reading}
                      style={{
                        fontFamily: 'var(--font-japanese)',
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'var(--nihon-kikyo, #a855f7)',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: isJustInserted ? 'var(--nihon-matcha, #10b981)' : 'var(--color-foreground-muted)',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(255, 255, 255, 0.06)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isJustInserted ? '✓ Đã chèn' : '＋ Chèn'}
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--color-foreground-secondary)' }}>
                    {item.meaning_vi}
                  </span>
                  {item.level ? (
                    <div style={{ marginTop: '2px' }}>
                      <Badge tone="neutral">
                        {item.level}
                      </Badge>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
