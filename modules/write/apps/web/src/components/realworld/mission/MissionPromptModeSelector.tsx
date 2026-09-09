import React from 'react'
import type { MissionTaxonomyPromptMode, PromptMode } from '../../../types/api'
import { Card, CardContent } from '../../ui/Card'
import { Icon } from '../../icons/Icon'

interface MissionPromptModeSelectorProps {
  promptModes: MissionTaxonomyPromptMode[]
  selectedMode: PromptMode
  onSelectMode: (mode: PromptMode) => void
  disabled?: boolean
}

const MODE_METADATA: Record<
  string,
  {
    code: string
    title: string
    highlight: string
    gradient: string
    levelTag: string
  }
> = {
  vietnamese_scenario: {
    code: 'A',
    title: 'Kịch bản Song ngữ (VI + JA)',
    highlight: 'Hỗ trợ gợi ý từ vựng',
    gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    levelTag: 'N5 / N4 (Nhập môn)',
  },
  japanese_scenario: {
    code: 'B',
    title: 'Kịch bản Tiếng Nhật 100%',
    highlight: 'Đắm chìm ngôn ngữ',
    gradient: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
    levelTag: 'N3 (Trung cấp)',
  },
  contextual_simulation: {
    code: 'C',
    title: 'Hộp thư In-Basket / Tin nhắn đến',
    highlight: 'Thực chiến không dịch',
    gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)',
    levelTag: 'N2 / N1 (Bản xứ)',
  },
}

export const MissionPromptModeSelector: React.FC<MissionPromptModeSelectorProps> = ({
  promptModes = [],
  selectedMode,
  onSelectMode,
  disabled = false,
}) => {
  return (
    <Card variant="default" className="mission-mode-selector" style={{ overflow: 'hidden' }}>
      <CardContent style={{ padding: 'var(--space-md)' }}>
        {/* Step Indicator Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: 'var(--space-xs)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 'var(--text-micro)',
              }}
            >
              2
            </span>
            <h3
              style={{
                fontSize: 'var(--text-body)',
                fontWeight: 700,
                margin: 0,
                color: 'var(--color-foreground)',
              }}
            >
              Chọn Chế độ Tiếp cận Đề bài (Prompt Mode)
            </h3>
          </div>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-muted)' }}>
            Giảm dần phụ thuộc dịch thuật • Kích hoạt tư duy trực tiếp bằng tiếng Nhật
          </span>
        </div>

        {/* Mode Cards Grid */}
        <div
          role="radiogroup"
          aria-label="Chọn chế độ đề bài"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-sm)',
          }}
        >
          {promptModes.map((m) => {
            const isSelected = m.mode === selectedMode
            const meta = MODE_METADATA[m.mode] || {
              code: m.mode_code || 'M',
              title: m.label_vi,
              highlight: 'Mặc định',
              gradient: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
              levelTag: m.recommended_level,
            }

            return (
              <button
                key={m.mode}
                role="radio"
                type="button"
                aria-checked={isSelected}
                onClick={() => onSelectMode(m.mode)}
                disabled={disabled}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(168, 85, 247, 0.18))'
                    : 'var(--color-surface)',
                  border: isSelected
                    ? '1.5px solid var(--color-primary)'
                    : '1px solid var(--color-border)',
                  color: 'var(--color-foreground)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isSelected
                    ? '0 0 20px rgba(99, 102, 241, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.1)'
                    : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: '130px',
                }}
              >
                <div style={{ width: '100%' }}>
                  {/* Top Bar: Code Badge + Title + Level */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: 'var(--radius-md)',
                          background: meta.gradient,
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: 'var(--text-body-sm)',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                        }}
                      >
                        {meta.code}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 'var(--text-body-sm)',
                          color: isSelected ? 'var(--color-foreground)' : 'var(--color-foreground)',
                        }}
                      >
                        {m.label_vi}
                      </span>
                    </div>

                    {isSelected && (
                      <span
                        style={{
                          color: 'var(--color-accent)',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        <Icon name="check" size={16} />
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <div
                    style={{
                      fontSize: 'var(--text-caption)',
                      color: 'var(--color-foreground-muted)',
                      lineHeight: 1.45,
                      marginBottom: '12px',
                    }}
                  >
                    {m.description_vi}
                  </div>
                </div>

                {/* Bottom Tags */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--color-border)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: isSelected ? 'var(--color-primary)' : 'var(--color-foreground-muted)',
                    }}
                  >
                    {meta.levelTag}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--color-foreground-secondary)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {meta.highlight}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
