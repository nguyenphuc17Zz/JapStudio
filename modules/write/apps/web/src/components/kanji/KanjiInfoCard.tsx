import React from 'react'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { FuriganaText } from '../ui/FuriganaText'
import type { KanjiDetail } from '../../services/kanjiService'

export interface KanjiInfoCardProps {
  info: KanjiDetail
  onKanjiClick?: (char: string) => void
}

export const KanjiInfoCard: React.FC<KanjiInfoCardProps> = ({ info, onKanjiClick }) => {
  return (
    <Card className="jw-kanji-info-card" variant="default">
      <CardHeader
        title={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
              <span
                style={{
                  fontSize: 'var(--text-title)',
                  fontWeight: 800,
                  color: 'var(--nihon-kin)',
                  letterSpacing: '0.05em',
                }}
              >
                {info.hanViet}
              </span>
              <Badge tone="accent">{info.jlpt}</Badge>
              <Badge tone="neutral">{info.strokeCount} nét</Badge>
            </div>
            <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, color: 'var(--color-foreground)', marginTop: 2 }}>
              {info.meaning}
            </div>
            <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
              Bộ thủ: <strong style={{ color: 'var(--color-foreground)' }}>{info.radical}</strong>
              {info.grade && <span> · Cấp: {info.grade}</span>}
            </div>
          </div>
        }
        actions={
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.18), rgba(251, 191, 36, 0.12))',
              border: '1.5px solid rgba(255, 255, 255, 0.16)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 0 14px rgba(139, 92, 246, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: 44,
                fontFamily: 'var(--font-japanese)',
                fontWeight: 800,
                lineHeight: 1,
                color: '#ffffff',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.8), 0 0 16px rgba(139, 92, 246, 0.5)',
              }}
            >
              {info.kanji}
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--nihon-kin)',
                marginTop: 2,
                textTransform: 'uppercase',
              }}
            >
              Chữ mẫu
            </div>
          </div>
        }
      />
      <CardContent>

        {/* Onyomi & Kunyomi */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-xs)',
            background: 'var(--color-surface-subtle)',
            padding: 'var(--space-xs) var(--space-sm)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-sm)',
          }}
        >
          <div>
            <div style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)', fontWeight: 700 }}>
              ÂM ON (Onyomi)
            </div>
            <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, color: '#38bdf8' }}>
              {info.onyomi.join(' · ') || '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)', fontWeight: 700 }}>
              ÂM KUN (Kunyomi)
            </div>
            <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, color: '#10b981' }}>
              {info.kunyomi.join(' · ') || '—'}
            </div>
          </div>
        </div>

        {/* Mnemonic / Chiết tự ghi nhớ */}
        {info.mnemonic && (
          <div
            style={{
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-xs) var(--space-sm)',
              marginBottom: 'var(--space-sm)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--nihon-kikyo)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              💡 CHIẾT TỰ GHI NHỚ
            </div>
            <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)', marginTop: 2 }}>
              {info.mnemonic}
            </div>
          </div>
        )}

        {/* Common Jukugo Compounds */}
        {info.compounds && info.compounds.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 'var(--text-caption)',
                fontWeight: 700,
                color: 'var(--color-foreground-secondary)',
                marginBottom: 'var(--space-xs)',
              }}
            >
              Từ vựng ghép thông dụng (熟語):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {info.compounds.map((c, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    fontSize: 'var(--text-caption)',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontFamily: 'var(--font-japanese)',
                        fontWeight: 700,
                        color: 'var(--color-foreground)',
                        marginRight: 6,
                        cursor: onKanjiClick ? 'pointer' : 'default',
                      }}
                      onClick={() => onKanjiClick && onKanjiClick(c.word)}
                    >
                      <FuriganaText text={c.word} reading={c.reading} />
                    </span>
                  </div>
                  <span style={{ color: 'var(--color-foreground-secondary)', fontSize: 'var(--text-micro)' }}>
                    {c.meaning}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
