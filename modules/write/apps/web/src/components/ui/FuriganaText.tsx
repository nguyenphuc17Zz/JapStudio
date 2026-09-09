import React, { useEffect, useState, useMemo } from 'react'
import {
  getInstantFurigana,
  fetchSudachiFurigana,
} from '../../services/furiganaClient'
import { KANJI_REGEX, type RubySegment } from '../../lib/furiganaAligner'
import { cx } from '../../lib/cx'

export interface FuriganaTextProps extends React.HTMLAttributes<HTMLElement> {
  /** Japanese text (can be raw text, or formatted with `[漢字|かんじ]` / `{漢字|かんじ}`) */
  text: string
  /** Optional reading (e.g. from vocabulary `reading="にほんご"`) to align automatically */
  reading?: string | null
  /** Optional HTML tag wrapper (defaults to 'span') */
  as?: React.ElementType
  /** Optional CSS class */
  className?: string
  /** When true, hide furigana (rt annotations) — just show kanji */
  hideFurigana?: boolean
}

export function FuriganaText({
  text,
  reading,
  as: Component = 'span',
  className,
  hideFurigana = false,
  ...rest
}: FuriganaTextProps) {
  // 1. Synchronous initial resolution if available
  const initialSegments = useMemo(() => {
    return getInstantFurigana(text, reading)
  }, [text, reading])

  const [segments, setSegments] = useState<RubySegment[]>(
    initialSegments || [{ text }],
  )

  useEffect(() => {
    if (!text) {
      setSegments([])
      return
    }

    const instant = getInstantFurigana(text, reading)
    if (instant) {
      setSegments(instant)
      return
    }

    // If text has Kanji and no reading/markup, call SudachiPy backend
    if (KANJI_REGEX.test(text)) {
      let active = true
      fetchSudachiFurigana(text).then((res) => {
        if (active) {
          setSegments(res)
        }
      })
      return () => {
        active = false
      }
    } else {
      setSegments([{ text }])
    }
  }, [text, reading])

  if (!text) return null

  return (
    <Component
      className={cx('jw-furigana-container', className)}
      lang="ja"
      data-text={text}
      {...rest}
    >
      {segments.map((seg, idx) => {
        if (seg.ruby) {
          return (
            <ruby key={idx} className="jw-ruby">
              {seg.text}
              {!hideFurigana && (
                <>
                  <rp>(</rp>
                  <rt className="jw-rt">{seg.ruby}</rt>
                  <rp>)</rp>
                </>
              )}
            </ruby>
          )
        }
        return <React.Fragment key={idx}>{seg.text}</React.Fragment>
      })}
    </Component>
  )
}
