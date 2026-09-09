import { useMemo, useState } from 'react'
import { cx } from '../../../lib/cx'
import { useMediaQuery } from '../../../lib/useMediaQuery'
import type {
  WritingEvaluationResponse,
  WritingIssue,
} from '../../../types/api'
import { Icon } from '../../icons/Icon'
import { SplitPane } from '../../layout/SplitPane'
import { Alert } from '../../ui/Alert'
import { Button } from '../../ui/Button'
import { SkillBar } from '../../ui/Progress'
import { Score } from '../../ui/Score'
import { LearningModePane, RewritePanel } from './LearningModePane'
import { ScenarioResults } from './ScenarioResults'
import { YourWritingPane } from './YourWritingPane'
import {
  scrollToSentence,
  DISCOURSE_DIMENSIONS,
} from './studioUtils'

const CATEGORY_LABELS: Record<string, string> = {
  coherence: 'Mạch lạc',
  cohesion: 'Liên kết',
  organization: 'Bố cục',
  flow: 'Trôi chảy',
  redundancy: 'Lặp thừa',
  style: 'Phong cách',
  register: 'Ngữ điệu',
  topic_consistency: 'Nhất quán chủ đề',
  grammar: 'Ngữ pháp',
  vocabulary: 'Từ vựng',
  naturalness: 'Tự nhiên',
  semantic: 'Ý nghĩa',
}

/** Sentence-level categories (from the exercise feedback system). */
const SENTENCE_CATEGORIES = new Set(['grammar', 'vocabulary', 'naturalness', 'semantic'])

const SEVERITY_LABELS: Record<string, string> = {
  info: 'Góp ý',
  minor: 'Nhẹ',
  major: 'Đáng chú ý',
  critical: 'Nghiêm trọng',
}

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

function groupByCategory(issues: WritingIssue[]): Array<[string, WritingIssue[]]> {
  const groups = new Map<string, WritingIssue[]>()
  for (const issue of issues) {
    const label = categoryLabel(issue.category)
    groups.set(label, [...(groups.get(label) ?? []), issue])
  }
  return [...groups.entries()]
}

function IssueRow({ issue, onJump }: { issue: WritingIssue; onJump: (issue: WritingIssue) => void }) {
  const sentence = issue.sentence_index ?? issue.sentence_range?.[0] ?? null
  return (
    <li className="jw-studio-issue">
      <div className="jw-studio-issue-head">
        <span className="jw-studio-severity">
          {SEVERITY_LABELS[issue.severity] ?? issue.severity}
        </span>
        {sentence !== null ? (
          <span className="jw-studio-issue-sentence">Câu {sentence + 1}</span>
        ) : null}
      </div>
      <p className="jw-studio-issue-explanation">{issue.explanation}</p>
      <p className="jw-studio-issue-fix">→ {issue.suggested_fix}</p>
      {sentence !== null ? (
        <Button variant="ghost" size="sm" onClick={() => onJump(issue)}>
          Xem câu liên quan
        </Button>
      ) : null}
    </li>
  )
}

function IssueGroup({
  title,
  badge,
  issues,
  onJump,
}: {
  title: string
  badge: string
  issues: WritingIssue[]
  onJump: (issue: WritingIssue) => void
}) {
  const groups = useMemo(() => groupByCategory(issues), [issues])
  return (
    <div
      className={cx(
        'jw-studio-issue-group',
        badge === 'Câu'
          ? 'jw-studio-issue-group--sentence'
          : 'jw-studio-issue-group--discourse',
      )}
    >
      <div className="jw-studio-pane-head">
        <h4>{title}</h4>
        <span className="jw-studio-group-badge">{badge}</span>
      </div>
      {groups.length > 0 ? (
        groups.map(([label, groupIssues]) => (
          <div key={label} className="jw-studio-issue-category">
            <h5>{label}</h5>
            <ul className="jw-studio-issue-list">
              {groupIssues.map((issue, index) => (
                <IssueRow key={`${issue.category}-${index}`} issue={issue} onJump={onJump} />
              ))}
            </ul>
          </div>
        ))
      ) : (
        <p className="jw-studio-good-note">✅ Tốt — không có lỗi cần sửa ở phần này.</p>
      )}
    </div>
  )
}

function AiReviewPane({
  evaluation,
  onJump,
}: {
  evaluation: WritingEvaluationResponse
  onJump: (issue: WritingIssue) => void
}) {
  const [structureOpen, setStructureOpen] = useState(false)
  const structure = evaluation.structure_suggestion
  const sentenceIssues = evaluation.issues.filter((issue) =>
    SENTENCE_CATEGORIES.has(issue.category),
  )
  const discourseIssues = evaluation.issues.filter(
    (issue) => !SENTENCE_CATEGORIES.has(issue.category),
  )

  return (
    <div className="jw-studio-ai-review">
      <div className="jw-studio-review-head">
        <div className="jw-studio-overall">
          <Score value={evaluation.scores.overall_writing} label="Điểm tổng" />
          <p className="jw-studio-summary">{evaluation.summary}</p>
        </div>
        <div className="jw-studio-chip-row">
          <span className="jw-studio-chip">Câu: {evaluation.sentence_count}</span>
          <span className="jw-studio-chip">Chất lượng câu: {evaluation.scores.sentence_quality}</span>
          <span className="jw-studio-chip">Chất lượng mạch văn: {evaluation.scores.discourse_quality}</span>
        </div>
      </div>

      <div className="jw-studio-quality">
        <div className="jw-studio-quality-card jw-studio-quality-card--sentence">
          <div className="jw-studio-quality-head">
            <Score value={evaluation.scores.sentence_quality} label="Chất lượng câu" />
            <span className="jw-studio-group-badge">Câu</span>
          </div>
          <p className="jw-studio-quality-note">
            Đánh giá từng câu: ngữ pháp, từ vựng, độ tự nhiên và ý nghĩa của mỗi câu.
          </p>
        </div>
        <div className="jw-studio-quality-card jw-studio-quality-card--discourse">
          <div className="jw-studio-quality-head">
            <Score value={evaluation.scores.discourse_quality} label="Chất lượng mạch văn" />
            <span className="jw-studio-group-badge">Mạch văn</span>
          </div>
          <p className="jw-studio-quality-note">
            Cách các câu kết nối và sắp xếp để tạo nên một bài viết mạch lạc, trôi chảy.
          </p>
          {evaluation.discourse_available ? (
            <div className="jw-studio-dimensions">
              {DISCOURSE_DIMENSIONS.map(({ key, label }) => (
                <SkillBar key={key} label={label} value={evaluation.scores[key] ?? 0} tone="info" />
              ))}
            </div>
          ) : null}
        </div>
        {!evaluation.discourse_available ? (
          <Alert tone="info">Đánh giá câu vẫn có, nhưng phân tích mạch văn hiện chưa khả dụng.</Alert>
        ) : null}
      </div>

      {structure ? (
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
              <p className="jw-studio-structure-hint">Dựa trên bài viết hiện tại của bạn:</p>
              {structure.reorder_advice ? <p>{structure.reorder_advice}</p> : null}
              {structure.template ? (
                <p>
                  Khuôn mẫu đề xuất: <strong>{structure.template}</strong>
                  {structure.template_reason ? ` — ${structure.template_reason}` : ''}
                </p>
              ) : null}
              {evaluation.improved_structure ? (
                <p>Cấu trúc cải thiện: {evaluation.improved_structure}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="jw-studio-strengths">
        <div className="jw-studio-pane-head">
          <h4>Điểm mạnh</h4>
        </div>
        <ul className="jw-studio-strengths-list">
          {evaluation.strengths.map((strength, index) => (
            <li key={`${strength}-${index}`}>
              <Icon name="check" size={13} aria-hidden="true" />
              <span>{strength}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="jw-studio-issues">
        <div className="jw-studio-pane-head">
          <h4>Cần cải thiện</h4>
        </div>
        <IssueGroup
          title="Theo từng câu"
          badge="Câu"
          issues={sentenceIssues}
          onJump={onJump}
        />
        <IssueGroup
          title="Mạch văn"
          badge="Mạch văn"
          issues={discourseIssues}
          onJump={onJump}
        />
      </div>
    </div>
  )
}

export interface ReviewPaneProps {
  evaluation: WritingEvaluationResponse
  scenarioMode?: boolean
  hints: string[]
  hintsTotal: number
  revealAvailable: boolean
  revealed: boolean
  hintPending: boolean
  revealPending: boolean
  actionError: string | null
  onNextHint: () => void
  onReveal: () => void
}

export function ReviewPane({
  evaluation,
  scenarioMode = false,
  hints,
  hintsTotal,
  revealAvailable,
  revealed,
  hintPending,
  revealPending,
  actionError,
  onNextHint,
  onReveal,
}: ReviewPaneProps) {
  const [selectedSentence, setSelectedSentence] = useState<number | null>(null)
  const [activeIssue, setActiveIssue] = useState(0)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const flatIssues = evaluation.issues
  const showRewrites =
    (revealed || evaluation.learning_mode === null) && evaluation.rewrites !== null

  const jumpToIssue = (issue: WritingIssue) => {
    const flatIndex = flatIssues.indexOf(issue)
    if (flatIndex >= 0) setActiveIssue(flatIndex)
    const target = issue.sentence_index ?? issue.sentence_range?.[0] ?? null
    if (target !== null) {
      setSelectedSentence(target)
      scrollToSentence(target)
    }
  }

  const moveIssue = (delta: number) => {
    if (flatIssues.length === 0) return
    const next = (activeIssue + delta + flatIssues.length) % flatIssues.length
    setActiveIssue(next)
    jumpToIssue(flatIssues[next])
  }

  return (
    <div className="jw-studio-review">
      <SplitPane
        ratio={0.42}
        left={
          <YourWritingPane
            evaluation={evaluation}
            selectedSentence={selectedSentence}
            onSelectSentence={setSelectedSentence}
          />
        }
        right={
          <div className="jw-studio-review-right">
            {scenarioMode ? <ScenarioResults evaluation={evaluation} /> : null}
            <AiReviewPane evaluation={evaluation} onJump={jumpToIssue} />
            {actionError ? <Alert tone="error">{actionError}</Alert> : null}
            <LearningModePane
              evaluation={evaluation}
              hints={hints}
              hintsTotal={hintsTotal}
              revealAvailable={revealAvailable}
              revealed={revealed}
              hintPending={hintPending}
              revealPending={revealPending}
              onNextHint={onNextHint}
              onReveal={onReveal}
            />
            {showRewrites && evaluation.rewrites ? (
              <RewritePanel rewrites={evaluation.rewrites} />
            ) : null}
            {isMobile && flatIssues.length > 0 ? (
              <div className="jw-studio-issue-nav" role="group" aria-label="Điều hướng nhận xét">
                <Button variant="ghost" size="sm" onClick={() => moveIssue(-1)}>
                  Trước
                </Button>
                <span className="jw-studio-issue-nav-count">
                  Vấn đề {activeIssue + 1} / {flatIssues.length}
                </span>
                <Button variant="ghost" size="sm" onClick={() => moveIssue(1)}>
                  Tiếp theo
                </Button>
              </div>
            ) : null}
          </div>
        }
      />
    </div>
  )
}