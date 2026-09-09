import { useState } from 'react'
import { Button } from '../../ui/Button'
import { Select } from '../../ui/Select'
import { AIModelPicker } from '../../ai/AIModelPicker'
import type { Register } from '../../../types/api'

interface RandomPracticePaneProps {
  randomRegister: Register | ''
  setRandomRegister: (r: Register | '') => void
  randomDifficulty: string
  setRandomDifficulty: (d: string) => void
  generating: boolean
  onGenerateRandom: () => void
}

export function RandomPracticePane({
  randomRegister,
  setRandomRegister,
  randomDifficulty,
  setRandomDifficulty,
  generating,
  onGenerateRandom,
}: RandomPracticePaneProps) {
  const [randomAdvancedOpen, setRandomAdvancedOpen] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div
        style={{
          padding: '16px 18px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-success-muted)',
          border: '1px solid var(--color-success-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-sm)',
        }}
      >
        <p className="jw-text--muted jw-text--sm" style={{ margin: 0, color: 'var(--color-foreground-secondary)' }}>
          <strong>Khởi động siêu tốc:</strong> AI sẽ tự động chọn một chủ đề bất ngờ phù hợp với trình độ để bạn luyện tập tức thì.
        </p>
        <Button
          variant="ghost"
          size="sm"
          icon={randomAdvancedOpen ? 'chevron-up' : 'settings'}
          onClick={() => setRandomAdvancedOpen((v) => !v)}
          style={{ fontSize: 'var(--text-caption)' }}
        >
          {randomAdvancedOpen ? 'Thu gọn' : 'Tùy biến nhanh'}
        </Button>
      </div>

      {randomAdvancedOpen && (
        <div
          style={{
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface-subtle)',
            border: '1px solid var(--color-border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)',
          }}
        >
          <div className="jw-inline jw-gap-md" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Select
                id="random-register"
                label="Ngữ điệu"
                value={randomRegister}
                onChange={(event) => setRandomRegister(event.target.value as Register | '')}
              >
                <option value="">Bất kỳ</option>
                <option value="casual">Thân mật</option>
                <option value="polite">Lịch sự</option>
                <option value="business">Kinh doanh</option>
              </Select>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Select
                id="random-difficulty"
                label="Độ khó"
                value={randomDifficulty}
                onChange={(event) => setRandomDifficulty(event.target.value)}
              >
                <option value="">Bất kỳ</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                  <option key={level} value={String(level)}>
                    Độ khó {level}/10
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <AIModelPicker variant="inline" label="Mô hình AI" />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-xs)' }}>
        <Button
          onClick={onGenerateRandom}
          disabled={generating}
          icon="sparkles"
          size="lg"
          variant="primary"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-on-accent)',
            fontWeight: 700,
            border: 'none',
            boxShadow: 'var(--shadow-sm)',
            padding: '0 28px',
          }}
        >
          {generating ? 'Đang tạo...' : 'Tạo bài tập ngẫu nhiên'}
        </Button>
      </div>
    </div>
  )
}
