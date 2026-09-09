import { useState } from 'react'
import { cx } from '../../../lib/cx'
import {
  EVALUATION_FAILED,
  REVISION_FAILED,
  type RetryAction,
} from '../../../hooks/useWritingSession'
import { isBugReportGenre, isEmailGenre, parseEmail } from '../../../lib/scenarioText'
import type { Exercise, WritingScenario, WritingStructureSuggestion } from '../../../types/api'
import { Icon } from '../../icons/Icon'
import { Alert } from '../../ui/Alert'
import { Button } from '../../ui/Button'
import { CharacterCounter } from '../CharacterCounter'
import { WritingEditorShell } from '../WritingEditorShell'
import { GenreFields } from './GenreFields'
import { AIWritingAssistantDrawer } from '../../ai/AIWritingAssistantDrawer'
import { REGISTER_LABELS, TARGET_LENGTH_LABELS } from '../../feedback/labels'

const TARGET_RANGES: Record<string, { min: number; max: number }> = {
  short_sentence: { min: 5, max: 30 },
  sentence: { min: 10, max: 60 },
  multi_sentence: { min: 20, max: 80 },
  paragraph: { min: 80, max: 150 },
  long_writing: { min: 150, max: 300 },
}

export interface TopicPaneProps {
  exercise: Exercise
  scenario: WritingScenario | null
  answer: string
  onChange: (value: string) => void
  draftSaved: boolean
  revisionMode: boolean
  latestRevisionNumber: number
  submitError: string | null
  actionError: string | null
  retryAction: RetryAction | null
  onSubmit: () => void
  onRetry: () => void
  onCancelRevision: () => void
  structure: WritingStructureSuggestion | null
  improvedStructure: string | null
}

export function TopicPane({
  exercise,
  scenario,
  answer,
  onChange,
  draftSaved,
  revisionMode,
  latestRevisionNumber,
  submitError,
  actionError,
  retryAction,
  onSubmit,
  onRetry,
  onCancelRevision,
  structure,
  improvedStructure,
}: TopicPaneProps) {
  const [structureOpen, setStructureOpen] = useState(false)
  const range = TARGET_RANGES[exercise.target_length]
  const genreFields =
    scenario !== null &&
    (isEmailGenre(scenario.genre) || isBugReportGenre(scenario.genre))
  const charCount = [...(scenario && isEmailGenre(scenario.genre) ? parseEmail(answer).body : answer)]
    .length

  return (
    <div
      className="jw-studio-topic-pane"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1.2fr)',
        gap: 'var(--space-md)',
        alignItems: 'start',
      }}
    >
      {/* LEFT COLUMN: Reference & Pedagogical Context */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* Topic Card */}
        <div className="jw-studio-topic">
          <div className="jw-studio-chip-row">
            <span className="jw-studio-chip">
              {exercise.topic}
              {exercise.subtopic ? ` › ${exercise.subtopic}` : ''}
            </span>
            <span className="jw-studio-chip">
              {REGISTER_LABELS[exercise.register] ?? exercise.register}
            </span>
            <span className="jw-studio-chip">JLPT {exercise.jlpt_level}</span>
            <span className="jw-studio-chip">Độ khó {exercise.difficulty}/10</span>
            <span className="jw-studio-chip">
              {TARGET_LENGTH_LABELS[exercise.target_length] ?? exercise.target_length}
            </span>
          </div>
          {exercise.context ? <p className="jw-studio-topic-context">{exercise.context}</p> : null}
          <p className="jw-studio-topic-prompt">{exercise.prompt_vi}</p>

          {/* Ecosystem Shortcuts */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              marginTop: 'var(--space-sm)',
              paddingTop: 'var(--space-xs)',
              borderTop: '1px solid var(--color-border-subtle)',
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              href={`/kanji`}
              aria-label="Luyện Kanji trong Kanji Studio"
              style={{ fontSize: '11px', padding: '0 8px', height: '26px' }}
            >
              Luyện Kanji
            </Button>
            <Button
              variant="ghost"
              size="sm"
              href={`/vocabulary`}
              aria-label="Kho từ vựng"
              style={{ fontSize: '11px', padding: '0 8px', height: '26px' }}
            >
              Kho từ vựng
            </Button>
          </div>
        </div>

        {/* Scenario Details if available */}
        {scenario ? (
          <div className="jw-studio-scenario">
            <div className="jw-studio-scenario-head">
              <Icon name="briefcase" size={14} aria-hidden="true" />
              <span>Tình huống</span>
            </div>
            <p className="jw-studio-scenario-situation">{scenario.situation_vi}</p>
            {scenario.context_vi ? (
              <p className="jw-studio-scenario-context">{scenario.context_vi}</p>
            ) : null}
            <div className="jw-studio-scenario-section">
              <h4>Yêu cầu bắt buộc</h4>
              <ol className="jw-studio-scenario-points">
                {scenario.required_points.map((point, index) => (
                  <li key={point.id}>
                    <span className="jw-studio-scenario-no">{index + 1}</span>
                    <span>{point.description}</span>
                  </li>
                ))}
              </ol>
            </div>
            {scenario.forbidden_patterns.length > 0 ? (
              <div className="jw-studio-scenario-section">
                <h4>Lưu ý tránh</h4>
                <ul className="jw-studio-scenario-points">
                  {scenario.forbidden_patterns.map((pattern) => (
                    <li key={pattern}>🚫 {pattern}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Structure Suggestions Accordion */}
        <div className="jw-studio-structure">
          <button
            type="button"
            className="jw-studio-structure-toggle"
            aria-expanded={structureOpen}
            onClick={() => setStructureOpen((open) => !open)}
          >
            <Icon name="sparkles" size={14} aria-hidden="true" />
            <span>Gợi ý cấu trúc</span>
            <Icon
              name={structureOpen ? 'chevron-up' : 'chevron-down'}
              size={14}
              aria-hidden="true"
            />
          </button>
          {structureOpen ? (
            <div className="jw-studio-structure-body">
              {structure ? (
                <>
                  {structure.reorder_advice ? <p>{structure.reorder_advice}</p> : null}
                  {structure.template ? (
                    <p>
                      Khuôn mẫu đề xuất: <strong>{structure.template}</strong>
                      {structure.template_reason ? ` — ${structure.template_reason}` : ''}
                    </p>
                  ) : null}
                  {improvedStructure ? (
                    <p>Cấu trúc cải thiện: {improvedStructure}</p>
                  ) : null}
                </>
              ) : (
                <p className="jw-studio-structure-empty">
                  Gợi ý cấu trúc sẽ hiển thị sau khi AI đánh giá bài viết.
                </p>
              )}
            </div>
          ) : null}
        </div>

        {/* Universal AI Writing Assistant Co-pilot */}
        <AIWritingAssistantDrawer
          prompt_vi={exercise.prompt_vi}
          context_vi={exercise.context}
          jlpt_level={exercise.jlpt_level}
          register={scenario?.register || undefined}
          genre={scenario?.genre || undefined}
          onInsertPhrase={(phrase) => {
            onChange(answer + phrase)
          }}
        />
      </div>

      {/* RIGHT COLUMN: Writing Action Studio & Submissions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {genreFields ? (
          <GenreFields
            genre={scenario!.genre}
            answer={answer}
            onChange={onChange}
            toolbar={
              revisionMode ? (
                <span className="jw-studio-revision-badge">
                  Đang viết lại bản {latestRevisionNumber}
                </span>
              ) : undefined
            }
            footerLeft={
              answer.trim() ? (
                <span
                  className={cx(
                    'jw-studio-save',
                    !draftSaved && 'jw-studio-save--pending',
                  )}
                >
                  {draftSaved ? 'Đã lưu cục bộ' : 'Chưa lưu'}
                </span>
              ) : null
            }
            footerRight={
              <CharacterCounter
                current={charCount}
                targetMin={range?.min}
                targetMax={range?.max}
              />
            }
          />
        ) : (
          <WritingEditorShell
            value={answer}
            onChange={onChange}
            toolbar={
              revisionMode ? (
                <span className="jw-studio-revision-badge">
                  Đang viết lại bản {latestRevisionNumber}
                </span>
              ) : undefined
            }
            footerLeft={
              answer.trim() ? (
                <span
                  className={cx(
                    'jw-studio-save',
                    !draftSaved && 'jw-studio-save--pending',
                  )}
                >
                  {draftSaved ? 'Đã lưu cục bộ' : 'Chưa lưu'}
                </span>
              ) : null
            }
            footerRight={
              <CharacterCounter
                current={charCount}
                targetMin={range?.min}
                targetMax={range?.max}
              />
            }
          />
        )}

        <div className="jw-studio-submit-row" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-xs)' }}>
          {revisionMode ? (
            <Button variant="ghost" onClick={onCancelRevision}>
              Hủy viết lại
            </Button>
          ) : null}
          <Button icon="send" onClick={onSubmit} disabled={answer.trim().length === 0}>
            {revisionMode ? 'Gửi bản sửa' : 'Gửi bài'}
          </Button>
        </div>

        {submitError ? (
          <div className="jw-studio-error">
            <Alert tone="error" title={EVALUATION_FAILED}>
              {submitError}
            </Alert>
            {retryAction === 'submit' ? (
              <div className="jw-studio-error-actions">
                <Button variant="secondary" icon="refresh" onClick={onRetry}>
                  Thử lại
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {actionError ? (
          <div className="jw-studio-error">
            <Alert tone="error" title={REVISION_FAILED}>
              {actionError}
            </Alert>
            {retryAction === 'revise' ? (
              <div className="jw-studio-error-actions">
                <Button variant="secondary" icon="refresh" onClick={onRetry}>
                  Thử lại
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}