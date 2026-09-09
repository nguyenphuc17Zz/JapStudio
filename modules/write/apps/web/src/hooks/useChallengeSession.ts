import { useCallback, useReducer, useRef } from 'react'
import { api } from '../services/api'
import type { Challenge, ChallengeAttempt } from '../types/api'

export type ChallengePhase = 'ready' | 'submitting' | 'result' | 'retry' | 'completed'

interface ChallengeState {
  phase: ChallengePhase
  challenge: Challenge | null
  attempt: ChallengeAttempt | null
  answer: string
  error: string | null
}

type ChallengeAction =
  | { type: 'reset' }
  | { type: 'challengeLoaded'; challenge: Challenge }
  | { type: 'submitStart' }
  | { type: 'submitSuccess'; attempt: ChallengeAttempt }
  | { type: 'submitError'; message: string }
  | { type: 'answer'; value: string }
  | { type: 'retry' }

function initialState(): ChallengeState {
  return {
    phase: 'ready',
    challenge: null,
    attempt: null,
    answer: '',
    error: null,
  }
}

function reducer(state: ChallengeState, action: ChallengeAction): ChallengeState {
  switch (action.type) {
    case 'reset':
      return initialState()
    case 'challengeLoaded':
      return {
        ...state,
        phase: action.challenge.completed ? 'completed' : 'ready',
        challenge: action.challenge,
        attempt: null,
        answer: '',
        error: null,
      }
    case 'submitStart':
      return { ...state, phase: 'submitting', error: null }
    case 'submitSuccess':
      return {
        ...state,
        phase: action.attempt.success ? 'completed' : 'result',
        attempt: action.attempt,
      }
    case 'submitError':
      return { ...state, phase: 'result', error: action.message }
    case 'answer':
      return { ...state, answer: action.value }
    case 'retry':
      return { ...state, phase: 'retry', error: null }
    default:
      return state
  }
}

export interface ChallengeSession {
  phase: ChallengePhase
  challenge: Challenge | null
  attempt: ChallengeAttempt | null
  answer: string
  setAnswer: (value: string) => void
  error: string | null
  generate: (payload?: { provider?: string; model?: string }) => Promise<void>
  load: (challengeId: string) => Promise<void>
  submit: (options?: { provider?: string; model?: string }) => void
  retry: () => void
  reset: () => void
}

export function useChallengeSession(): ChallengeSession {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const busyRef = useRef(false)
  const answerRef = useRef('')
  answerRef.current = state.answer

  const generate = useCallback(async (payload?: { provider?: string; model?: string }) => {
    if (busyRef.current) return
    busyRef.current = true
    dispatch({ type: 'submitStart' })
    try {
      const created = await api.generateChallenge(payload || {})
      dispatch({ type: 'challengeLoaded', challenge: created })
    } catch (err) {
      dispatch({
        type: 'submitError',
        message: err instanceof Error ? err.message : 'Không thể tạo thử thách lúc này.',
      })
    } finally {
      busyRef.current = false
    }
  }, [])

  const load = useCallback(async (challengeId: string) => {
    if (busyRef.current) return
    busyRef.current = true
    dispatch({ type: 'submitStart' })
    try {
      const loaded = await api.getChallenge(challengeId)
      dispatch({ type: 'challengeLoaded', challenge: loaded })
    } catch (err) {
      dispatch({
        type: 'submitError',
        message: err instanceof Error ? err.message : 'Không thể tải thử thách',
      })
    } finally {
      busyRef.current = false
    }
  }, [])

  const submit = useCallback((options?: { provider?: string; model?: string }) => {
    const challenge = state.challenge
    if (!challenge || busyRef.current || state.phase === 'submitting') return
    const trimmed = answerRef.current.trim()
    if (!trimmed) return
    busyRef.current = true
    dispatch({ type: 'submitStart' })
    api
      .submitChallengeAttempt(challenge.id, trimmed, options)
      .then((attempt) => dispatch({ type: 'submitSuccess', attempt }))
      .catch((err) =>
        dispatch({
          type: 'submitError',
          message: err instanceof Error ? err.message : 'Không thể đánh giá thử thách',
        }),
      )
      .finally(() => {
        busyRef.current = false
      })
  }, [state.challenge, state.phase])

  const retry = useCallback(() => {
    dispatch({ type: 'retry' })
    dispatch({ type: 'answer', value: answerRef.current })
  }, [])

  return {
    phase: state.phase,
    challenge: state.challenge,
    attempt: state.attempt,
    answer: state.answer,
    setAnswer: (value: string) => dispatch({ type: 'answer', value }),
    error: state.error,
    generate,
    load,
    submit,
    retry,
    reset: () => dispatch({ type: 'reset' }),
  }
}