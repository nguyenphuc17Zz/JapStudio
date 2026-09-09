import { useCallback, useEffect, useReducer, useRef } from 'react'
import { api } from '../services/api'
import type {
  SimulationCoachResponse,
  SimulationExplainResponse,
  SimulationMode,
  SimulationSessionResponse,
  SimulationSummaryResponse,
} from '../types/api'

export type SimulationPhase =
  | 'setup'
  | 'starting'
  | 'active'
  | 'submitting_turn'
  | 'receiving_ai'
  | 'turn_feedback'
  | 'completed'
  | 'summary'
  | 'coach'
  | 'error'

const DRAFT_PREFIX = 'sim-draft:'

export interface PersonaInfo {
  name: string
  role: string
  initial: string
}

export function personaInfo(persona: Record<string, unknown> | null): PersonaInfo | null {
  if (!persona) return null
  const name = typeof persona.name === 'string' && persona.name ? persona.name : 'Khách hàng'
  const role = typeof persona.role === 'string' ? persona.role : ''
  const initial =
    typeof persona.initial === 'string' && persona.initial ? persona.initial : name.charAt(0)
  return { name, role, initial }
}

interface SimulationState {
  phase: SimulationPhase
  session: SimulationSessionResponse | null
  summary: SimulationSummaryResponse | null
  summaryLoading: boolean
  draft: string
  draftSaved: boolean
  error: string | null
  coachOpen: boolean
  coachAnswer: SimulationCoachResponse | null
  coachLoading: boolean
  coachError: string | null
  explaining: string | null
  explanations: Record<string, SimulationExplainResponse>
}

type SimulationAction =
  | { type: 'reset' }
  | { type: 'createStart' }
  | { type: 'sessionReady'; session: SimulationSessionResponse }
  | { type: 'sessionEnded'; session: SimulationSessionResponse }
  | { type: 'submitStart' }
  | { type: 'turnError'; message: string }
  | { type: 'createError'; message: string }
  | { type: 'summaryStart' }
  | { type: 'summarySuccess'; summary: SimulationSummaryResponse }
  | { type: 'summaryError'; message: string }
  | { type: 'draft'; value: string }
  | { type: 'draftSaved' }
  | { type: 'draftCleared' }
  | { type: 'coachToggle'; open: boolean }
  | { type: 'coachStart' }
  | { type: 'coachSuccess'; response: SimulationCoachResponse }
  | { type: 'coachError'; message: string }
  | { type: 'explainStart'; turnId: string }
  | { type: 'explainSuccess'; turnId: string; response: SimulationExplainResponse }
  | { type: 'explainError'; message: string }

function initialState(): SimulationState {
  return {
    phase: 'setup',
    session: null,
    summary: null,
    summaryLoading: false,
    draft: '',
    draftSaved: true,
    error: null,
    coachOpen: false,
    coachAnswer: null,
    coachLoading: false,
    coachError: null,
    explaining: null,
    explanations: {},
  }
}

function reducer(state: SimulationState, action: SimulationAction): SimulationState {
  switch (action.type) {
    case 'reset':
      return initialState()
    case 'createStart':
      return { ...state, phase: 'starting', error: null }
    case 'sessionReady':
      return { ...state, phase: 'active', session: action.session, error: null }
    case 'sessionEnded':
      return { ...state, phase: 'completed', session: action.session, error: null }
    case 'submitStart':
      return { ...state, phase: 'submitting_turn', error: null }
    case 'turnError':
      return { ...state, phase: 'active', error: action.message }
    case 'createError':
      return { ...state, phase: 'setup', session: null, error: action.message }
    case 'summaryStart':
      return { ...state, summaryLoading: true }
    case 'summarySuccess':
      return { ...state, summary: action.summary, summaryLoading: false }
    case 'summaryError':
      return { ...state, summaryLoading: false, error: action.message }
    case 'draft':
      return { ...state, draft: action.value, draftSaved: false }
    case 'draftSaved':
      return { ...state, draftSaved: true }
    case 'draftCleared':
      return { ...state, draft: '', draftSaved: true }
    case 'coachToggle':
      return { ...state, coachOpen: action.open, coachError: null }
    case 'coachStart':
      return { ...state, coachLoading: true, coachError: null }
    case 'coachSuccess':
      return { ...state, coachLoading: false, coachAnswer: action.response }
    case 'coachError':
      return { ...state, coachLoading: false, coachError: action.message }
    case 'explainStart':
      return { ...state, explaining: action.turnId }
    case 'explainSuccess':
      return {
        ...state,
        explaining: null,
        explanations: { ...state.explanations, [action.turnId]: action.response },
      }
    case 'explainError':
      return { ...state, explaining: null, error: action.message }
    default:
      return state
  }
}

export interface SimulationSession {
  phase: SimulationPhase
  session: SimulationSessionResponse | null
  summary: SimulationSummaryResponse | null
  summaryLoading: boolean
  draft: string
  draftSaved: boolean
  error: string | null
  goalProgress: number
  coachOpen: boolean
  coachAnswer: SimulationCoachResponse | null
  coachLoading: boolean
  coachError: string | null
  explaining: string | null
  explanations: Record<string, SimulationExplainResponse>
  persona: PersonaInfo | null
  createSession: (
    scenarioId: string,
    mode: SimulationMode,
    options?: { provider?: string; model?: string },
  ) => Promise<void>
  openSession: (sessionId: string) => Promise<void>
  submitTurn: (
    text: string,
    endEarly?: boolean,
    options?: { provider?: string; model?: string },
  ) => Promise<boolean>
  setDraft: (value: string) => void
  clearDraft: () => void
  setCoachOpen: (open: boolean) => void
  askCoach: (question: string, options?: { provider?: string; model?: string }) => void
  explain: (turnId: string) => void
  reset: () => void
}

export function useSimulationSession(): SimulationSession {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const busyRef = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const sessionId = state.session?.id
    if (!sessionId || state.phase !== 'active') return
    const key = `${DRAFT_PREFIX}${sessionId}`
    let saved = false
    if (state.draft) {
      const timer = window.setTimeout(() => {
        try {
          window.localStorage.setItem(key, state.draft)
          saved = true
        } catch {
          saved = false
        }
        dispatch({ type: 'draftSaved' })
      }, 400)
      return () => {
        window.clearTimeout(timer)
        if (saved) dispatch({ type: 'draftSaved' })
      }
    }
    return undefined
  }, [state.draft, state.phase, state.session?.id])

  const loadSummary = useCallback((sessionId: string) => {
    dispatch({ type: 'summaryStart' })
    api
      .getSimulationSummary(sessionId)
      .then((summary) => dispatch({ type: 'summarySuccess', summary }))
      .catch((err) =>
        dispatch({
          type: 'summaryError',
          message: err instanceof Error ? err.message : 'Không thể tải tổng kết',
        }),
      )
  }, [])

  const adoptSession = useCallback(
    (session: SimulationSessionResponse) => {
      const key = `${DRAFT_PREFIX}${session.id}`
      let draft = ''
      try {
        draft = window.localStorage.getItem(key) ?? ''
      } catch {
        draft = ''
      }
      dispatch({ type: 'sessionReady', session })
      dispatch({ type: 'draft', value: draft })
      if (session.status !== 'active') {
        dispatch({ type: 'sessionEnded', session })
        loadSummary(session.id)
      }
    },
    [loadSummary],
  )

  const createSession = useCallback(
    async (
      scenarioId: string,
      mode: SimulationMode,
      options?: { provider?: string; model?: string },
    ) => {
      if (busyRef.current) return
      busyRef.current = true
      dispatch({ type: 'createStart' })
      try {
        const created = await api.createSimulation({
          scenario_id: scenarioId,
          mode,
          provider: options?.provider,
          model: options?.model,
        })
        adoptSession(created)
      } catch (err) {
        dispatch({
          type: 'createError',
          message: err instanceof Error ? err.message : 'Không thể bắt đầu mô phỏng',
        })
      } finally {
        busyRef.current = false
      }
    },
    [adoptSession],
  )

  const openSession = useCallback(
    async (sessionId: string) => {
      if (busyRef.current) return
      busyRef.current = true
      dispatch({ type: 'createStart' })
      try {
        const loaded = await api.getSimulation(sessionId)
        adoptSession(loaded)
      } catch (err) {
        dispatch({
          type: 'createError',
          message: err instanceof Error ? err.message : 'Không thể mở mô phỏng',
        })
      } finally {
        busyRef.current = false
      }
    },
    [adoptSession],
  )

  const submitTurn = useCallback(
    async (
      text: string,
      endEarly = false,
      options?: { provider?: string; model?: string },
    ): Promise<boolean> => {
      const session = stateRef.current.session
      if (!session || busyRef.current) return false
      if (!endEarly && !text.trim()) return false
      busyRef.current = true
      dispatch({ type: 'submitStart' })
      try {
        const updated = await api.submitSimulationTurn(session.id, text.trim(), endEarly, options)
        const key = `${DRAFT_PREFIX}${session.id}`
        try {
          window.localStorage.removeItem(key)
        } catch {
          // Storage unavailable; draft stays local.
        }
        dispatch({ type: 'draftCleared' })
        if (updated.status !== 'active') {
          dispatch({ type: 'sessionEnded', session: updated })
          loadSummary(updated.id)
        } else {
          adoptSession(updated)
        }
        return true
      } catch (err) {
        dispatch({
          type: 'turnError',
          message:
            err instanceof Error
              ? err.message
              : 'Không thể tiếp tục mô phỏng. Nội dung trước đó vẫn được giữ lại.',
        })
        return false
      } finally {
        busyRef.current = false
      }
    },
    [adoptSession, loadSummary],
  )

  const explain = useCallback(
    (turnId: string) => {
      const session = stateRef.current.session
      if (!session || stateRef.current.explaining) return
      dispatch({ type: 'explainStart', turnId })
      api
        .explainSimulationTurn(session.id, turnId)
        .then((response) => dispatch({ type: 'explainSuccess', turnId, response }))
        .catch((err) =>
          dispatch({
            type: 'explainError',
            message: err instanceof Error ? err.message : 'Không thể giải thích lượt trả lời',
          }),
        )
    },
    [],
  )

  const askCoach = useCallback(
    (question: string, options?: { provider?: string; model?: string }) => {
      const session = stateRef.current.session
      if (!session || stateRef.current.coachLoading) return
      dispatch({ type: 'coachStart' })
      api
        .askSimulationCoach(session.id, question, options)
        .then((response) => dispatch({ type: 'coachSuccess', response }))
        .catch((err) =>
          dispatch({
            type: 'coachError',
            message: err instanceof Error ? err.message : 'AI Coach tạm thời không khả dụng.',
          }),
        )
    },
    [],
  )

  const session = state.session
  const completedCount = session?.state.completed_items.length ?? 0
  const unresolvedCount = session?.state.unresolved_items.length ?? 0
  const totalCount = completedCount + unresolvedCount
  const goalProgress =
    totalCount > 0
      ? Math.round((completedCount / totalCount) * 100)
      : session?.turns
        ? (() => {
            const lastUser = [...session.turns]
              .reverse()
              .find((turn) => turn.actor === 'user' && turn.evaluation !== null)
            return lastUser?.evaluation?.goal_progress ?? 0
          })()
        : 0

  const persona = personaInfo(session?.persona ?? null)

  return {
    phase: state.phase,
    session: state.session,
    summary: state.summary,
    summaryLoading: state.summaryLoading,
    draft: state.draft,
    draftSaved: state.draftSaved,
    error: state.error,
    goalProgress,
    coachOpen: state.coachOpen,
    coachAnswer: state.coachAnswer,
    coachLoading: state.coachLoading,
    coachError: state.coachError,
    explaining: state.explaining,
    explanations: state.explanations,
    persona,
    createSession,
    openSession,
    submitTurn,
    setDraft: (value: string) => dispatch({ type: 'draft', value }),
    clearDraft: () => dispatch({ type: 'draftCleared' }),
    setCoachOpen: (open: boolean) => dispatch({ type: 'coachToggle', open }),
    askCoach,
    explain,
    reset: () => dispatch({ type: 'reset' }),
  }
}