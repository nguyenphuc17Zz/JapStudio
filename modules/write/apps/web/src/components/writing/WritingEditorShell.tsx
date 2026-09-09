import { useId, useState, useRef, useEffect, useCallback, useMemo, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cx } from '../../lib/cx'
import { WritingToolbar } from './WritingToolbar'
import { EditorFooter } from './EditorFooter'
import { sound } from '../../services/sound'
import { Badge } from '../ui/Badge'
import { useVocabularyLookup } from '../../context/VocabularyLookupContext'
import { registerAnalysisEngine } from '../../services/registerAnalysisEngine'

export interface WritingEditorShellProps {
  /** Japanese writing text */
  value: string
  onChange: (value: string) => void
  /** Toolbar items rendered at the top */
  toolbar?: ReactNode
  /** Footer items; a CharacterCounter is provided by default via footerRight */
  footerLeft?: ReactNode
  footerRight?: ReactNode
  placeholder?: string
  disabled?: boolean
  className?: string
  textareaProps?: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'placeholder' | 'disabled'>
}

export function WritingEditorShell({
  value,
  onChange,
  toolbar,
  footerLeft,
  footerRight,
  placeholder = '日本語で書き始めましょう…',
  disabled = false,
  className,
  textareaProps,
}: WritingEditorShellProps) {
  const labelId = useId()
  const [genkoMode, setGenkoMode] = useState(false)
  const [tategakiMode, setTategakiMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isWriting = value.trim().length > 0

  const styleReport = useMemo(() => {
    if (!value || value.length < 5) return null
    return registerAnalysisEngine.analyze(value)
  }, [value])

  let openLookup: ((options?: { context?: string }) => void) | undefined
  let registerEditorInsertHandler: ((handler: (t: string) => void) => () => void) | undefined

  try {
    const vocabContext = useVocabularyLookup()
    openLookup = vocabContext.openLookup
    registerEditorInsertHandler = vocabContext.registerEditorInsertHandler
  } catch {
    // Component used outside VocabularyLookupProvider
  }

  const insertTextAtCursor = useCallback(
    (textToInsert: string) => {
      sound.playWashiStroke()
      const textarea = textareaRef.current
      if (textarea) {
        const start = textarea.selectionStart ?? value.length
        const end = textarea.selectionEnd ?? value.length
        const before = value.substring(0, start)
        const after = value.substring(end)
        const nextVal = before + textToInsert + after
        onChange(nextVal)
        const newPos = textToInsert === '「」' ? start + 1 : start + textToInsert.length
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(newPos, newPos)
        }, 50)
      } else {
        onChange(value ? `${value}${textToInsert}` : textToInsert)
      }
    },
    [value, onChange],
  )

  useEffect(() => {
    if (!registerEditorInsertHandler) return
    return registerEditorInsertHandler((textToInsert) => {
      insertTextAtCursor(textToInsert)
    })
  }, [registerEditorInsertHandler, insertTextAtCursor])

  const handleKeyDown = (_e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    sound.playWashiStroke()
  }

  return (
    <div
      className={cx(
        'jw-editor',
        genkoMode && 'jw-genko-canvas',
        className,
      )}
      style={{
        borderRadius: 'var(--radius-lg)',
        border: isWriting ? '1px solid var(--color-border-hover)' : '1px solid var(--color-border-subtle)',
        background: 'var(--color-surface)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
      }}
    >
      <div
        className="jw-inline jw-gap-xs"
        style={{
          padding: '8px 14px',
          borderBottom: '1px solid var(--color-border-subtle)',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        <div className="jw-inline jw-gap-xs" style={{ alignItems: 'center' }}>
          <Badge tone={isWriting ? 'accent' : 'neutral'}>
            Soạn thảo
          </Badge>
          {toolbar ? <WritingToolbar>{toolbar}</WritingToolbar> : null}
          {openLookup && (
            <button
              type="button"
              onClick={() => openLookup({ context: value })}
              className="jw-btn jw-btn--ghost jw-btn--sm"
              style={{
                fontSize: 11,
                padding: '2px 8px',
                height: 24,
              }}
              title="Tra cứu từ vựng AI theo ngữ cảnh (Ctrl+Shift+K)"
              aria-label="Tra cứu từ vựng AI"
            >
              Tra từ AI
            </button>
          )}
        </div>

        <div className="jw-inline jw-gap-xs" style={{ alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setTategakiMode((v) => !v)}
            className="jw-btn jw-btn--ghost jw-btn--sm"
            style={{
              fontSize: 11,
              padding: '2px 8px',
              height: 24,
              color: tategakiMode ? 'var(--color-accent)' : 'inherit',
              background: tategakiMode ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
            }}
            title="Bật/tắt chế độ viết dọc truyền thống Nhật Bản (縦書き Tategaki)"
            aria-label="Chế độ viết dọc Tategaki"
          >
            {tategakiMode ? 'Viết ngang' : 'Viết dọc (縦書き)'}
          </button>

          <button
            type="button"
            onClick={() => setGenkoMode((v) => !v)}
            className="jw-btn jw-btn--ghost jw-btn--sm"
            style={{
              fontSize: 11,
              padding: '2px 8px',
              height: 24,
              color: genkoMode ? 'var(--color-accent)' : 'inherit',
              background: genkoMode ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
            }}
            title="Bật/tắt lưới giấy kẻ ô kiểu Nhật (Genkō Yōshi)"
            aria-label="Lưới ô vuông Genkō Yōshi"
          >
            {genkoMode ? 'Tắt ô kẻ' : 'Ô kẻ Genkō'}
          </button>
        </div>
      </div>

      {/* Japanese Quick Punctuation & Particle Micro-Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 12px',
          background: 'rgba(0, 0, 0, 0.15)',
          borderBottom: '1px solid var(--color-border-subtle)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <span style={{ fontSize: '11px', color: 'var(--color-foreground-muted)', marginRight: '4px', flexShrink: 0 }}>
          Ký tự nhanh:
        </span>
        {[
          { char: '。', title: 'Dấu chấm câu (句点)' },
          { char: '、', title: 'Dấu phẩy (読点)' },
          { char: '「」', title: 'Ngoặc kép (カギ括弧)', insert: '「」' },
          { char: '〜', title: 'Dấu lượn sóng' },
          { char: '・', title: 'Dấu chấm giữa' },
          { char: 'を', title: 'Trợ từ を (wo)' },
          { char: 'に', title: 'Trợ từ に (ni)' },
          { char: 'で', title: 'Trợ từ で (de)' },
          { char: 'が', title: 'Trợ từ が (ga)' },
          { char: 'は', title: 'Trợ từ は (wa)' },
        ].map((item) => (
          <button
            key={item.char}
            type="button"
            onClick={() => insertTextAtCursor(item.insert || item.char)}
            title={item.title}
            aria-label={`Chèn ${item.char}`}
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontFamily: 'var(--font-japanese)',
              fontWeight: 600,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--glass-border)',
              color: 'var(--color-foreground)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            {item.char}
          </button>
        ))}
      </div>

      {styleReport && (styleReport.hasMixedRegister || styleReport.colloquialCount > 0 || styleReport.doubleKeigoCount > 0) && (
        <div
          style={{
            padding: '5px 14px',
            background: 'rgba(245, 158, 11, 0.08)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
            fontSize: '11px',
            color: 'var(--color-foreground)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: '13px', lineHeight: 1 }}>⚡</span>
          <span style={{ fontWeight: 600, color: '#f59e0b' }}>Aho-Corasick:</span>
          <span>{styleReport.summaryVi}</span>
        </div>
      )}

      <label className="jw-sr-only" htmlFor={labelId}>
        Bài viết tiếng Nhật của bạn
      </label>
      <textarea
        ref={textareaRef}
        id={labelId}
        className={cx('jw-editor-textarea', genkoMode && 'jw-genko-canvas')}

        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
        style={{
          fontFamily: 'var(--font-japanese), var(--font-sans)',
          lineHeight: genkoMode ? '32px' : 1.85,
          letterSpacing: genkoMode ? '14px' : '0.04em',
          fontSize: genkoMode ? 18 : undefined,
          writingMode: tategakiMode ? 'vertical-rl' : 'horizontal-tb',
          textOrientation: tategakiMode ? 'upright' : 'mixed',
          minHeight: tategakiMode ? 240 : 140,
          transition: 'all 0.2s ease',
          padding: genkoMode ? '16px' : undefined,
          ...(textareaProps?.style ?? {}),
        }}
        {...textareaProps}
      />
      <EditorFooter
        left={footerLeft}
        right={footerRight}
      />
    </div>
  )
}