import { useMemo, useState } from 'react'
import { cx } from '../../../lib/cx'
import { useMediaQuery } from '../../../lib/useMediaQuery'
import type { WritingEvaluationResponse, WritingRewrites } from '../../../types/api'
import { Button } from '../../ui/Button'
import { Tabs } from '../../ui/Tabs'
import { useToast } from '../../ui/Toast'

const REWRITE_ITEMS: Array<{
  key: 'minimal_fix' | 'natural_rewrite' | 'native_rewrite'
  label: string
}> = [
  { key: 'minimal_fix', label: 'Sửa tối thiểu' },
  { key: 'natural_rewrite', label: 'Viết lại tự nhiên' },
  { key: 'native_rewrite', label: 'Như người bản xứ' },
]

function copyText(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  textarea.remove()
  return ok ? Promise.resolve() : Promise.reject(new Error('clipboard unavailable'))
}

export function RewritePanel({ rewrites }: { rewrites: WritingRewrites }) {
  const toast = useToast()
  const isDesktop = useMediaQuery('(min-width: 900px)')
  const [active, setActive] = useState('minimal_fix')

  const items = useMemo(() => {
    const base = REWRITE_ITEMS.map((item) => ({
      id: item.key,
      label: item.label,
      text: rewrites[item.key],
    }))
    return rewrites.professional_rewrite
      ? [
          ...base,
          { id: 'professional_rewrite', label: 'Viết lại trang trọng', text: rewrites.professional_rewrite },
        ]
      : base
  }, [rewrites])

  const copy = (text: string) => {
    copyText(text)
      .then(() => toast.success('Đã sao chép.'))
      .catch(() => toast.error('Không thể sao chép.'))
  }

  return (
    <div className="jw-studio-rewrites">
      <div className="jw-studio-pane-head">
        <h4>Bản viết lại tham khảo</h4>
        <span className="jw-studio-pane-meta">Giữ nguyên ý nghĩa bài của bạn</span>
      </div>
      {isDesktop ? (
        <div className="jw-studio-rewrites-grid">
          {items.map((item) => (
            <div key={item.id} className="jw-studio-rewrite-card">
              <h5>{item.label}</h5>
              <p className="jw-studio-rewrite-text">{item.text}</p>
              <Button variant="ghost" size="sm" icon="copy" onClick={() => copy(item.text)}>
                Sao chép
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Tabs
          variant="pills"
          value={active}
          onChange={setActive}
          items={items.map((item) => ({
            id: item.id,
            label: item.label,
            content: (
              <div className="jw-studio-rewrite-card jw-studio-rewrite-card--panel">
                <p className="jw-studio-rewrite-text">{item.text}</p>
                <Button variant="ghost" size="sm" icon="copy" onClick={() => copy(item.text)}>
                  Sao chép
                </Button>
              </div>
            ),
          }))}
        />
      )}
    </div>
  )
}

export interface LearningModePaneProps {
  evaluation: WritingEvaluationResponse
  hints: string[]
  hintsTotal: number
  revealAvailable: boolean
  revealed: boolean
  hintPending: boolean
  revealPending: boolean
  onNextHint: () => void
  onReveal: () => void
}

export function LearningModePane({
  evaluation,
  hints,
  hintsTotal,
  revealAvailable,
  revealed,
  hintPending,
  revealPending,
  onNextHint,
  onReveal,
}: LearningModePaneProps) {
  const learningMode = evaluation.learning_mode
  if (!learningMode) return null
  const remaining = Math.max(0, hintsTotal - hints.length)

  return (
    <div className="jw-studio-learning">
      {hintsTotal > 0 ? (
        <div className="jw-studio-hints">
          <div className="jw-studio-pane-head">
            <h4>Gợi ý cải thiện</h4>
            <span className="jw-studio-hint-count">
              Gợi ý {hints.length} / {hintsTotal}
            </span>
            <span className="jw-studio-hint-dots" aria-hidden="true">
              {Array.from({ length: hintsTotal }, (_, index) => (
                <span
                  key={index}
                  className={cx(
                    'jw-studio-hint-dot',
                    index < hints.length && 'jw-studio-hint-dot--on',
                  )}
                />
              ))}
            </span>
          </div>
          {hints.length > 0 ? (
            <ol className="jw-studio-hint-list">
              {hints.map((hint, index) => (
                <li key={`${index}-${hint}`}>{hint}</li>
              ))}
            </ol>
          ) : (
            <p className="jw-studio-hint-empty">
              Chưa có gợi ý nào. Nhấn nút bên dưới để nhận gợi ý đầu tiên.
            </p>
          )}
          {hints.length < hintsTotal ? (
            <div className="jw-studio-hint-actions">
              <Button variant="secondary" icon="hint" onClick={onNextHint} loading={hintPending}>
                Gợi ý tiếp theo
              </Button>
              {remaining > 0 ? (
                <span className="jw-studio-pane-meta">Còn {remaining} gợi ý</span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {!revealed && revealAvailable ? (
        <div className="jw-studio-reveal">
          <Button icon="eye" onClick={onReveal} loading={revealPending}>
            Xem bản viết lại
          </Button>
          <p className="jw-studio-reveal-note">
            Bạn đã sẵn sàng xem bản viết lại chưa? Hãy tự sửa trước nhé.
          </p>
        </div>
      ) : null}
    </div>
  )
}