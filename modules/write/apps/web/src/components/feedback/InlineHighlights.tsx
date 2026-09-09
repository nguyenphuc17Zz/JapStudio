import { useEffect, useMemo, useRef } from 'react'
import { cx } from '../../lib/cx'
import type { EvaluationIssue } from '../../types/api'
import { CATEGORY_LABELS, SEVERITY_RANK } from './labels'

export interface InlineHighlightsProps {
  answer: string
  issues: EvaluationIssue[]
  selectedIssueIndex: number | null
  onSelectIssue: (index: number) => void
}

function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[。！？!?.])\s*|\n+/)
  return parts.map((part) => part.trim()).filter(Boolean)
}

function highestSeverity(issues: EvaluationIssue[]): EvaluationIssue['severity'] {
  return issues.reduce(
    (best, issue) => (SEVERITY_RANK[issue.severity] < SEVERITY_RANK[best] ? issue.severity : best),
    issues[0]?.severity ?? 'info',
  )
}

export function InlineHighlights({
  answer,
  issues,
  selectedIssueIndex,
  onSelectIssue,
}: InlineHighlightsProps) {
  const sentenceRefs = useRef<Array<HTMLElement | null>>([])

  const { sentences, sentenceIssues } = useMemo(() => {
    const parts = splitSentences(answer)
    const mapping: Array<number[] | null> = parts.map((sentence) => {
      const matches: number[] = []
      issues.forEach((issue, index) => {
        const original = issue.original_text?.trim()
        if (original && sentence.includes(original)) {
          matches.push(index)
        }
      })
      return matches.length > 0 ? matches : null
    })
    return { sentences: parts, sentenceIssues: mapping }
  }, [answer, issues])

  useEffect(() => {
    if (selectedIssueIndex === null) return
    const sentenceIndex = sentenceIssues.findIndex(
      (matches) => matches !== null && matches.includes(selectedIssueIndex),
    )
    if (sentenceIndex < 0) return
    sentenceRefs.current[sentenceIndex]?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [selectedIssueIndex, sentenceIssues])

  const selectedSentence = useMemo(() => {
    if (selectedIssueIndex === null) return -1
    return sentenceIssues.findIndex(
      (matches) => matches !== null && matches.includes(selectedIssueIndex),
    )
  }, [selectedIssueIndex, sentenceIssues])

  if (sentences.length === 0) {
    return <p className="jw-answer-highlights">{answer}</p>
  }

  return (
    <p className="jw-answer-highlights">
      {sentences.map((sentence, sentenceIndex) => {
        const matches = sentenceIssues[sentenceIndex]
        if (!matches) {
          return (
            <span
              key={`${sentenceIndex}-${sentence}`}
              ref={(node) => {
                sentenceRefs.current[sentenceIndex] = node
              }}
              className="jw-answer-sentence"
            >
              {sentence}
            </span>
          )
        }
        const relatedIssues = matches.map((index) => issues[index])
        const severity = highestSeverity(relatedIssues)
        const selected = sentenceIndex === selectedSentence
        const issue = relatedIssues[0]
        return (
          <mark
            key={`${sentenceIndex}-${sentence}`}
            ref={(node) => {
              sentenceRefs.current[sentenceIndex] = node
            }}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={`Đoạn có vấn đề ${CATEGORY_LABELS[issue.category].toLowerCase()} — ${issue.explanation}`}
            className={cx(
              'jw-answer-sentence',
              'jw-highlight',
              `jw-highlight--${severity}`,
              selected && 'jw-highlight--selected',
            )}
            onClick={() => onSelectIssue(matches[0])}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelectIssue(matches[0])
              }
            }}
          >
            {sentence}
          </mark>
        )
      })}
    </p>
  )
}