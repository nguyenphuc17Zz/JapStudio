import { useEffect, useState } from 'react'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { Checkbox } from '../ui/Checkbox'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Switch } from '../ui/Switch'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../services/api'
import type { JlptLevel, Register } from '../../types/api'
import { GOAL_TYPE_LABELS_VI } from '../../types/api'

const JLPT_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']
const GOAL_TYPES = Object.keys(GOAL_TYPE_LABELS_VI)

const REGISTER_OPTIONS: { value: Register; label: string }[] = [
  { value: 'casual', label: 'Thân mật' },
  { value: 'polite', label: 'Lịch sự' },
  { value: 'business', label: 'Kinh doanh' },
]

export function LearningProfileCard() {
  const profile = useAsync(() => api.getLearningProfile())

  const [goal, setGoal] = useState('')
  const [goalType, setGoalType] = useState('')
  const [targetJlpt, setTargetJlpt] = useState<JlptLevel | ''>('')
  const [dailyTarget, setDailyTarget] = useState('3')
  const [registers, setRegisters] = useState<Register[]>([])
  const [topicsText, setTopicsText] = useState('')
  const [streakEnabled, setStreakEnabled] = useState(true)
  const [memoryEnabled, setMemoryEnabled] = useState(true)

  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const syncProfile = (data: unknown) => {
    const current = data as {
      goal?: string | null
      goal_type?: string | null
      target_jlpt?: string | null
      daily_target?: number
      preferred_registers?: string[] | null
      preferred_topics?: string[] | null
      streak_enabled?: boolean
      memory_enabled?: boolean
    } | null
    if (!current || current.goal === undefined) return
    setGoal(current.goal ?? '')
    setGoalType(current.goal_type ?? '')
    setTargetJlpt((current.target_jlpt as JlptLevel | null) ?? '')
    setDailyTarget(String(current.daily_target ?? 3))
    setRegisters((current.preferred_registers ?? []) as Register[])
    setTopicsText((current.preferred_topics ?? []).join(', '))
    setStreakEnabled(current.streak_enabled ?? true)
    setMemoryEnabled(current.memory_enabled ?? true)
  }

  useEffect(() => {
    syncProfile(profile.data)
  }, [profile.data])

  const saveProfile = async () => {
    setProfileSaving(true)
    setProfileSaved(false)
    setProfileError(null)
    try {
      const topics = topicsText
        .split(',')
        .map((topic) => topic.trim())
        .filter((topic) => topic.length > 0)
      await api.updateLearningProfile({
        goal: goal.trim() || null,
        ...(goalType ? { goal_type: goalType } : {}),
        target_jlpt: targetJlpt || null,
        daily_target: Number(dailyTarget) || 3,
        preferred_registers: registers.length > 0 ? registers : null,
        preferred_topics: topics.length > 0 ? topics : null,
        streak_enabled: streakEnabled,
        memory_enabled: memoryEnabled,
      })
      setProfileSaved(true)
      await profile.run()
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi lưu hồ sơ')
    } finally {
      setProfileSaving(false)
    }
  }

  const toggleRegister = (register: Register) => {
    setRegisters((current) =>
      current.includes(register)
        ? current.filter((item) => item !== register)
        : [...current, register],
    )
  }

  return (
    <Card className="jw-mb-lg">
      <CardHeader
        title="Hồ sơ học tập"
        description="Hệ thống sử dụng các mục tiêu này để gợi ý bài tập phù hợp với trình độ của bạn."
      />
      <CardContent>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <Input
            id="learning-goal"
            label="Mục tiêu học tập"
            maxLength={50}
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="VD: Thi JLPT N3 trong 6 tháng"
          />
          <div className="jw-inline jw-gap-md" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Select
                id="learning-goal-type"
                label="Loại mục tiêu"
                value={goalType}
                onChange={(event) => setGoalType(event.target.value)}
              >
                <option value="">Chưa đặt</option>
                {GOAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {GOAL_TYPE_LABELS_VI[type]}
                  </option>
                ))}
              </Select>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Select
                id="learning-jlpt"
                label="Mục tiêu JLPT"
                value={targetJlpt}
                onChange={(event) => setTargetJlpt(event.target.value as JlptLevel | '')}
              >
                <option value="">Chưa đặt</option>
                {JLPT_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </Select>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <Input
                id="learning-daily"
                label="Số bài tập mỗi ngày"
                type="number"
                min={1}
                max={20}
                value={dailyTarget}
                onChange={(event) => setDailyTarget(event.target.value)}
              />
            </div>
          </div>

          <div>
            <span className="jw-text--label jw-text--muted jw-mb-xs" style={{ display: 'block' }}>
              Ngữ điệu yêu thích
            </span>
            <div className="jw-inline jw-gap-md" style={{ flexWrap: 'wrap' }}>
              {REGISTER_OPTIONS.map((option) => {
                const checked = registers.includes(option.value)
                return (
                  <Checkbox
                    key={option.value}
                    label={option.label}
                    checked={checked}
                    onChange={() => toggleRegister(option.value)}
                    aria-label={`Ngữ điệu ${option.label}`}
                  />
                )
              })}
            </div>
          </div>

          <Input
            id="learning-topics"
            label="Chủ đề yêu thích"
            value={topicsText}
            onChange={(event) => setTopicsText(event.target.value)}
            placeholder="VD: Công việc, Du lịch, Ẩm thực (phân cách bằng dấu phẩy)"
          />

          <div className="jw-inline jw-gap-lg jw-mt-xs" style={{ flexWrap: 'wrap' }}>
            <Switch
              label="Ghi nhận chuỗi ngày luyện tập"
              checked={streakEnabled}
              onChange={(event) => setStreakEnabled(event.target.checked)}
              aria-label="Ghi nhận chuỗi ngày luyện tập"
            />
            <Switch
              label="Tự động ghi nhớ các mẫu lỗi"
              checked={memoryEnabled}
              onChange={(event) => setMemoryEnabled(event.target.checked)}
              aria-label="Tự động ghi nhớ các mẫu lỗi"
            />
          </div>

          {profileSaved && <Alert tone="success">Đã lưu hồ sơ học tập.</Alert>}
          {profileError && <Alert tone="error">{profileError}</Alert>}

          <div className="jw-mt-xs">
            <Button onClick={() => void saveProfile()} loading={profileSaving} icon="save">
              Lưu hồ sơ
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
