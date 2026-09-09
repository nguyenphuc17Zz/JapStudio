import { useCallback, useEffect, useRef, useState } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null })
  const isMounted = useRef(true)
  const lastRequestId = useRef(0)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const run = useCallback(async (): Promise<T | null> => {
    const requestId = ++lastRequestId.current
    if (isMounted.current) {
      setState((current) => ({ ...current, loading: true, error: null }))
    }
    try {
      const data = await fnRef.current()
      if (isMounted.current && requestId === lastRequestId.current) {
        setState({ data, loading: false, error: null })
      }
      return data
    } catch (err) {
      // Ignore AbortError when unmounted or superseded
      if (err instanceof Error && err.name === 'AbortError') {
        return null
      }
      if (isMounted.current && requestId === lastRequestId.current) {
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định',
        })
      }
      return null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    void run()
  }, [run])

  return { ...state, run }
}