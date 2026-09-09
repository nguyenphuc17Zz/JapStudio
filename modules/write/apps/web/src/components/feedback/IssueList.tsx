import { useMemo, useState } from 'react'
import { cx } from '../../lib/cx'
import type { EvaluationIssue, IssueCategory } from '../../types/api'
import { CATEGORY_LABELS, SEVERITY_LABELS, SEVERITY_RANK } from './labels'

export interface IssueListProps {
  issues: EvaluationIssue[]
  selectedIssueIndex: number | null
  onSelectIssue: (index: number) => void
}

function IssueRow({
  issue,
  index,
  selected,
  onSelect,
}: {
  issue: EvaluationIssue
  index: number
  selected: boolean
  onSelect: (index: number) => void
}) {
  return (
    <li className={cx('jw-fb-issue', `jw-fb-issue--${issue.severity}`)}>
      <div className="jw-fb-issue-head">
        <span className={cx('jw-severity-chip', `jw-severity-chip--${issue.severity}`)}>
          {SEVERITY_LABELS[issue.severity]}
        </span>
        <span className="jw-category-chip">{CATEGORY_LABELS[issue.category]}</span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            type="button"
            className="jw-issue-jump"
            aria-pressed={selected}
            onClick={() => onSelect(index)}
          >
            {selected ? 'Đang xem' : 'Xem câu'}
          </button>
          {issue.original_text && (
            <a
              href={`/rewrite-lab?text=${encodeURIComponent(issue.original_text)}&context=${encodeURIComponent(issue.explanation || '')}`}
              className="jw-issue-jump"
              title="Tự sửa câu này trong Rewrite Lab"
              style={{ textDecoration: 'none', color: 'var(--color-primary)' }}
            >
              🧪 Tự sửa
            </a>
          )}
        </div>
      </div>
      {issue.original_text ? (
        <p className="jw-fb-issue-original">「{issue.original_text}」</p>
      ) : null}
      <p className="jw-fb-issue-explanation">{issue.explanation}</p>
      {issue.suggested_fix ? <p className="jw-fb-issue-fix">→ {issue.suggested_fix}</p> : null}
      {issue.reason ? <p className="jw-fb-issue-reason">{issue.reason}</p> : null}
    </li>
  )
}

export function IssueList({ issues, selectedIssueIndex, onSelectIssue }: IssueListProps) {
  const [showAll, setShowAll] = useState(false)

  const mainIndex = useMemo(() => {
    let best = 0
    issues.forEach((issue, index) => {
      if (SEVERITY_RANK[issue.severity] < SEVERITY_RANK[issues[best].severity]) best = index
    })
    return best
  }, [issues])

  const groups = useMemo(() => {
    const grouped = new Map<IssueCategory, EvaluationIssue[]>()
    issues.forEach((issue, index) => {
      if (index === mainIndex) return
      const list = grouped.get(issue.category) ?? []
      list.push(issue)
      grouped.set(issue.category, list)
    })
    return [...grouped.entries()]
  }, [issues, mainIndex])

  if (issues.length === 0) {
    return <p className="jw-no-issues">✅ Tốt — không có lỗi cần sửa.</p>
  }

  const main = issues[mainIndex]
  const remaining = issues.length - 1

  return (
    <div className="jw-fb-issues">
      <h3 className="jw-fb-section-title">Vấn đề quan trọng nhất</h3>
      <div className="jw-fb-issue-main">
        <div className="jw-fb-issue-main-head">
          <span className={cx('jw-severity-chip', `jw-severity-chip--${main.severity}`)}>
            {SEVERITY_LABELS[main.severity]}
          </span>
          <span className="jw-category-chip">{CATEGORY_LABELS[main.category]}</span>
          <button
            type="button"
            className="jw-issue-jump"
            aria-pressed={selectedIssueIndex === mainIndex}
            onClick={() => onSelectIssue(mainIndex)}
          >
            {selectedIssueIndex === mainIndex ? 'Đang xem' : 'Xem câu'}
          </button>
        </div>
        <p className="jw-fb-issue-main-label">{main.explanation}</p>
        {main.original_text ? (
          <p className="jw-fb-issue-original">「{main.original_text}」</p>
        ) : null}
        {main.suggested_fix ? <p className="jw-fb-issue-fix">→ {main.suggested_fix}</p> : null}
        {main.reason ? <p className="jw-fb-issue-reason">{main.reason}</p> : null}
      </div>

      {remaining > 0 ? (
        <>
          {showAll ? (
            <div className="jw-fb-groups">
              {groups.map(([category, items]) => (
                <div key={category}>
                  <h4 className="jw-fb-group-title">{CATEGORY_LABELS[category]}</h4>
                  <ul className="jw-fb-issue-list">
                    {items.map((issue, groupIndex) => {
                      const actualIndex = issues.indexOf(issue)
                      return (
                        <IssueRow
                          key={`${category}-${groupIndex}`}
                          issue={issue}
                          index={actualIndex}
                          selected={selectedIssueIndex === actualIndex}
                          onSelect={onSelectIssue}
                        />
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className="jw-fb-toggle"
            aria-expanded={showAll}
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll ? 'Ẩn phản hồi khác' : `Xem tất cả phản hồi (${remaining})`}
          </button>
        </>
      ) : null}
    </div>
  )
}