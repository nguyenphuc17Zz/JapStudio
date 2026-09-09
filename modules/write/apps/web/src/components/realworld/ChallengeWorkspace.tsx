import { useState } from 'react'
import type { ChallengeSession } from '../../hooks/useChallengeSession'
import { challengeTypeLabel } from '../realworld/labels'
import { Alert } from '../ui/Alert'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { Score } from '../ui/Score'
import { XpBadge } from '../gamification/XpBadge'
import { AIModelPicker } from '../ai/AIModelPicker'
import { AIWritingAssistantDrawer } from '../ai/AIWritingAssistantDrawer'
import { FuriganaText } from '../ui/FuriganaText'
import { useAIProvider } from '../../context/AIProviderContext'
import { sound } from '../../services/sound'

export interface ChallengeWorkspaceProps {
  session: ChallengeSession
  onNew: () => void
}

export function ChallengeWorkspace({ session, onNew }: ChallengeWorkspaceProps) {
  const { selectedProvider, selectedModel } = useAIProvider()
  const { challenge, phase, attempt, answer, setAnswer, error, submit, retry } = session
  const [started, setStarted] = useState(false)

  if (!challenge) {
    return (
      <Card>
        <CardContent>
          <p className="jw-text--muted jw-text--sm">
            Nhấn 'Nhận thử thách' để AI tạo thử thách phù hợp với điểm yếu của bạn.
          </p>
        </CardContent>
      </Card>
    )
  }

  const insertPunctuation = (char: string) => {
    sound.playWashiStroke()
    setAnswer(answer + char)
  }

  const typeLabel = challengeTypeLabel(challenge.challenge_type)
  const success = attempt?.success === true
  const focusedScore = attempt ? Math.round(attempt.score) : null
  const evaluation = (attempt?.evaluation ?? null) as {
    summary?: string | null
    issues?: Array<{ category: string; explanation: string; suggested_fix: string }>
  } | null

  const resultView = (
    <Card
      variant={success ? 'elevated' : 'default'}
      className="jw-mb-lg"
      aria-live="polite"
    >
      <CardContent>
        {success ? (
          <div>
            <div className="jw-card-eyebrow-group jw-mb-sm">
              <span className="jw-card-eyebrow" style={{ color: 'var(--color-success)' }}>
                THỬ THÁCH HOÀN THÀNH
              </span>
            </div>
            <div className="jw-inline jw-gap-md jw-mb-md" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Score value={focusedScore ?? 0} label={typeLabel} />
              {attempt && attempt.xp_awarded > 0 ? (
                <XpBadge xp={attempt.xp_awarded} />
              ) : null}
            </div>
            <h3 className="jw-text--body jw-mb-xs" style={{ fontWeight: 600 }}>
              Thử thách hoàn thành xuất sắc
            </h3>
            {evaluation?.summary && (
              <p className="jw-text--sm jw-text--secondary jw-mb-md">{evaluation.summary}</p>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
              <Button icon="refresh" onClick={onNew} variant="primary">
                Thử thách mới
              </Button>
              <Button
                variant="secondary"
                icon="sparkles"
                href="/rewrite-lab"
                aria-label="Chuyển sang Rewrite Lab"
              >
                🧪 Chuyển sang Rewrite Lab
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="jw-card-eyebrow-group jw-mb-sm">
              <span className="jw-card-eyebrow" style={{ color: 'var(--color-warning)' }}>
                CHƯA ĐẠT NHÉ
              </span>
            </div>
            <div className="jw-mb-md">
              <Score value={focusedScore ?? 0} label={`Kết quả / 100 (${typeLabel})`} />
            </div>
            {evaluation?.summary && (
              <p className="jw-text--sm jw-text--secondary jw-mb-md">{evaluation.summary}</p>
            )}
            {evaluation?.issues && evaluation.issues.length > 0 && (
              <ul className="jw-ai-evidence jw-mb-md">
                {evaluation.issues.map((issue, index) => (
                  <li key={`${issue.category}-${index}`}>
                    <strong>{issue.category}:</strong> {issue.explanation}
                    {issue.suggested_fix && (
                      <span className="jw-text--accent"> → {issue.suggested_fix}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="jw-inline jw-gap-sm">
              <Button onClick={retry} disabled={phase === 'submitting'}>
                Thử lại
              </Button>
              <Button variant="ghost" onClick={onNew}>
                Thử thách khác
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const workspaceView = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 'var(--space-lg)',
        alignItems: 'start',
      }}
    >
      {/* Left Column: Challenge Briefing */}
      <Card className="jw-mb-lg">
        <CardHeader
          title={
            <div className="jw-inline jw-gap-sm">
              <span className="jw-card-eyebrow">THỬ THÁCH · {typeLabel.toUpperCase()}</span>
            </div>
          }
          actions={
            <div className="jw-inline jw-gap-xs">
              <Badge tone="neutral">Độ khó {challenge.difficulty}/10</Badge>
              {challenge.xp_reward > 0 && (
                <XpBadge xp={challenge.xp_reward} />
              )}
            </div>
          }
        />
        <CardContent>
          <h3 className="jw-text--body jw-mb-xs" style={{ fontWeight: 600 }}>
            {challenge.objective}
          </h3>
          <p className="jw-text--sm jw-text--muted jw-mb-md">{challenge.instruction_vi}</p>

          {/* Ecosystem Shortcuts */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              margin: 'var(--space-xs) 0 var(--space-md)',
              paddingBottom: 'var(--space-xs)',
              borderBottom: '1px solid var(--glass-border)',
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              href="/kanji"
              aria-label="Luyện Kanji"
              style={{ fontSize: '11px', padding: '0 8px', height: '26px' }}
            >
              ✍️ Luyện Kanji
            </Button>
            <Button
              variant="ghost"
              size="sm"
              href="/vocabulary"
              aria-label="Kho từ vựng"
              style={{ fontSize: '11px', padding: '0 8px', height: '26px' }}
            >
              ✨ Kho từ vựng
            </Button>
          </div>

          {challenge.required_expression && (
            <div className="jw-mb-md">
              <Badge tone="accent">
                Bắt buộc sử dụng:{' '}
                <strong className="jw-jp-text">
                  <FuriganaText text={challenge.required_expression} />
                </strong>
              </Badge>
            </div>
          )}

          {challenge.source_text && (
            <Card variant="subtle" className="jw-mb-md">
              <CardContent>
                <h4 className="jw-card-eyebrow jw-mb-xs">VĂN BẢN NGUỒN</h4>
                <div className="jw-jp-text jw-text--body" style={{ fontWeight: 500 }}>
                  <FuriganaText text={challenge.source_text} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Universal AI Writing Assistant Drawer */}
          <AIWritingAssistantDrawer
            title="Trợ lực Thử thách (Tips & Collocations)"
            prompt_vi={challenge.objective || challenge.instruction_vi}
            context_vi={challenge.instruction_vi}
            keywords={challenge.required_expression ? [challenge.required_expression] : []}
            onInsertPhrase={(phrase) => insertPunctuation(phrase)}
          />
        </CardContent>
      </Card>

      {/* Right Column: Writing & Submission Desk */}
      <div>
        {phase !== 'result' || attempt?.success !== false ? (
          <Card className="jw-mb-lg">
            <CardHeader
              title={<span className="jw-card-eyebrow">BÀN LÀM BÀI TRỰC TIẾP</span>}
              actions={<span className="jw-text--sm jw-text--muted">{[...answer].length} ký tự</span>}
            />
            <CardContent>
              {/* Quick Punctuation & Particle Micro-Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginBottom: '8px',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--color-foreground-muted)', marginRight: '2px', flexShrink: 0 }}>
                  Ký tự nhanh:
                </span>
                {['。', '、', '「', '」', '〜', '・', 'を', 'に', 'で', 'が', 'は'].map((char) => (
                  <button
                    key={char}
                    type="button"
                    onClick={() => insertPunctuation(char)}
                    disabled={phase === 'submitting'}
                    style={{
                      padding: '2px 7px',
                      fontSize: '11px',
                      fontFamily: 'var(--font-japanese)',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--color-foreground)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {char}
                  </button>
                ))}
              </div>

              <Textarea
                lang="ja"
                aria-label="Câu trả lời tiếng Nhật của bạn"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault()
                    if (answer.trim() && phase !== 'submitting') {
                      void submit({ provider: selectedProvider, model: selectedModel })
                    }
                  }
                }}
                placeholder="Viết câu trả lời tiếng Nhật ở đây..."
                rows={5}
                disabled={phase === 'submitting'}
                counter={`${[...answer].length} ký tự · Ctrl+Enter để gửi`}
                style={{ width: '100%', resize: 'vertical' }}
              />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginTop: 'var(--space-sm)',
                }}
              >
                <AIModelPicker variant="compact" />
                <Button
                  icon="send"
                  onClick={() => submit({ provider: selectedProvider, model: selectedModel })}
                  loading={phase === 'submitting'}
                  disabled={!answer.trim()}
                >
                  {phase === 'submitting' ? 'AI đang chấm điểm...' : 'Gửi bài'}
                </Button>
              </div>
              {error && <Alert tone="error" className="jw-mt-sm">{error}</Alert>}
            </CardContent>
          </Card>
        ) : null}

        {attempt ? resultView : null}
      </div>
    </div>
  )

  const landingView = (
    <Card className="jw-mb-lg">
      <CardHeader
        title={<span className="jw-card-eyebrow">THỬ THÁCH · {typeLabel.toUpperCase()}</span>}
        actions={
          <div className="jw-inline jw-gap-xs">
            <Badge tone="neutral">Độ khó {challenge.difficulty}/10</Badge>
            {challenge.xp_reward > 0 && (
              <XpBadge xp={challenge.xp_reward} />
            )}
          </div>
        }
      />
      <CardContent>
        <h3 className="jw-text--body jw-mb-xs" style={{ fontWeight: 600 }}>
          {challenge.objective}
        </h3>
        <p className="jw-text--sm jw-text--muted jw-mb-md">{challenge.instruction_vi}</p>

        {challenge.source_text && (
          <Card variant="subtle" className="jw-mb-md">
            <CardContent>
              <h4 className="jw-card-eyebrow jw-mb-xs">VĂN BẢN NGUỒN</h4>
              <div className="jw-jp-text jw-text--body" style={{ fontWeight: 500 }}>
                <FuriganaText text={challenge.source_text} />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="jw-mt-md">
          <Button icon="flag" onClick={() => setStarted(true)} variant="primary">
            Bắt đầu
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  if (phase === 'completed') {
    return (
      <div>
        {attempt ? resultView : null}
        {!attempt ? (
          <Card>
            <CardContent>
              <p className="jw-text--muted jw-text--sm jw-mb-md">Thử thách này đã hoàn thành trước đó.</p>
              <Button icon="refresh" onClick={onNew}>
                Thử thách mới
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    )
  }

  if (phase === 'result' || phase === 'retry') {
    return <div>{workspaceView}</div>
  }

  return (
    <div>
      {started || phase === 'submitting' ? workspaceView : landingView}
    </div>
  )
}