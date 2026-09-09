import { useEffect, useState, type ReactNode } from 'react'
import {
  assembleBugReport,
  assembleEmail,
  isBugReportGenre,
  isEmailGenre,
  parseBugReport,
  parseEmail,
  type BugReportFields,
} from '../../../lib/scenarioText'
import { WritingEditorShell } from '../../writing/WritingEditorShell'

export interface GenreFieldsProps {
  genre: string
  answer: string
  onChange: (value: string) => void
  toolbar?: ReactNode
  footerLeft?: ReactNode
  footerRight?: ReactNode
}

const BUG_FIELDS: Array<{
  key: keyof BugReportFields
  label: string
  ariaLabel: string
  multiline?: boolean
}> = [
  { key: 'summary', label: 'Tóm tắt', ariaLabel: 'Tóm tắt lỗi (Summary)' },
  { key: 'environment', label: 'Môi trường', ariaLabel: 'Môi trường (Environment)' },
  { key: 'steps', label: 'Các bước tái hiện', ariaLabel: 'Các bước tái hiện (Steps)', multiline: true },
  { key: 'expected', label: 'Kết quả mong đợi', ariaLabel: 'Kết quả mong đợi (Expected)' },
  { key: 'actual', label: 'Kết quả thực tế', ariaLabel: 'Kết quả thực tế (Actual)' },
]

export function GenreFields({
  genre,
  answer,
  onChange,
  toolbar,
  footerLeft,
  footerRight,
}: GenreFieldsProps) {
  const email = isEmailGenre(genre)
  const bugReport = isBugReportGenre(genre)

  const parsedEmail = parseEmail(answer)
  const [subject, setSubject] = useState(parsedEmail.subject)
  useEffect(() => {
    setSubject(parsedEmail.subject)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedEmail.subject])

  const parsedBug = parseBugReport(answer)
  const [bugValues, setBugValues] = useState<BugReportFields>(parsedBug)
  useEffect(() => {
    setBugValues(parsedBug)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedBug.summary, parsedBug.environment, parsedBug.steps, parsedBug.expected, parsedBug.actual])

  if (email) {
    return (
      <div className="jw-studio-genre">
        <div className="jw-studio-genre-field">
          <label htmlFor="jw-studio-email-subject" className="jw-studio-genre-label">
            Tiêu đề
          </label>
          <input
            id="jw-studio-email-subject"
            className="jw-studio-genre-input"
            type="text"
            aria-label="Tiêu đề email"
            placeholder="件名"
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value)
              onChange(assembleEmail(event.target.value, parsedEmail.body))
            }}
          />
        </div>
        <WritingEditorShell
          value={parsedEmail.body}
          onChange={(body) => onChange(assembleEmail(subject, body))}
          toolbar={toolbar}
          footerLeft={footerLeft}
          footerRight={footerRight}
        />
      </div>
    )
  }

  if (bugReport) {
    const update = (key: keyof BugReportFields, value: string) => {
      const next = { ...bugValues, [key]: value }
      setBugValues(next)
      onChange(assembleBugReport(next))
    }
    return (
      <div className="jw-studio-genre">
        {BUG_FIELDS.map((field) => (
          <div key={field.key} className="jw-studio-genre-field">
            <label htmlFor={`jw-studio-bug-${field.key}`} className="jw-studio-genre-label">
              {field.label}
            </label>
            {field.multiline ? (
              <textarea
                id={`jw-studio-bug-${field.key}`}
                className="jw-studio-genre-input"
                rows={4}
                aria-label={field.ariaLabel}
                value={bugValues[field.key]}
                onChange={(event) => update(field.key, event.target.value)}
              />
            ) : (
              <input
                id={`jw-studio-bug-${field.key}`}
                className="jw-studio-genre-input"
                type="text"
                aria-label={field.ariaLabel}
                value={bugValues[field.key]}
                onChange={(event) => update(field.key, event.target.value)}
              />
            )}
          </div>
        ))}
        <div className="jw-studio-genre-footer">
          {footerLeft}
          {footerRight}
        </div>
      </div>
    )
  }

  return null
}