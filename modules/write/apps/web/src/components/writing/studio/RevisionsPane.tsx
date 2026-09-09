import { Fragment, type ReactNode } from 'react'
import { cx } from '../../../lib/cx'
import { useMediaQuery } from '../../../lib/useMediaQuery'
import type {
  WritingCompareResponse,
  WritingSentenceDiff,
  WritingSubmissionResponse,
} from '../../../types/api'
import { Icon } from '../../icons/Icon'
import { Alert } from '../../ui/Alert'
import { Button } from '../../ui/Button'
import { Tabs } from '../../ui/Tabs'
import { DISCOURSE_DIMENSION_LABELS } from './studioUtils'

const HEADLINE_DELTAS: Array<{ key: string; label: string }> = [
  { key: 'overall_writing', label: 'Điểm tổng' },
  { key: 'sentence_quality', label: 'Chất lượng câu' },
  { key: 'discourse_quality', label: 'Chất lượng mạch văn' },
]

function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`
}

function DeltaRow({ label, delta }: { label: string; delta: number | undefined }) {
  return (
    <div
      className="jw-studio-compare-row"
      aria-label={`${label}: ${delta === undefined ? 'không đổi' : formatDelta(delta)}`}
    >
      <span className="jw-studio-compare-label">{label}</span>
      {delta === undefined ? (
        <span className="jw-studio-compare-value">–</span>
      ) : (
        <span
          className={cx(
            'jw-studio-compare-value',
            delta > 0 && 'jw-studio-compare-value--up',
            delta < 0 && 'jw-studio-compare-value--down',
          )}
        >
          <Icon
            name={delta > 0 ? 'arrow-up' : delta < 0 ? 'arrow-down' : 'minus'}
            size={12}
            aria-hidden="true"
          />
          {formatDelta(delta)}
        </span>
      )}
    </div>
  )
}

function SentenceDiff({ diff }: { diff: WritingSentenceDiff }) {
  const sections: Array<{
    title: string
    items: string[]
    kind: 'added' | 'removed' | 'changed'
    label: string
    empty: string
  }> = [
    {
      title: 'Câu đã thêm',
      items: diff.added,
      kind: 'added',
      label: 'Đã thêm',
      empty: 'Không có câu nào được thêm.',
    },
    {
      title: 'Câu đã bỏ',
      items: diff.removed,
      kind: 'removed',
      label: 'Đã bỏ',
      empty: 'Không có câu nào bị bỏ.',
    },
    {
      title: 'Câu thay đổi nội dung',
      items: diff.changed,
      kind: 'changed',
      label: 'Thay đổi nội dung',
      empty: 'Không có câu nào thay đổi nội dung.',
    },
  ]
  return (
    <div className="jw-studio-diff">
      {sections.map((section) => (
        <div key={section.kind} className="jw-studio-diff-section">
          <h5>{section.title}</h5>
          {section.items.length > 0 ? (
            <ul className="jw-studio-diff-list">
              {section.items.map((text, index) => (
                <li
                  key={`${section.kind}-${index}`}
                  className={cx('jw-studio-diff-item', `jw-studio-diff-item--${section.kind}`)}
                  aria-label={`${section.label}: ${text}`}
                >
                  <span className="jw-studio-diff-mark" aria-hidden="true">
                    {section.kind === 'added' ? '＋' : section.kind === 'removed' ? '−' : '±'}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="jw-studio-diff-empty">{section.empty}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function CompareView({
  compare,
  submission,
  onBackToLatest,
}: {
  compare: WritingCompareResponse
  submission: WritingSubmissionResponse
  onBackToLatest: () => void
}) {
  const toScore = submission.revisions.find(
    (revision) => revision.revision_number === compare.to_revision,
  )?.overall_writing
  const overallDelta = compare.deltas.overall_writing
  const dimensionDeltas = Object.keys(compare.deltas)
    .filter((key) => DISCOURSE_DIMENSION_LABELS[key] !== undefined)
    .map((key) => ({ key, delta: compare.deltas[key] }))

  return (
    <div className="jw-studio-compare">
      <div className="jw-studio-compare-head">
        <div>
          <h4>
            So sánh bản {compare.from_revision} → bản {compare.to_revision}
          </h4>
          <p className="jw-studio-compare-meta">
            Bản {compare.to_revision}
            {toScore !== undefined ? `, ${toScore}` : ''}
            {overallDelta !== undefined
              ? `, ${formatDelta(overallDelta)} so với bản ${compare.from_revision}`
              : ''}
          </p>
        </div>
        <Button variant="secondary" onClick={onBackToLatest}>
          Về bản mới nhất
        </Button>
      </div>

      <div className="jw-studio-compare-deltas">
        {HEADLINE_DELTAS.map(({ key, label }) => (
          <DeltaRow key={key} label={label} delta={compare.deltas[key]} />
        ))}
        {dimensionDeltas.map(({ key, delta }) => (
          <DeltaRow key={key} label={DISCOURSE_DIMENSION_LABELS[key] ?? key} delta={delta} />
        ))}
      </div>

      <SentenceDiff diff={compare.sentence_diff} />

      {compare.guidance ? (
        <div className="jw-studio-guidance">
          <h5>Nhận xét của AI về bản sửa</h5>
          <p>{compare.guidance}</p>
        </div>
      ) : null}
    </div>
  )
}

export interface RevisionsPaneProps {
  submission: WritingSubmissionResponse
  compare: WritingCompareResponse | null
  actionError: string | null
  review: ReactNode
  onSelectRevision: (revisionNumber: number) => void
  onBackToLatest: () => void
}

export function RevisionsPane({
  submission,
  compare,
  actionError,
  review,
  onSelectRevision,
  onBackToLatest,
}: RevisionsPaneProps) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const revisions = submission.revisions
  const active = compare ? compare.from_revision : (revisions.at(-1)?.revision_number ?? 1)

  return (
    <div className="jw-studio-revisions">
      {isMobile ? (
        <Tabs
          variant="pills"
          value={String(active)}
          onChange={(id) => onSelectRevision(Number(id))}
          items={revisions.map((revision) => ({
            id: String(revision.revision_number),
            label: `Bản ${revision.revision_number}`,
            content: null,
          }))}
        />
      ) : (
        <div className="jw-studio-timeline" aria-label="Các bản viết">
          {revisions.map((revision, index) => (
            <Fragment key={revision.id}>
              {index > 0 ? (
                <span className="jw-studio-timeline-arrow" aria-hidden="true">
                  →
                </span>
              ) : null}
              <button
                type="button"
                className={cx(
                  'jw-studio-timeline-chip',
                  active === revision.revision_number && 'jw-studio-timeline-chip--active',
                )}
                aria-current={active === revision.revision_number ? 'step' : undefined}
                onClick={() => onSelectRevision(revision.revision_number)}
              >
                Bản {revision.revision_number} · {revision.overall_writing ?? '–'}
              </button>
            </Fragment>
          ))}
        </div>
      )}

      {compare ? (
        <>
          {actionError ? <Alert tone="error">{actionError}</Alert> : null}
          <CompareView
            compare={compare}
            submission={submission}
            onBackToLatest={onBackToLatest}
          />
        </>
      ) : (
        review
      )}
    </div>
  )
}