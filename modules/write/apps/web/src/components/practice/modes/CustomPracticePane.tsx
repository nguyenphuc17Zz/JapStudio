import { useState } from 'react'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Select } from '../../ui/Select'
import { AIModelPicker } from '../../ai/AIModelPicker'
import { TopicQuickPills, type QuickTopicItem } from '../TopicQuickPills'
import type { ExerciseType, JlptLevel, Register, TargetLength } from '../../../types/api'

interface CustomPracticePaneProps {
  topic: string
  setTopic: (t: string) => void
  jlptLevel: JlptLevel | ''
  setJlptLevel: (l: JlptLevel | '') => void
  register: Register | ''
  setRegister: (r: Register | '') => void
  difficulty: string
  setDifficulty: (d: string) => void
  exerciseType: ExerciseType | ''
  setExerciseType: (t: ExerciseType | '') => void
  targetLength: TargetLength | ''
  setTargetLength: (l: TargetLength | '') => void
  generating: boolean
  onGenerateCustom: () => void
  onSaveDefault: () => void
  savedDefaultSuccess: boolean
}

export function CustomPracticePane({
  topic,
  setTopic,
  jlptLevel,
  setJlptLevel,
  register,
  setRegister,
  difficulty,
  setDifficulty,
  exerciseType,
  setExerciseType,
  targetLength,
  setTargetLength,
  generating,
  onGenerateCustom,
  onSaveDefault,
  savedDefaultSuccess,
}: CustomPracticePaneProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const handleQuickTopicSelect = (item: QuickTopicItem) => {
    setTopic(item.topic)
    if (item.jlptLevel) setJlptLevel(item.jlptLevel)
    if (item.register) setRegister(item.register)
    if (item.difficulty) setDifficulty(String(item.difficulty))
    if (item.exerciseType) setExerciseType(item.exerciseType)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* 1-Click Quick Topic Chips */}
      <TopicQuickPills
        selectedTopic={topic}
        onSelectTopic={handleQuickTopicSelect}
      />

      {/* Topic input */}
      <Input
        id="custom-topic"
        label="Chủ đề tự chọn"
        placeholder="Nhập chủ đề bạn muốn viết (ví dụ: công nghệ, anime, du lịch...)"
        value={topic}
        onChange={(event) => setTopic(event.target.value)}
      />

      {/* Visual 1-Touch Pill Selectors */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <div>
          <div className="jw-field-header" style={{ marginBottom: '6px' }}>
            <span className="jw-field-label">Trình độ JLPT</span>
          </div>
          <div className="jw-inline jw-gap-xs" style={{ flexWrap: 'wrap' }}>
            {(
              [
                { value: '', label: 'Tất cả' },
                { value: 'N5', label: 'N5' },
                { value: 'N4', label: 'N4' },
                { value: 'N3', label: 'N3' },
                { value: 'N2', label: 'N2' },
                { value: 'N1', label: 'N1' },
              ] as Array<{ value: JlptLevel | ''; label: string }>
            ).map((pill) => {
              const isActive = jlptLevel === pill.value
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setJlptLevel(pill.value)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--text-caption)',
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

        <div>
          <div className="jw-field-header" style={{ marginBottom: '6px' }}>
            <span className="jw-field-label">Ngữ điệu / Văn phong</span>
          </div>
          <div className="jw-inline jw-gap-xs" style={{ flexWrap: 'wrap' }}>
            {(
              [
                { value: '', label: 'Tất cả' },
                { value: 'casual', label: 'Thân mật' },
                { value: 'polite', label: 'Lịch sự' },
                { value: 'business', label: 'Kinh doanh' },
              ] as Array<{ value: Register | ''; label: string }>
            ).map((pill) => {
              const isActive = register === pill.value
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setRegister(pill.value)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--text-caption)',
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

      {/* Advanced Options Collapsible */}
      <div style={{ marginTop: 'var(--space-xs)' }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAdvancedOpen((v) => !v)}
          icon={advancedOpen ? 'chevron-up' : 'settings'}
          style={{ fontSize: 'var(--text-caption)' }}
        >
          {advancedOpen ? 'Ẩn tùy chọn nâng cao' : 'Tùy chọn nâng cao'}
        </Button>
      </div>

      {advancedOpen ? (
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
            <div style={{ flex: 1, minWidth: 160 }}>
              <Select
                id="custom-jlpt"
                label="Trình độ JLPT"
                value={jlptLevel}
                onChange={(event) => setJlptLevel(event.target.value as JlptLevel | '')}
              >
                <option value="">Ngẫu nhiên</option>
                <option value="N5">N5</option>
                <option value="N4">N4</option>
                <option value="N3">N3</option>
                <option value="N2">N2</option>
                <option value="N1">N1</option>
              </Select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Select
                id="custom-register"
                label="Ngữ điệu"
                value={register}
                onChange={(event) => setRegister(event.target.value as Register | '')}
              >
                <option value="">Ngẫu nhiên</option>
                <option value="casual">Thân mật</option>
                <option value="polite">Lịch sự</option>
                <option value="business">Kinh doanh</option>
              </Select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Select
                id="custom-difficulty"
                label="Độ khó"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
              >
                <option value="">Ngẫu nhiên</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                  <option key={level} value={String(level)}>
                    Độ khó {level}/10
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="jw-inline jw-gap-md" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Select
                id="custom-extype"
                label="Loại bài tập"
                value={exerciseType}
                onChange={(event) => setExerciseType(event.target.value as ExerciseType | '')}
              >
                <option value="">Ngẫu nhiên</option>
                <option value="sentence_translation">Dịch câu</option>
                <option value="multi_sentence_translation">Dịch nhiều câu</option>
                <option value="paragraph_translation">Dịch đoạn văn</option>
                <option value="free_writing">Viết tự do</option>
                <option value="register_challenge">Thử thách ngữ điệu</option>
              </Select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Select
                id="custom-length"
                label="Độ dài"
                value={targetLength}
                onChange={(event) => setTargetLength(event.target.value as TargetLength | '')}
              >
                <option value="">Ngẫu nhiên</option>
                <option value="short_sentence">1 câu ngắn</option>
                <option value="sentence">1 câu</option>
                <option value="multi_sentence">2–3 câu</option>
                <option value="paragraph">Đoạn văn</option>
                <option value="long_writing">Bài viết dài</option>
              </Select>
            </div>
          </div>

          {/* AI Model Picker */}
          <AIModelPicker variant="inline" label="Mô hình AI tạo đề" />
        </div>
      ) : null}

      {/* Live Preview Summary Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface-subtle)',
          border: '1px solid var(--color-border-subtle)',
          marginTop: 'var(--space-sm)',
          flexWrap: 'wrap',
          gap: 'var(--space-xs)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-foreground-muted)' }}>
            AI sẽ tạo bài:
          </span>
          <Badge tone="accent">
            {exerciseType === 'paragraph_translation'
              ? 'Dịch đoạn văn'
              : exerciseType === 'multi_sentence_translation'
                ? 'Dịch nhiều câu'
                : exerciseType === 'free_writing'
                  ? 'Viết tự do'
                  : exerciseType === 'register_challenge'
                    ? 'Thử thách ngữ điệu'
                    : 'Dịch câu'}
          </Badge>
          <Badge tone="info">
            {jlptLevel ? `JLPT ${jlptLevel}` : 'JLPT tự động'}
          </Badge>
          <Badge tone="neutral">
            {register === 'polite'
              ? 'Lịch sự (です・ます)'
              : register === 'casual'
                ? 'Thân mật (Thể ngắn)'
                : register === 'business'
                  ? 'Kính ngữ công sở'
                  : 'Văn phong tự nhiên'}
          </Badge>
          {topic.trim() && (
            <Badge tone="info">
              Chủ đề: {topic.trim()}
            </Badge>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSaveDefault}
          title="Lưu cấu hình này làm mặc định cho các lần sau"
        >
          {savedDefaultSuccess ? '✓ Đã lưu mặc định' : 'Lưu làm mặc định'}
        </Button>
      </div>

      {/* Action Submit */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 'var(--space-xs)',
          paddingTop: 'var(--space-sm)',
          borderTop: '1px solid var(--color-border-subtle)',
        }}
      >
        <Button
          onClick={onGenerateCustom}
          disabled={generating}
          icon="write"
          size="md"
          variant="primary"
        >
          {generating ? 'Đang tạo...' : 'Tạo bài tập'}
        </Button>
      </div>
    </div>
  )
}
