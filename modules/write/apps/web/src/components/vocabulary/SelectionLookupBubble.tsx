import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useVocabularyLookup } from '../../context/VocabularyLookupContext'
import { sound } from '../../services/sound'

interface BubblePosition {
  top: number
  left: number
}

export function SelectionLookupBubble() {
  const { openLookup, isOpen } = useVocabularyLookup()
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<BubblePosition>({ top: 0, left: 0 })
  const [selectedWord, setSelectedWord] = useState('')
  const [selectedContext, setSelectedContext] = useState('')
  const bubbleRef = useRef<HTMLDivElement>(null)

  const handleSelection = useCallback(() => {
    // If the modal is already open, do not show selection bubble
    if (isOpen) {
      setVisible(false)
      return
    }

    // 1. Check if selection is within an active input or textarea
    const active = document.activeElement
    if (
      active &&
      (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)
    ) {
      const start = active.selectionStart ?? 0
      const end = active.selectionEnd ?? 0
      if (end > start) {
        const text = active.value.substring(start, end).trim()
        if (text && text.length <= 80) {
          const rect = active.getBoundingClientRect()
          const top = Math.max(10, rect.top - 38)
          const left = Math.max(10, rect.left + rect.width / 2)

          setSelectedWord(text)
          setSelectedContext(active.value.trim())
          setPosition({ top, left })
          setVisible(true)
          return
        }
      }
    }

    // 2. Standard DOM selection (paragraphs, cards, headers, tables, etc.)
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      setVisible(false)
      return
    }

    const text = selection.toString().trim()
    // Trigger for words or phrases up to 80 characters
    if (!text || text.length > 80) {
      setVisible(false)
      return
    }

    // Extract surrounding paragraph or container as context
    let fullContext = ''
    try {
      const anchorNode = selection.anchorNode
      if (anchorNode) {
        const parentElem =
          anchorNode.nodeType === Node.ELEMENT_NODE
            ? (anchorNode as HTMLElement)
            : anchorNode.parentElement
        const block = parentElem?.closest(
          'p, div, li, blockquote, article, section, td, th, h1, h2, h3, h4, h5, h6',
        )
        fullContext = (block?.textContent || parentElem?.textContent || '').trim()
      }
    } catch {
      fullContext = ''
    }

    try {
      if (selection.rangeCount === 0) {
        setVisible(false)
        return
      }
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      if (rect.width === 0 && rect.height === 0) {
        setVisible(false)
        return
      }

      // Position bubble above the selected text with fixed coordinates
      const top = Math.max(10, rect.top - 38)
      const left = Math.max(20, Math.min(window.innerWidth - 20, rect.left + rect.width / 2))

      setSelectedWord(text)
      setSelectedContext(fullContext)
      setPosition({ top, left })
      setVisible(true)
    } catch {
      setVisible(false)
    }
  }, [isOpen])

  useEffect(() => {
    const onMouseUp = () => {
      setTimeout(handleSelection, 60)
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (
        e.key === 'Shift' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown'
      ) {
        setTimeout(handleSelection, 60)
      }
    }

    const onDoubleClick = () => {
      setTimeout(handleSelection, 60)
    }

    const onMouseDown = (e: MouseEvent) => {
      if (bubbleRef.current && bubbleRef.current.contains(e.target as Node)) {
        return
      }
      setVisible(false)
    }

    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('keyup', onKeyUp)
    document.addEventListener('dblclick', onDoubleClick)
    document.addEventListener('mousedown', onMouseDown)

    return () => {
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('dblclick', onDoubleClick)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [handleSelection])

  if (!visible || isOpen) return null

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    sound.playWashiStroke()
    openLookup({
      query: selectedWord,
      context: selectedContext || undefined,
      direction: 'auto',
    })
    setVisible(false)
  }

  return createPortal(
    <div
      ref={bubbleRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
        zIndex: 9990,
        pointerEvents: 'auto',
        animation: 'jw-fade-in 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 12px',
          borderRadius: 'var(--radius-full, 9999px)',
          background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          color: 'var(--color-on-accent, #ffffff)',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 18px rgba(139, 92, 246, 0.55), 0 2px 6px rgba(0, 0, 0, 0.3)',
          transition: 'transform 0.15s ease, filter 0.15s ease',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.06)'
          e.currentTarget.style.filter = 'brightness(1.15)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.filter = 'brightness(1)'
        }}
      >
        <span style={{ fontSize: '13px' }}>✦</span>
        <span>
          Tra AI「
          {selectedWord.length > 12 ? `${selectedWord.slice(0, 12)}…` : selectedWord}
          」
        </span>
      </button>
    </div>,
    document.body,
  )
}

