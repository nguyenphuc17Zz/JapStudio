import React, { useState } from 'react'
import type { RealWorldMission } from '../../../types/api'
import { Card, CardContent, CardHeader } from '../../ui/Card'
import { Button } from '../../ui/Button'

interface MissionBriefingCardProps {
  mission: RealWorldMission
  onToggleVocab?: () => void
  showVocab?: boolean
}

export const MissionBriefingCard: React.FC<MissionBriefingCardProps> = ({
  mission,
  onToggleVocab,
  showVocab = false,
}) => {
  const [langTab, setLangTab] = useState<'vi' | 'ja'>(
    mission.prompt_mode === 'japanese_scenario' ? 'ja' : 'vi'
  )

  const registerLabels: Record<string, string> = {
    casual: 'Thân mật (Casual / くだけた)',
    polite: 'Lịch sự (Polite / 丁寧語)',
    business: 'Kính ngữ Thương mại (Business Keigo / 敬語)',
    academic: 'Trang trọng Học thuật (Formal / 論文調)',
  }

  return (
    <Card variant="ai" className="mission-briefing-card">
      <CardHeader
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 'var(--text-title)' }}>
              Nhiệm vụ Giao tiếp: {mission.objective}
            </span>
          </div>
        }
        actions={
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span
              style={{
                fontSize: 'var(--text-micro)',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(99, 102, 241, 0.2)',
                color: 'var(--color-primary)',
                border: '1px solid var(--color-primary)',
              }}
            >
              {mission.jlpt_level}
            </span>
            <span
              style={{
                fontSize: 'var(--text-micro)',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.06)',
                color: 'var(--color-foreground-secondary)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              {registerLabels[mission.target_register] || mission.target_register}
            </span>
          </div>
        }
      />

      <CardContent>
        {/* Role & Recipient Context Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-sm)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface-subtle)',
            border: '1px solid var(--color-border)',
            marginBottom: 'var(--space-md)',
          }}
        >
          <div>
            <div style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)', textTransform: 'uppercase' }}>
              Vai trò của bạn (Role)
            </div>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground)', marginTop: '2px' }}>
              🧑‍💻 {mission.role}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)', textTransform: 'uppercase' }}>
              Người nhận (Recipient)
            </div>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground)', marginTop: '2px' }}>
              👤 {mission.recipient}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)', textTransform: 'uppercase' }}>
              Mối quan hệ (Relationship)
            </div>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground)', marginTop: '2px' }}>
              {mission.relationship}
            </div>
          </div>
        </div>

        {/* Ecosystem Shortcuts Bar */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: 'var(--space-md)',
            paddingBottom: 'var(--space-xs)',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            href="/kanji"
            aria-label="Luyện Kanji trong nhiệm vụ"
            style={{ fontSize: '11px', padding: '0 8px', height: '26px' }}
          >
            Luyện Kanji
          </Button>
          <Button
            variant="ghost"
            size="sm"
            href="/vocabulary"
            aria-label="Kho từ vựng chuyên ngành"
            style={{ fontSize: '11px', padding: '0 8px', height: '26px' }}
          >
            Kho từ vựng
          </Button>
        </div>

        {/* Mode C In-Basket Message (if present) */}
        {mission.incoming_message && (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
              marginBottom: 'var(--space-md)',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
                borderBottom: '1px solid var(--color-border-subtle)',
                paddingBottom: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-caption)', color: 'var(--color-ai)' }}>
                  Tin nhắn đến từ {mission.recipient} (In-Basket Message)
                </span>
              </div>
              <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)' }}>
                Vừa nhận • Cần trả lời
              </span>
            </div>

            <div
              style={{
                fontSize: 'var(--text-body-sm)',
                lineHeight: 1.6,
                color: 'var(--color-foreground)',
                fontFamily: 'var(--font-sans)',
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '3px solid var(--color-ai)',
              }}
            >
              {mission.incoming_message}
            </div>
          </div>
        )}

        {/* Situation / Context with Language Tabs */}
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
              Bối cảnh tình huống thực tế:
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <Button
                variant={langTab === 'vi' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setLangTab('vi')}
                style={{ padding: '2px 8px', fontSize: 'var(--text-micro)', height: '24px' }}
              >
                Tiếng Việt
              </Button>
              {mission.context_ja && (
                <Button
                  variant={langTab === 'ja' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setLangTab('ja')}
                  style={{ padding: '2px 8px', fontSize: 'var(--text-micro)', height: '24px' }}
                >
                  日本語 (Japanese)
                </Button>
              )}
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--text-body-sm)',
              lineHeight: 1.6,
              color: 'var(--color-foreground)',
            }}
          >
            {langTab === 'ja' && mission.context_ja ? (
              <div>
                <p style={{ margin: 0, marginBottom: '6px' }}>{mission.situation_ja}</p>
                <p style={{ margin: 0, color: 'var(--color-foreground-secondary)' }}>{mission.context_ja}</p>
              </div>
            ) : (
              <div>
                <p style={{ margin: 0, marginBottom: '6px' }}>{mission.situation_vi}</p>
                <p style={{ margin: 0, color: 'var(--color-foreground-secondary)' }}>{mission.context_vi}</p>
              </div>
            )}
          </div>
        </div>

        {/* Required Points & Constraints Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-md)',
          }}
        >
          {/* Required Information */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: 'var(--text-caption)',
                color: 'var(--color-primary)',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>📋</span>
              <span>Thông tin bắt buộc phải nêu ({mission.required_points.length}):</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: 'var(--text-caption)', lineHeight: 1.5 }}>
              {mission.required_points.map((rp) => (
                <li key={rp.id} style={{ color: 'var(--color-foreground)', marginBottom: '4px' }}>
                  {rp.description}
                </li>
              ))}
            </ul>
          </div>

          {/* Constraints & Rules */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(234, 179, 8, 0.05)',
              border: '1px solid rgba(234, 179, 8, 0.2)',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: 'var(--text-caption)',
                color: '#eab308',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>⚠️</span>
              <span>Quy tắc & Ràng buộc giao tiếp:</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: 'var(--text-caption)', lineHeight: 1.5 }}>
              {mission.constraints.map((c, i) => (
                <li key={i} style={{ color: 'var(--color-foreground)', marginBottom: '4px' }}>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Vocabulary Helper Toggle & Drawer */}
        {mission.optional_vocabulary && mission.optional_vocabulary.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleVocab}
                style={{
                  fontSize: 'var(--text-caption)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>📖</span>
                <span>
                  {showVocab ? 'Ẩn từ vựng gợi ý' : `Xem gợi ý từ vựng & cấu trúc (${mission.optional_vocabulary.length})`}
                </span>
              </Button>
            </div>

            {showVocab && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 'var(--space-xs)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-subtle)',
                  border: '1px solid var(--color-border)',
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                {mission.optional_vocabulary.map((v, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-body-sm)', color: 'var(--color-primary)' }}>
                        {v.word}
                      </span>
                      <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)' }}>
                        【{v.reading}】
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-secondary)', marginTop: '2px' }}>
                      {v.meaning}
                    </div>
                    {v.example && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-foreground-muted)',
                          marginTop: '4px',
                          fontStyle: 'italic',
                          lineHeight: 1.3,
                        }}
                      >
                        Ví dụ: {v.example}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
