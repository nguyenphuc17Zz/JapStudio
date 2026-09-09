import type { SimulationMode, WritingScenario } from '../../../types/api'
import { Button } from '../../ui/Button'
import { AIModelPicker } from '../../ai/AIModelPicker'
import { ScenarioMeta } from '../ScenarioMeta'
import { ScenarioObjective } from '../ScenarioObjective'
import { LoadingSpinner } from '../../LoadingSpinner'
import { cx } from '../../../lib/cx'

export interface SimulationSetupProps {
  scenario: WritingScenario | null
  scenarioLoading: boolean
  mode: SimulationMode
  onModeChange: (mode: SimulationMode) => void
  starting: boolean
  error: string | null
  onStart: () => void
  onGenerateRandom?: () => void
}

const MODES: Array<{
  id: SimulationMode
  title: string
  description: string
}> = [
  {
    id: 'guided',
    title: 'Có hướng dẫn',
    description: 'AI phản hồi ngắn gọn sau mỗi câu trả lời của bạn, kèm điểm và gợi ý cải thiện.',
  },
  {
    id: 'immersive',
    title: 'Đắm chìm',
    description: 'Không có phản hồi giữa chừng — trải nghiệm như cuộc trò chuyện thật, tổng kết đầy đủ khi kết thúc.',
  },
]

export function SimulationSetup({
  scenario,
  scenarioLoading,
  mode,
  onModeChange,
  starting,
  error,
  onStart,
  onGenerateRandom,
}: SimulationSetupProps) {
  return (
    <div className="jw-sim-setup">
      <p className="jw-rw-eyebrow">MÔ PHỎNG GIAO TIẾP</p>
      <h2 className="jw-sim-setup-title">Trò chuyện trong tình huống thực tế</h2>
      <p className="jw-sim-setup-sub">
        AI đóng vai người đối thoại. Bạn trả lời bằng tiếng Nhật qua nhiều lượt, và AI phản hồi
        theo tình huống. Chọn một tình huống để bắt đầu.
      </p>

      {scenarioLoading ? (
        <LoadingSpinner label="Đang tải tình huống..." />
      ) : scenario ? (
        <div className="jw-sim-setup-scenario">
          <ScenarioMeta scenario={scenario} />
          <ScenarioObjective scenario={scenario} />
        </div>
      ) : onGenerateRandom ? (
        <div
          style={{
            margin: 'var(--space-md) 0',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface-subtle)',
            border: '1px dashed var(--color-border)',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: '0 0 var(--space-xs)', fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground-secondary)' }}>
            Chưa có tình huống nào được chọn. Hãy tạo ngẫu nhiên một tình huống thực tế bằng AI để bắt đầu ngay!
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: 'var(--space-sm)' }}>
            <Button
              variant="secondary"
              size="sm"
              icon="sparkles"
              onClick={onGenerateRandom}
              aria-label="Tạo tình huống ngẫu nhiên"
            >
              Tạo nhanh tình huống bằng AI
            </Button>
            <Button
              variant="ghost"
              size="sm"
              href="/scenario"
              aria-label="Chọn tình huống theo danh mục"
            >
              Chọn theo danh mục (Công sở, Đời sống...) →
            </Button>
          </div>
        </div>
      ) : null}

      <fieldset className="jw-sim-mode-picker">
        <legend>Chế độ chơi</legend>
        <div className="jw-sim-mode-cards">
          {MODES.map((option) => (
            <button
              key={option.id}
              type="button"
              className={cx('jw-sim-mode-card', mode === option.id && 'jw-sim-mode-card--active')}
              onClick={() => onModeChange(option.id)}
              aria-pressed={mode === option.id}
            >
              <strong>{option.title}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div style={{ margin: 'var(--space-md) 0' }}>
        <AIModelPicker variant="inline" label="Mô hình AI đối thoại & chấm điểm" />
      </div>

      <div className="jw-sim-setup-actions">
        <Button icon="send" onClick={onStart} loading={starting} disabled={!scenario}>
          {starting ? 'Đang bắt đầu...' : 'Bắt đầu mô phỏng'}
        </Button>
      </div>

      {error ? <p className="jw-sim-error">{error}</p> : null}
    </div>
  )
}