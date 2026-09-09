import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../../lib/cx'
import { Icon, type IconName } from '../icons/Icon'
import { IconButton } from './IconButton'

export type ToastType = 'success' | 'info' | 'warning' | 'error'

export interface ToastItem {
  id: number
  type: ToastType
  title: string
  description?: string
}

export interface ToastOptions {
  description?: string
  duration?: number
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, options?: ToastOptions) => void
  success: (title: string, options?: ToastOptions) => void
  info: (title: string, options?: ToastOptions) => void
  warning: (title: string, options?: ToastOptions) => void
  error: (title: string, options?: ToastOptions) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastType, IconName> = {
  success: 'check',
  info: 'info',
  warning: 'alert',
  error: 'alert',
}

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 3500,
  info: 4000,
  warning: 5000,
  error: 7000,
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    (type: ToastType, title: string, options?: ToastOptions) => {
      const id = nextId
      nextId += 1
      setToasts((current) => [...current.slice(-4), { id, type, title, description: options?.description }])
      const duration = options?.duration ?? DEFAULT_DURATION[type]
      const timer = setTimeout(() => dismiss(id), duration)
      timersRef.current.set(id, timer)
    },
    [dismiss],
  )

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, options) => toast('success', title, options),
      info: (title, options) => toast('info', title, options),
      warning: (title, options) => toast('warning', title, options),
      error: (title, options) => toast('error', title, options),
      dismiss,
    }),
    [toast, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="jw-toast-viewport" aria-live="polite" aria-label="Thông báo">
          {toasts.map((item) => (
            <div key={item.id} className={cx('jw-toast', `jw-toast--${item.type}`)} role="status">
              <span className="jw-toast-icon" aria-hidden="true">
                <Icon name={ICONS[item.type]} size={16} />
              </span>
              <div className="jw-toast-body">
                <div className="jw-toast-title">{item.title}</div>
                {item.description ? <div className="jw-toast-desc">{item.description}</div> : null}
              </div>
              <IconButton label="Đóng thông báo" icon="x" size="sm" className="jw-toast-close" onClick={() => dismiss(item.id)} />
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}