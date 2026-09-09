import { useState } from 'react'
import { cx } from '../../lib/cx'
import { Tabs } from '../ui/Tabs'
import { FuriganaText } from '../ui/FuriganaText'
import type { Corrections } from '../../types/api'

export interface CorrectionTabsProps {
  corrections: Corrections
}

interface CorrectionEntry {
  id: string
  label: string
  text: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className={cx('jw-copy-button', copied && 'jw-copy-button--done')}
      onClick={() => {
        navigator.clipboard
          ?.writeText(text)
          .then(() => setCopied(true))
          .catch(() => setCopied(false))
      }}
    >
      {copied ? 'Đã sao chép' : 'Sao chép'}
    </button>
  )
}

export function CorrectionTabs({ corrections }: CorrectionTabsProps) {
  const entries: CorrectionEntry[] = [
    { id: 'correct', label: 'Bản sửa đúng', text: corrections.correct_version },
    { id: 'natural', label: 'Bản tự nhiên', text: corrections.natural_version },
    { id: 'native', label: 'Bản như người bản xứ', text: corrections.native_version },
  ]
  ;(
    [
      { id: 'casual', label: 'Thân mật', text: corrections.casual_version },
      { id: 'polite', label: 'Lịch sự', text: corrections.polite_version },
      { id: 'business', label: 'Kinh doanh', text: corrections.business_version },
    ] as CorrectionEntry[]
  ).forEach((entry) => {
    if (entry.text !== null) entries.push(entry)
  })

  const [selected, setSelected] = useState(entries[0].id)

  return (
    <div className="jw-fb-corrections">
      <h3 className="jw-fb-section-title">Đáp án tham khảo</h3>
      <Tabs
        variant="pills"
        value={selected}
        onChange={setSelected}
        items={entries.map((entry) => ({
          id: entry.id,
          label: entry.label,
          content: (
            <div className="jw-corr-row">
              <div className="jw-corr-text jw-jp-text">
                <FuriganaText text={entry.text} />
              </div>
              <CopyButton text={entry.text} />
            </div>
          ),
        }))}
      />
    </div>
  )
}