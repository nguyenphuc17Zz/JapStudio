import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Register, VocabLookupDirection } from '../types/api'

export interface OpenLookupOptions {
  query?: string
  context?: string
  direction?: VocabLookupDirection
  register?: Register | ''
  autoSearch?: boolean
}

export type EditorInsertHandler = (text: string) => void

interface VocabularyLookupContextValue {
  isOpen: boolean
  query: string
  contextText: string
  direction: VocabLookupDirection
  registerPreference: Register | ''
  autoSearchTrigger: number
  openLookup: (options?: OpenLookupOptions) => void
  closeLookup: () => void
  triggerSearch: () => void
  setQuery: (q: string) => void
  setContextText: (c: string) => void
  setDirection: (d: VocabLookupDirection) => void
  setRegisterPreference: (r: Register | '') => void
  insertText: (text: string) => boolean
  registerEditorInsertHandler: (handler: EditorInsertHandler) => () => void
}

const VocabularyLookupContext = createContext<VocabularyLookupContextValue | null>(null)

export function VocabularyLookupProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [contextText, setContextText] = useState('')
  const [direction, setDirection] = useState<VocabLookupDirection>('auto')
  const [registerPreference, setRegisterPreference] = useState<Register | ''>('')
  const [autoSearchTrigger, setAutoSearchTrigger] = useState(0)
  
  const insertHandlerRef = useRef<EditorInsertHandler | null>(null)

  const triggerSearch = useCallback(() => {
    setAutoSearchTrigger((prev) => prev + 1)
  }, [])

  const openLookup = useCallback((options?: OpenLookupOptions) => {
    if (options?.query !== undefined) setQuery(options.query)
    if (options?.context !== undefined) setContextText(options.context)
    if (options?.direction !== undefined) setDirection(options.direction)
    if (options?.register !== undefined) setRegisterPreference(options.register)
    setIsOpen(true)

    // If query is non-empty or autoSearch is requested, immediately trigger auto search
    if (options?.query?.trim() || options?.autoSearch) {
      setAutoSearchTrigger((prev) => prev + 1)
    }
  }, [])

  const closeLookup = useCallback(() => {
    setIsOpen(false)
  }, [])


  const registerEditorInsertHandler = useCallback((handler: EditorInsertHandler) => {
    insertHandlerRef.current = handler
    return () => {
      if (insertHandlerRef.current === handler) {
        insertHandlerRef.current = null
      }
    }
  }, [])

  const insertText = useCallback((text: string): boolean => {
    if (insertHandlerRef.current) {
      insertHandlerRef.current(text)
      return true
    }
    // Fallback to clipboard copy
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {})
    }
    return false
  }, [])

function getCurrentlySelectedInfo(): { query: string; context: string } {
  // 1. Check if active element is input or textarea
  const active = document.activeElement
  if (
    active &&
    (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)
  ) {
    const start = active.selectionStart ?? 0
    const end = active.selectionEnd ?? 0
    if (end > start) {
      const selected = active.value.substring(start, end).trim()
      if (selected) {
        return {
          query: selected,
          context: active.value.trim(),
        }
      }
    }
  }

  // 2. Check window.getSelection()
  const sel = window.getSelection()
  if (sel && !sel.isCollapsed) {
    const text = sel.toString().trim()
    if (text) {
      let context = ''
      try {
        const node = sel.anchorNode
        const parent =
          node?.nodeType === Node.ELEMENT_NODE
            ? (node as HTMLElement)
            : node?.parentElement
        const block = parent?.closest(
          'p, div, li, blockquote, article, section, td, th, h1, h2, h3, h4, h5, h6',
        )
        context = (block?.textContent || parent?.textContent || '').trim()
      } catch {
        context = ''
      }
      return { query: text, context }
    }
  }

  return { query: '', context: '' }
}

  // Global Keyboard Shortcut: Ctrl+Shift+K, Ctrl+K, or Alt+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+K always triggers global lookup
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
        e.preventDefault()
        if (isOpen) {
          closeLookup()
        } else {
          const { query: selQuery, context: selContext } = getCurrentlySelectedInfo()
          openLookup({
            query: selQuery || undefined,
            context: selContext || undefined,
          })
        }
        return
      }

      // Ctrl+K opens when not typing inside input/textarea unless text is selected
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K') && !e.shiftKey) {
        const tag = (document.activeElement?.tagName || '').toLowerCase()
        const { query: selQuery, context: selContext } = getCurrentlySelectedInfo()
        if (selQuery || (tag !== 'input' && tag !== 'textarea')) {
          e.preventDefault()
          if (isOpen) {
            closeLookup()
          } else {
            openLookup({
              query: selQuery || undefined,
              context: selContext || undefined,
            })
          }
        }
      }

      // Escape closes
      if (e.key === 'Escape' && isOpen) {
        closeLookup()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, openLookup, closeLookup])


  return (
    <VocabularyLookupContext.Provider
      value={{
        isOpen,
        query,
        contextText,
        direction,
        registerPreference,
        autoSearchTrigger,
        openLookup,
        closeLookup,
        triggerSearch,
        setQuery,
        setContextText,
        setDirection,
        setRegisterPreference,
        insertText,
        registerEditorInsertHandler,
      }}
    >
      {children}
    </VocabularyLookupContext.Provider>

  )
}

export function useVocabularyLookup() {
  const ctx = useContext(VocabularyLookupContext)
  if (!ctx) {
    throw new Error('useVocabularyLookup must be used within a VocabularyLookupProvider')
  }
  return ctx
}
