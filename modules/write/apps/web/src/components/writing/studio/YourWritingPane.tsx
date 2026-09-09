import { cx } from '../../../lib/cx'
import type { WritingEvaluationResponse } from '../../../types/api'
import { scrollToSentence } from './studioUtils'

export interface YourWritingPaneProps {
  evaluation: WritingEvaluationResponse
  selectedSentence: number | null
  onSelectSentence: (index: number | null) => void
  /** When true, per-sentence issue markers and scores are shown. */
  showMarkers?: boolean
}

export function YourWritingPane({
  evaluation,
  selectedSentence,
  onSelectSentence,
  showMarkers = true,
}: YourWritingPaneProps) {
  const sentences = evaluation.sentence_scores ?? []
  const issueSentenceIndexes = new Set(
    evaluation.issues
      .map((issue) => issue.sentence_index ?? issue.sentence_range?.[0] ?? null)
      .filter((index): index is number => index !== null),
  )

  return (
    <div className="jw-studio-writing">
      <div className="jw-studio-pane-head">
        <h3>Bài viết của bạn</h3>
        <span className="jw-studio-pane-meta">Câu: {evaluation.sentence_count}</span>
      </div>
      {sentences.length > 0 ? (
        <div className="jw-studio-sentences" role="list" aria-label="Các câu trong bài viết">
          {sentences.map((sentence) => {
            const hasIssues = showMarkers && issueSentenceIndexes.has(sentence.index)
            const selected = selectedSentence === sentence.index
            return (
              <button
                key={sentence.index}
                type="button"
                id={`jw-studio-sentence-${sentence.index}`}
                role="listitem"
                className={cx(
                  'jw-studio-sentence',
                  selected && 'jw-studio-sentence--selected',
                  hasIssues && 'jw-studio-sentence--flagged',
                )}
                aria-pressed={selected}
                aria-label={
                  hasIssues
                    ? `Câu ${sentence.index + 1}: có nhận xét`
                    : `Câu ${sentence.index + 1}`
                }
                onClick={() => {
                  onSelectSentence(selected ? null : sentence.index)
                  if (!selected) scrollToSentence(sentence.index)
                }}
              >
                <span className="jw-studio-sentence-no">
                  {String(sentence.index + 1).padStart(2, '0')}
                </span>
                <span className="jw-studio-sentence-text">{sentence.text}</span>
                {showMarkers ? (
                  <span className="jw-studio-sentence-score">{sentence.overall_score}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="jw-studio-pane-empty">{evaluation.text}</p>
      )}
    </div>
  )
}