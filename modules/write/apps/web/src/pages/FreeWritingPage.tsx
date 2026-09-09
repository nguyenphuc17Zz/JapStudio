import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { PageContainer } from '../components/layout/PageContainer'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { WritingStudio } from '../components/writing/studio/WritingStudio'
import { Spinner } from '../components/ui/Spinner'
import { AIModelPicker } from '../components/ai/AIModelPicker'
import { useAIProvider } from '../context/AIProviderContext'
import { api } from '../services/api'
import type {
  Exercise,
  Register,
  TargetLength,
  WritingScenario,
} from '../types/api'

const EMPTY_PREFERENCE = ''

export default function FreeWritingPage() {
  const { selectedProvider, selectedModel } = useAIProvider()
  const [topic, setTopic] = useState('')
  const [register, setRegister] = useState<Register | ''>(EMPTY_PREFERENCE)
  const [targetLength, setTargetLength] = useState<TargetLength | ''>(EMPTY_PREFERENCE)

  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [current, setCurrent] = useState<Exercise | null>(null)
  const [scenario, setScenario] = useState<WritingScenario | null>(null)

  const [bootLoading, setBootLoading] = useState(false)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const exerciseId = searchParams.get('exercise')
    if (!exerciseId) return
    let cancelled = false
    setBootLoading(true)
    void (async () => {
      try {
        const exercise = await api.getExercise(exerciseId)
        if (cancelled) return
        setCurrent(exercise)
        const scenarioId = searchParams.get('scenario')
        if (scenarioId) {
          const loaded = await api.getScenario(scenarioId)
          if (!cancelled) setScenario(loaded)
        }
      } catch (err) {
        if (!cancelled) {
          setGenerationError(
            err instanceof Error ? err.message : 'Không thể tải đề tài viết',
          )
        }
      } finally {
        if (!cancelled) setBootLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const generate = async () => {
    setGenerating(true)
    setGenerationError(null)
    try {
      const payload: import('../types/api').ExerciseGenerationRequest = {
        exercise_type: 'free_writing',
        register: register || undefined,
        target_length: targetLength || undefined,
        provider: selectedProvider || undefined,
        model: selectedModel || undefined,
      }
      if (topic.trim()) {
        payload.topic = topic.trim()
      }
      const exercise = await api.generateExercise(payload)
      setCurrent(exercise)
      setScenario(null)
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Không thể tạo đề tài')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <PageContainer size="wide">
      {!current && (
        <PageHeader
          title="Viết tự do"
          description="Nhận đề tài từ AI và luyện viết tiếng Nhật tự do."
        />
      )}

      {bootLoading ? (
        <div className="jw-page-loading">
          <Spinner size={32} />
          <p className="jw-text--muted jw-text--sm">Đang tải đề tài viết...</p>
        </div>
      ) : current ? (
        <WritingStudio
          exercise={current}
          scenario={scenario}
          generating={generating}
          onNewTopic={generate}
          newTopicLabel={scenario ? 'Thử lại' : undefined}
        />
      ) : (
        <Card className="jw-free-writing-setup" variant="elevated">
          <CardContent>
            <div className="jw-free-writing-intro">
              <h2 className="jw-section-title">Tạo đề tài viết tự do</h2>
              <p className="jw-text--muted jw-text--sm">
                AI sẽ đưa ra hướng dẫn bằng tiếng Việt cùng độ dài và ngữ điệu mục tiêu.
                Bạn viết tự do bằng tiếng Nhật theo phong cách của riêng mình.
              </p>
            </div>

            {/* Custom Topic Input */}
            <div style={{ marginTop: 'var(--space-sm)' }}>
              <Input
                id="fw-topic"
                label="Chủ đề tự chọn (tùy chọn)"
                placeholder="Nhập chủ đề bạn muốn viết (ví dụ: Chuyến du lịch Kyoto, Phỏng vấn xin việc...)"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            {/* Inspiration Chips */}
            <div style={{ marginTop: 'var(--space-xs)', marginBottom: 'var(--space-md)' }}>
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-muted)', marginBottom: '6px' }}>
                Hoặc bấm chọn nhanh gợi ý:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { icon: '🗾', text: 'Một chuyến đi đáng nhớ ở Nhật Bản' },
                  { icon: '💼', text: 'Giới thiệu bản thân & Định hướng nghề nghiệp' },
                  { icon: '☕', text: 'Thói quen & Sở thích vào cuối tuần' },
                  { icon: '🌸', text: 'Kỷ niệm sâu sắc nhất trong cuộc sống' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTopic(item.text)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: topic === item.text ? 'var(--color-surface-selected)' : 'var(--color-surface-subtle)',
                      border: topic === item.text ? '1px solid var(--color-primary)' : '1px solid var(--color-border-subtle)',
                      fontSize: '12px',
                      color: topic === item.text ? 'var(--color-primary)' : 'var(--color-foreground-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.text}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="jw-free-writing-controls" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>

                <div className="jw-inline jw-gap-md" style={{ flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <Select
                      id="fw-register"
                      label="Ngữ điệu"
                      value={register}
                      onChange={(e) => setRegister(e.target.value as Register | '')}
                    >
                      <option value="">AI tự chọn</option>
                      <option value="casual">Thân mật</option>
                      <option value="polite">Lịch sự</option>
                      <option value="business">Kinh doanh</option>
                    </Select>
                  </div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <Select
                      id="fw-length"
                      label="Độ dài"
                      value={targetLength}
                      onChange={(e) => setTargetLength(e.target.value as TargetLength | '')}
                    >
                      <option value="">AI tự chọn</option>
                      <option value="paragraph">Đoạn văn (80–150 chữ)</option>
                      <option value="long_writing">Bài viết dài (150–300+ chữ)</option>
                    </Select>
                  </div>
                </div>
              </div>
              <AIModelPicker variant="inline" label="Mô hình AI" />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-xs)' }}>
                <Button
                  onClick={() => void generate()}
                  loading={generating}
                  icon="write"
                  size="md"
                >
                  Tạo đề tài
                </Button>
              </div>
            </div>
            {generationError && (
              <div className="jw-mt-md">
                <Alert tone="error" title="Không thể tạo đề lúc này.">
                  {generationError}
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}