import { useCallback, useEffect, useReducer, useRef } from 'react'
import { api } from '../services/api'
import type {
  AttemptEvaluationResponse,
  AttemptVocabularyItem,
  Corrections,
  Exercise,
  GamificationTodayResponse,
} from '../types/api'

export type PracticePhase = 'writing' | 'submitting' | 'result' | 'completed' | 'error'

export interface DailyGoalInfo {
  completed: boolean
  completedCount: number
  target: number
}

interface SessionState {
  phase: PracticePhase
  answer: string
  submitError: string | null
  actionError: string | null
  evaluation: AttemptEvaluationResponse | null
  previousEvaluation: AttemptEvaluationResponse | null
  hints: string[]
  hintsTotal: number
  revealAvailable: boolean
  revealed: boolean
  hintPending: boolean
  revealPending: boolean
  vocabulary: AttemptVocabularyItem[] | null
  xpGained: number | null
  missionCompleted: boolean
  dailyGoal: DailyGoalInfo | null
  /** True after an evaluation produced by a real submission (not history restore) */
  submitted: boolean
}

type SessionAction =
  | { type: 'answer'; value: string }
  | { type: 'reset' }
  | { type: 'restorePrevious'; evaluation: AttemptEvaluationResponse }
  | { type: 'submitStart' }
  | {
      type: 'submitSuccess'
      evaluation: AttemptEvaluationResponse
      previous: AttemptEvaluationResponse | null
    }
  | { type: 'submitError'; message: string }
  | { type: 'gamification'; gamification: GamificationTodayResponse; baselineXp: number }
  | { type: 'vocabulary'; items: AttemptVocabularyItem[] }
  | { type: 'hintStart' }
  | { type: 'hintSuccess'; hint: string; revealAvailable: boolean }
  | { type: 'hintError'; message: string }
  | { type: 'revealStart' }
  | { type: 'revealSuccess'; corrections: Corrections }
  | { type: 'revealError'; message: string }
  | { type: 'retry' }
  | { type: 'complete' }

function initialState(): SessionState {
  return {
    phase: 'writing',
    answer: '',
    submitError: null,
    actionError: null,
    evaluation: null,
    previousEvaluation: null,
    hints: [],
    hintsTotal: 0,
    revealAvailable: false,
    revealed: false,
    hintPending: false,
    revealPending: false,
    vocabulary: null,
    xpGained: null,
    missionCompleted: false,
    dailyGoal: null,
    submitted: false,
  }
}

function reducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'answer':
      return { ...state, answer: action.value }
    case 'reset':
      return initialState()
    case 'restorePrevious':
      return {
        ...state,
        evaluation: action.evaluation,
        previousEvaluation: null,
        hints: action.evaluation.hints.slice(0, action.evaluation.learning_mode.hints_revealed_count),
        hintsTotal: action.evaluation.learning_mode.hints_total,
        revealAvailable: action.evaluation.learning_mode.reveal_available,
        revealed: action.evaluation.corrections !== null,
      }
    case 'submitStart':
      return { ...state, phase: 'submitting', submitError: null, actionError: null }
    case 'submitSuccess': {
      const learningMode = action.evaluation.learning_mode
      return {
        ...state,
        phase: 'result',
        evaluation: action.evaluation,
        previousEvaluation: action.previous,
        hints: action.evaluation.hints.slice(0, learningMode.hints_revealed_count),
        hintsTotal: learningMode.hints_total,
        revealAvailable: learningMode.reveal_available,
        revealed: !learningMode.enabled && action.evaluation.corrections !== null,
        hintPending: false,
        revealPending: false,
        vocabulary: null,
        submitted: true,
      }
    }
    case 'submitError':
      return { ...state, phase: 'error', submitError: action.message }
    case 'gamification': {
      const summary = action.gamification.summary
      const gained = Math.max(0, summary.today_xp - action.baselineXp)
      return {
        ...state,
        xpGained: gained > 0 ? gained : state.xpGained,
        missionCompleted:
          action.gamification.mission?.completed === true || state.missionCompleted,
        dailyGoal: {
          completed: summary.daily_goal.completed,
          completedCount: summary.daily_goal.completed_count,
          target: summary.daily_goal.target,
        },
      }
    }
    case 'vocabulary':
      return { ...state, vocabulary: action.items }
    case 'hintStart':
      return { ...state, hintPending: true, actionError: null }
    case 'hintSuccess':
      return {
        ...state,
        hintPending: false,
        hints: [...state.hints, action.hint],
        revealAvailable: action.revealAvailable,
      }
    case 'hintError':
      return { ...state, hintPending: false, actionError: action.message }
    case 'revealStart':
      return { ...state, revealPending: true, actionError: null }
    case 'revealSuccess':
      return {
        ...state,
        revealPending: false,
        revealed: true,
        evaluation: state.evaluation
          ? { ...state.evaluation, corrections: action.corrections }
          : state.evaluation,
      }
    case 'revealError':
      return { ...state, revealPending: false, actionError: action.message }
    case 'retry':
      return { ...state, phase: 'writing', submitError: null, actionError: null }
    case 'complete':
      return { ...state, phase: 'completed' }
    default:
      return state
  }
}

export interface PracticeSession {
  phase: PracticePhase
  answer: string
  setAnswer: (value: string) => void
  evaluation: AttemptEvaluationResponse | null
  previousEvaluation: AttemptEvaluationResponse | null
  hints: string[]
  hintsTotal: number
  revealAvailable: boolean
  revealed: boolean
  hintPending: boolean
  revealPending: boolean
  submitError: string | null
  actionError: string | null
  vocabulary: AttemptVocabularyItem[] | null
  xpGained: number | null
  missionCompleted: boolean
  dailyGoal: DailyGoalInfo | null
  submitted: boolean
  submit: () => void
  requestHint: () => void
  reveal: () => void
  retry: () => void
  complete: () => void
}

export function usePracticeSession(
  exercise: Exercise,
  options?: { provider?: string; model?: string },
): PracticeSession {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  const submittingRef = useRef(false)
  const baselineXpRef = useRef(0)
  const lastEvaluationRef = useRef<AttemptEvaluationResponse | null>(null)
  const answerRef = useRef('')
  answerRef.current = state.answer

  useEffect(() => {
    dispatch({ type: 'reset' })
    submittingRef.current = false
    baselineXpRef.current = 0
    lastEvaluationRef.current = null

    api
      .getGamificationToday()
      .then((gamification) => {
        baselineXpRef.current = gamification.summary.today_xp
      })
      .catch(() => {
        // Gamification is non-critical; the session continues without it.
      })

    api
      .listAttempts(exercise.id)
      .then(async (response) => {
        if (response.items.length > 0) {
          try {
            const latest = await api.getAttempt(exercise.id, response.items[0].id)
            lastEvaluationRef.current = latest
            dispatch({ type: 'restorePrevious', evaluation: latest })
          } catch {
            // Previous attempt could not be loaded; start fresh.
          }
        }
      })
      .catch(() => {
        // No history available.
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id])

  const submit = useCallback(() => {
    const trimmed = answerRef.current.trim()
    if (!trimmed || submittingRef.current) return
    submittingRef.current = true
    dispatch({ type: 'submitStart' })
    api
      .submitAttempt(exercise.id, trimmed, {
        provider: options?.provider,
        model: options?.model,
      })
      .then(async (evaluation) => {
        dispatch({
          type: 'submitSuccess',
          evaluation,
          previous: lastEvaluationRef.current,
        })
        lastEvaluationRef.current = evaluation
        if (!evaluation.learning_mode?.enabled && !evaluation.corrections) {
          api
            .revealAttempt(exercise.id, evaluation.id)
            .then((res) => {
              if (res.corrections) {
                dispatch({ type: 'revealSuccess', corrections: res.corrections })
              }
            })
            .catch(() => {})
        }
        try {
          const gamification = await api.getGamificationToday()
          dispatch({
            type: 'gamification',
            gamification,
            baselineXp: baselineXpRef.current,
          })
        } catch {
          // Non-critical.
        }
        api
          .listAttemptVocabulary(exercise.id, evaluation.id)
          .then((response) =>
            dispatch({
              type: 'vocabulary',
              items: Array.isArray(response.items) ? response.items : [],
            }),
          )
          .catch(() => dispatch({ type: 'vocabulary', items: [] }))
      })
      .catch((err) => {
        dispatch({
          type: 'submitError',
          message: err instanceof Error ? err.message : 'Không thể đánh giá câu trả lời',
        })
      })
      .finally(() => {
        submittingRef.current = false
      })
  }, [exercise.id, options?.provider, options?.model])

  const requestHint = useCallback(() => {
    const evaluation = lastEvaluationRef.current
    if (!evaluation || state.hintPending || state.revealPending) return
    dispatch({ type: 'hintStart' })
    api
      .nextHint(exercise.id, evaluation.id)
      .then((response) =>
        dispatch({ type: 'hintSuccess', hint: response.hint, revealAvailable: response.reveal_available }),
      )
      .catch((err) =>
        dispatch({
          type: 'hintError',
          message: err instanceof Error ? err.message : 'Không thể lấy gợi ý',
        }),
      )
  }, [exercise.id, state.hintPending, state.revealPending])

  const reveal = useCallback(() => {
    const evaluation = lastEvaluationRef.current
    if (!evaluation || state.revealPending) return
    dispatch({ type: 'revealStart' })
    api
      .revealAttempt(exercise.id, evaluation.id)
      .then((response) => dispatch({ type: 'revealSuccess', corrections: response.corrections }))
      .catch((err) =>
        dispatch({
          type: 'revealError',
          message: err instanceof Error ? err.message : 'Không thể xem đáp án',
        }),
      )
  }, [exercise.id, state.revealPending])

  const retry = useCallback(() => dispatch({ type: 'retry' }), [])
  const complete = useCallback(() => dispatch({ type: 'complete' }), [])
  const setAnswer = useCallback((value: string) => dispatch({ type: 'answer', value }), [])

  return {
    phase: state.phase,
    answer: state.answer,
    setAnswer,
    evaluation: state.evaluation,
    previousEvaluation: state.previousEvaluation,
    hints: state.hints,
    hintsTotal: state.hintsTotal,
    revealAvailable: state.revealAvailable,
    revealed: state.revealed,
    hintPending: state.hintPending,
    revealPending: state.revealPending,
    submitError: state.submitError,
    actionError: state.actionError,
    vocabulary: state.vocabulary,
    xpGained: state.xpGained,
    missionCompleted: state.missionCompleted,
    dailyGoal: state.dailyGoal,
    submitted: state.submitted,
    submit,
    requestHint,
    reveal,
    retry,
    complete,
  }
}