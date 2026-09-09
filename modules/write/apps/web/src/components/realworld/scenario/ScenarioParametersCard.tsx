import type { JlptLevel, Register } from '../../../types/api'
import { Card, CardContent } from '../../ui/Card'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Select } from '../../ui/Select'
import { AIModelPicker } from '../../ai/AIModelPicker'
import { JLPT_OPTIONS } from './scenarioConstants'

interface ScenarioParametersCardProps {
  jlptLevel: JlptLevel | ''
  onJlptChange: (level: JlptLevel | '') => void
  register: Register | ''
  onRegisterChange: (reg: Register | '') => void
  difficulty: string
  onDifficultyChange: (diff: string) => void
  showAdvanced: boolean
  onToggleAdvanced: () => void
  selectedProvider: string
  selectedModel: string
  onProviderChange: (provider: string) => void
  onModelChange: (model: string) => void
  generating: boolean
  onGenerate: () => void
}

export function ScenarioParametersCard({
  jlptLevel,
  onJlptChange,
  register,
  onRegisterChange,
  difficulty,
  onDifficultyChange,
  showAdvanced,
  onToggleAdvanced,
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  generating,
  onGenerate,
}: ScenarioParametersCardProps) {
  return (
    <Card variant="default" style={{ overflow: 'hidden' }}>
      <CardContent style={{ padding: 'var(--space-md)' }}>
        {/* Step Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-sm)',
            flexWrap: 'wrap',
            gap: 'var(--space-xs)',
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
                color: 'var(--color-on-accent)',
                fontWeight: 700,
                fontSize: 'var(--text-micro)',
              }}
            >
              3
            </span>
            <h3
              style={{
                fontSize: 'var(--text-body)',
                fontWeight: 700,
                margin: 0,
                color: 'var(--color-foreground)',
              }}
            >
              Khởi tạo Nhiệm vụ & Tùy chỉnh
            </h3>
          </div>

          {/* Smart Defaults Badges Bar */}
          <div className="jw-inline jw-gap-xs" style={{ alignItems: 'center' }}>
            <Badge tone="accent">JLPT: {jlptLevel || 'Tự động'}</Badge>
            <Badge tone="neutral">
              {register
                ? register === 'casual'
                  ? 'Thân mật'
                  : register === 'polite'
                    ? 'Lịch sự'
                    : register === 'business'
                      ? 'Kính ngữ'
                      : 'Học thuật'
                : 'Chuẩn tình huống'}
            </Badge>
            <Badge tone="neutral">Mức {difficulty}/10</Badge>
            <Button
              variant="ghost"
              size="sm"
              icon={showAdvanced ? 'chevron-up' : 'settings'}
              onClick={onToggleAdvanced}
              style={{ fontSize: 'var(--text-caption)', height: '28px', padding: '0 8px' }}
            >
              {showAdvanced ? 'Thu gọn' : 'Tùy chỉnh'}
            </Button>
          </div>
        </div>

        {/* Quick 1-Touch Parameter Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: 'var(--space-md)' }}>
          {/* 1-Touch JLPT Pills */}
          <div>
            <div
              style={{
                fontSize: 'var(--text-caption)',
                fontWeight: 600,
                color: 'var(--color-foreground-secondary)',
                marginBottom: '4px',
              }}
            >
              Trình độ JLPT mục tiêu:
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { value: '', label: 'Tự động thích ứng' },
                { value: 'N5', label: 'N5 (Sơ cấp 1)' },
                { value: 'N4', label: 'N4 (Sơ cấp 2)' },
                { value: 'N3', label: 'N3 (Trung cấp)' },
                { value: 'N2', label: 'N2 (Cao cấp)' },
                { value: 'N1', label: 'N1 (Bản xứ)' },
              ].map((pill) => {
                const isActive = jlptLevel === pill.value
                return (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => onJlptChange(pill.value as JlptLevel | '')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: isActive ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.04)',
                      color: isActive ? 'var(--color-on-primary)' : 'var(--color-foreground-secondary)',
                      border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--glass-border)',
                    }}
                  >
                    {pill.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 1-Touch Register Pills */}
          <div>
            <div
              style={{
                fontSize: 'var(--text-caption)',
                fontWeight: 600,
                color: 'var(--color-foreground-secondary)',
                marginBottom: '4px',
              }}
            >
              Văn phong giao tiếp:
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { value: '', label: 'Theo chuẩn tình huống' },
                { value: 'casual', label: 'Thân mật' },
                { value: 'polite', label: 'Lịch sự' },
                { value: 'business', label: 'Kính ngữ Keigo' },
                { value: 'academic', label: 'Học thuật' },
              ].map((pill) => {
                const isActive = register === pill.value
                return (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => onRegisterChange(pill.value as Register | '')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: isActive ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.04)',
                      color: isActive ? 'var(--color-on-accent)' : 'var(--color-foreground-secondary)',
                      border: isActive ? '1px solid var(--color-accent)' : '1px solid var(--glass-border)',
                    }}
                  >
                    {pill.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Parameters */}
        {showAdvanced && (
          <div
            style={{
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border-subtle)',
              marginBottom: 'var(--space-md)',
              marginTop: 'var(--space-sm)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--space-md)',
                marginBottom: 'var(--space-md)',
              }}
            >
              <div>
                <Select
                  id="scenario-jlpt"
                  label="Trình độ mục tiêu JLPT"
                  value={jlptLevel}
                  onChange={(event) => onJlptChange(event.target.value as JlptLevel | '')}
                >
                  <option value="">AI tự động thích ứng</option>
                  {JLPT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Select
                  id="scenario-register"
                  label="Văn phong mong muốn"
                  value={register}
                  onChange={(event) => onRegisterChange(event.target.value as Register | '')}
                >
                  <option value="">Theo chuẩn tình huống (Khuyên dùng)</option>
                  <option value="casual">Thân mật (Casual / くだけた)</option>
                  <option value="polite">Lịch sự (Polite / 丁寧語)</option>
                  <option value="business">Kính ngữ Thương mại (Business Keigo / 敬語)</option>
                  <option value="academic">Trang trọng Học thuật (Formal / 論文調)</option>
                </Select>
              </div>

              <div>
                <Select
                  id="scenario-difficulty"
                  label="Độ thử thách"
                  value={difficulty}
                  onChange={(event) => onDifficultyChange(event.target.value)}
                >
                  {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                    <option key={value} value={String(value)}>
                      Mức {value}/10
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* AI Model Picker Row */}
            <AIModelPicker
              variant="inline"
              value={{ provider: selectedProvider, model: selectedModel }}
              onChange={({ provider, model }) => {
                onProviderChange(provider)
                onModelChange(model)
              }}
            />
          </div>
        )}

        {/* Main Launch CTA Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 'var(--space-xs)' }}>
          <Button
            variant="primary"
            size="lg"
            icon="sparkles"
            onClick={onGenerate}
            loading={generating}
          >
            Khởi tạo Nhiệm vụ Giao tiếp 🚀
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
