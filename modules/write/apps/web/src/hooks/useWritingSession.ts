import { useCallback, useEffect, useReducer, useRef } from 'react'
import { api } from '../services/api'
import type {
  Exercise,
  WritingCompareResponse,
  WritingEvaluationResponse,
  WritingSubmissionResponse,
} from '../types/api'

/** Workspace phases — a single explicit state machine (no scattered booleans). */
export type WorkspacePhase =
  | 'draft'
  | 'submitting'
  | 'evaluating'
  | 'review'
  | 'hinting'
  | 'revealed'
  | 'revising'
  | 'compare'
  | 'coach'
  | 'error'

/** Workspace navigation: Write (draft) → Review / Revisions / Coach; Compare while comparing. */
export type WorkspaceTab = 'write' | 'review' | 'revisions' | 'coach'

export interface CoachExchange {
  question: string
  answer: string
  suggestions: string[]
}

export type RetryAction = 'submit' | 'revise'

export const EVALUATION_FAILED = 'Không thể đánh giá bài viết.'
export const REVISION_FAILED = 'Bản sửa chưa được tạo. Bản trước vẫn được giữ nguyên.'
export const COACH_FAILED = 'AI Coach hiện tạm thời unavailable.'

interface WritingState {
  phase: WorkspacePhase
  tab: WorkspaceTab
  answer: string
  draftSaved: boolean
  submission: WritingSubmissionResponse | null
  evaluation: WritingEvaluationResponse | null
  compare: WritingCompareResponse | null
  hints: string[]
  hintsTotal: number
  revealAvailable: boolean
  revealed: boolean
  hintPending: boolean
  revealPending: boolean
  coachThread: CoachExchange[]
  coachQuestion: string
  coachLoading: boolean
  coachError: string | null
  submitError: string | null
  actionError: string | null
  retryAction: RetryAction | null
  revisionMode: boolean
}

type WritingAction =
  | { type: 'reset'; draft: string }
  | { type: 'answer'; value: string }
  | { type: 'draftSaved' }
  | { type: 'submitStart' }
  | { type: 'evaluationSet'; evaluation: WritingEvaluationResponse }
  | { type: 'submitSuccess'; submission: WritingSubmissionResponse }
  | { type: 'submitError'; message: string }
  | { type: 'reviseStart' }
  | {
      type: 'reviseSuccess'
      evaluation: WritingEvaluationResponse
      submission: WritingSubmissionResponse
    }
  | { type: 'reviseError'; message: string }
  | { type: 'retry' }
  | { type: 'revisionDraft'; text: string }
  | { type: 'cancelRevision' }
  | { type: 'tab'; tab: WorkspaceTab }
  | { type: 'selectRevision'; evaluation: WritingEvaluationResponse; tab: WorkspaceTab }
  | { type: 'compareSet'; compare: WritingCompareResponse }
  | { type: 'actionError'; message: string }
  | { type: 'hintStart' }
  | { type: 'hintSuccess'; hint: string; revealAvailable: boolean }
  | { type: 'hintError'; message: string }
  | { type: 'revealStart' }
  | { type: 'revealSuccess'; evaluation: WritingEvaluationResponse }
  | { type: 'revealError'; message: string }
  | { type: 'coachStart' }
  | { type: 'coachSuccess'; exchange: CoachExchange }
  | { type: 'coachError'; message: string }
  | { type: 'coachQuestion'; value: string }

function resetState(draft: string): WritingState {
  return {
    phase: 'draft',
    tab: 'write',
    answer: draft,
    draftSaved: draft.length > 0,
    submission: null,
    evaluation: null,
    compare: null,
    hints: [],
    hintsTotal: 0,
    revealAvailable: false,
    revealed: false,
    hintPending: false,
    revealPending: false,
    coachThread: [],
    coachQuestion: '',
    coachLoading: false,
    coachError: null,
    submitError: null,
    actionError: null,
    retryAction: null,
    revisionMode: false,
  }
}

function reducer(state: WritingState, action: WritingAction): WritingState {
  switch (action.type) {
    case 'reset':
      return resetState(action.draft)
    case 'answer':
      return { ...state, answer: action.value, draftSaved: false }
    case 'draftSaved':
      return { ...state, draftSaved: true }
    case 'submitStart':
      return {
        ...state,
        phase: 'submitting',
        submitError: null,
        actionError: null,
        retryAction: null,
      }
    case 'evaluationSet': {
      const learningMode = action.evaluation.learning_mode
      return {
        ...state,
        phase: 'evaluating',
        evaluation: action.evaluation,
        hints: [],
        hintsTotal: learningMode?.hints_total ?? 0,
        revealAvailable: learningMode?.reveal_available ?? false,
        revealed: false,
      }
    }
    case 'submitSuccess':
      return {
        ...state,
        phase: 'review',
        tab: 'review',
        submission: action.submission,
        revisionMode: false,
      }
    case 'submitError':
      return { ...state, phase: 'error', submitError: action.message, retryAction: 'submit' }
    case 'reviseStart':
      return { ...state, phase: 'revising', actionError: null, retryAction: null }
    case 'reviseSuccess': {
      const learningMode = action.evaluation.learning_mode
      return {
        ...state,
        phase: 'review',
        tab: 'review',
        evaluation: action.evaluation,
        submission: action.submission,
        hints: [],
        hintsTotal: learningMode?.hints_total ?? 0,
        revealAvailable: learningMode?.reveal_available ?? false,
        revealed: false,
        revisionMode: false,
      }
    }
    case 'reviseError':
      return { ...state, phase: 'error', actionError: action.message, retryAction: 'revise' }
    case 'retry':
      return {
        ...state,
        phase: 'draft',
        submitError: null,
        actionError: null,
        retryAction: null,
      }
    case 'revisionDraft':
      return {
        ...state,
        phase: 'draft',
        tab: 'write',
        answer: action.text,
        draftSaved: false,
        submitError: null,
        actionError: null,
        retryAction: null,
        revisionMode: true,
      }
    case 'cancelRevision':
      return { ...state, phase: 'review', tab: 'review', revisionMode: false }
    case 'tab':
      if (action.tab === 'write') return { ...state, phase: 'draft', tab: 'write' }
      if (action.tab === 'review')
        return { ...state, phase: 'review', tab: 'review', compare: null }
      if (action.tab === 'coach') return { ...state, phase: 'coach', tab: 'coach' }
      return {
        ...state,
        tab: 'revisions',
        phase: state.phase === 'compare' ? 'compare' : 'review',
      }
    case 'selectRevision': {
      const same = state.evaluation?.revision_number === action.evaluation.revision_number
      const learningMode = action.evaluation.learning_mode
      return {
        ...state,
        phase: 'review',
        tab: action.tab,
        evaluation: action.evaluation,
        compare: null,
        hints: same ? state.hints : [],
        hintsTotal: same ? state.hintsTotal : (learningMode?.hints_total ?? 0),
        revealAvailable: same
          ? state.revealAvailable
          : (learningMode?.reveal_available ?? false),
        revealed: same ? state.revealed : false,
        hintPending: false,
        revealPending: false,
      }
    }
    case 'compareSet':
      return {
        ...state,
        phase: 'compare',
        tab: 'revisions',
        compare: action.compare,
        actionError: null,
      }
    case 'actionError':
      return { ...state, actionError: action.message }
    case 'hintStart':
      return { ...state, phase: 'hinting', hintPending: true, actionError: null }
    case 'hintSuccess':
      return {
        ...state,
        phase: 'review',
        hintPending: false,
        hints: [...state.hints, action.hint],
        revealAvailable: action.revealAvailable,
      }
    case 'hintError':
      return { ...state, phase: 'review', hintPending: false, actionError: action.message }
    case 'revealStart':
      return { ...state, phase: 'revealed', revealPending: true, actionError: null }
    case 'revealSuccess':
      return {
        ...state,
        revealPending: false,
        revealed: true,
        evaluation: action.evaluation,
      }
    case 'revealError':
      return { ...state, phase: 'review', revealPending: false, actionError: action.message }
    case 'coachStart':
      return { ...state, coachLoading: true, coachError: null }
    case 'coachSuccess':
      return {
        ...state,
        coachLoading: false,
        coachThread: [...state.coachThread, action.exchange],
      }
    case 'coachError':
      return { ...state, coachLoading: false, coachError: action.message }
    case 'coachQuestion':
      return { ...state, coachQuestion: action.value }
    default:
      return state
  }
}

export interface WritingSession {
  phase: WorkspacePhase
  tab: WorkspaceTab
  answer: string
  setAnswer: (value: string) => void
  draftSaved: boolean
  submission: WritingSubmissionResponse | null
  evaluation: WritingEvaluationResponse | null
  compare: WritingCompareResponse | null
  latestRevisionNumber: number
  hints: string[]
  hintsTotal: number
  revealAvailable: boolean
  revealed: boolean
  hintPending: boolean
  revealPending: boolean
  coachThread: CoachExchange[]
  coachQuestion: string
  setCoachQuestion: (value: string) => void
  coachLoading: boolean
  coachError: string | null
  submitError: string | null
  actionError: string | null
  retryAction: RetryAction | null
  revisionMode: boolean
  submit: () => void
  revise: () => void
  retry: () => void
  startRevision: () => void
  cancelRevision: () => void
  setTab: (tab: WorkspaceTab) => void
  selectRevision: (revisionNumber: number) => void
  backToLatest: () => void
  requestHint: () => void
  reveal: () => void
  askCoach: (question?: string) => void
}

export function useWritingSession(
  exercise: Exercise,
  options?: { provider?: string; model?: string },
): WritingSession {
  const [state, dispatch] = useReducer(reducer, undefined, () => resetState(''))

  const exerciseRef = useRef(exercise)
  exerciseRef.current = exercise
  const stateRef = useRef(state)
  stateRef.current = state
  const answerRef = useRef(state.answer)
  answerRef.current = state.answer
  const coachQuestionRef = useRef(state.coachQuestion)
  coachQuestionRef.current = state.coachQuestion
  const submissionRef = useRef<WritingSubmissionResponse | null>(null)
  submissionRef.current = state.submission
  const lastEvaluationRef = useRef<WritingEvaluationResponse | null>(null)
  if (state.evaluation) lastEvaluationRef.current = state.evaluation

  const busyRef = useRef(false)
  const retryActionRef = useRef<RetryAction | null>(null)

  const draftKey = `draft:free-writing:${exercise.id}`

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(draftKey)
    } catch {
      // storage unavailable: nothing to clear
    }
  }, [draftKey])

  useEffect(() => {
    let saved = ''
    try {
      saved = window.localStorage.getItem(draftKey) ?? ''
    } catch {
      // storage unavailable: start fresh
    }
    busyRef.current = false
    retryActionRef.current = null
    lastEvaluationRef.current = null
    dispatch({ type: 'reset', draft: saved })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id])

  useEffect(() => {
    if (state.phase !== 'draft') return
    const trimmed = state.answer.trim()
    const timer = setTimeout(() => {
      try {
        if (trimmed) {
          window.localStorage.setItem(draftKey, state.answer)
        } else {
          window.localStorage.removeItem(draftKey)
        }
      } catch {
        // storage unavailable: session-only draft
      }
      dispatch({ type: 'draftSaved' })
    }, 400)
    return () => clearTimeout(timer)
  }, [state.answer, state.phase, draftKey])

  const submit = useCallback(() => {
    const exercise = exerciseRef.current
    const trimmed = answerRef.current.trim()
    if (!exercise || !trimmed || busyRef.current) return
    busyRef.current = true
    dispatch({ type: 'submitStart' })
    api
      .createWritingSubmission(exercise.id, trimmed, options)
      .then(async (evaluation) => {
        dispatch({ type: 'evaluationSet', evaluation })
        try {
          const submission = await api.getWritingSubmission(evaluation.submission_id)
          clearDraft()
          dispatch({ type: 'submitSuccess', submission })
        } catch (err) {
          dispatch({
            type: 'submitError',
            message: err instanceof Error ? err.message : EVALUATION_FAILED,
          })
        }
      })
      .catch((err) =>
        dispatch({
          type: 'submitError',
          message: err instanceof Error ? err.message : EVALUATION_FAILED,
        }),
      )
      .finally(() => {
        busyRef.current = false
      })
  }, [clearDraft, options])

  const revise = useCallback(() => {
    const submission = submissionRef.current
    const trimmed = answerRef.current.trim()
    if (!submission || !trimmed || busyRef.current) return
    busyRef.current = true
    dispatch({ type: 'reviseStart' })
    api
      .submitWritingRevision(submission.id, trimmed, options)
      .then(async () => {
        const evaluation = await api.getWritingEvaluation(submission.id)
        const updated = await api.getWritingSubmission(submission.id)
        clearDraft()
        dispatch({ type: 'reviseSuccess', evaluation, submission: updated })
      })
      .catch((err) => {
        retryActionRef.current = 'revise'
        dispatch({
          type: 'reviseError',
          message: err instanceof Error ? err.message : REVISION_FAILED,
        })
      })
      .finally(() => {
        busyRef.current = false
      })
  }, [clearDraft, options])

  const selectRevision = useCallback(
    (revisionNumber: number) => {
      const submission = submissionRef.current
      if (!submission || busyRef.current) return
      const latest = submission.revisions.at(-1)?.revision_number ?? 1
      const current = stateRef.current.evaluation
      if (
        revisionNumber === latest &&
        current !== null &&
        current.revision_number === latest
      ) {
        dispatch({ type: 'selectRevision', evaluation: current, tab: 'revisions' })
        return
      }
      busyRef.current = true
      const request =
        revisionNumber === latest
          ? api.getWritingEvaluation(submission.id).then((evaluation) =>
              dispatch({ type: 'selectRevision', evaluation, tab: 'revisions' }),
            )
          : api
              .compareWritingRevisions(submission.id, revisionNumber, latest)
              .then((compare) => dispatch({ type: 'compareSet', compare }))
      request
        .catch((err) =>
          dispatch({
            type: 'actionError',
            message: err instanceof Error ? err.message : 'Không thể tải bài đánh giá',
          }),
        )
        .finally(() => {
          busyRef.current = false
        })
    },
    [],
  )

  const backToLatest = useCallback(() => {
    const submission = submissionRef.current
    if (!submission || busyRef.current) return
    const latest = submission.revisions.at(-1)?.revision_number ?? 1
    const current = stateRef.current.evaluation
    if (current !== null && current.revision_number === latest) {
      dispatch({ type: 'selectRevision', evaluation: current, tab: 'review' })
      return
    }
    busyRef.current = true
    api
      .getWritingEvaluation(submission.id)
      .then((evaluation) =>
        dispatch({ type: 'selectRevision', evaluation, tab: 'review' }),
      )
      .catch((err) =>
        dispatch({
          type: 'actionError',
          message: err instanceof Error ? err.message : 'Không thể tải bài đánh giá',
        }),
      )
      .finally(() => {
        busyRef.current = false
      })
  }, [])

  const requestHint = useCallback(() => {
    const submission = submissionRef.current
    if (
      !submission ||
      busyRef.current ||
      stateRef.current.hintPending ||
      stateRef.current.revealPending
    ) {
      return
    }
    busyRef.current = true
    dispatch({ type: 'hintStart' })
    api
      .nextWritingHint(submission.id)
      .then((response) =>
        dispatch({
          type: 'hintSuccess',
          hint: response.hint,
          revealAvailable: response.reveal_available,
        }),
      )
      .catch((err) =>
        dispatch({
          type: 'hintError',
          message: err instanceof Error ? err.message : 'Không thể lấy gợi ý',
        }),
      )
      .finally(() => {
        busyRef.current = false
      })
  }, [])

  const reveal = useCallback(() => {
    const submission = submissionRef.current
    const evaluation = stateRef.current.evaluation
    if (!submission || !evaluation || busyRef.current || stateRef.current.revealPending) {
      return
    }
    busyRef.current = true
    dispatch({ type: 'revealStart' })
    api
      .revealWriting(submission.id)
      .then((response) =>
        dispatch({ type: 'revealSuccess', evaluation: { ...evaluation, rewrites: response.rewrites } }),
      )
      .catch((err) =>
        dispatch({
          type: 'revealError',
          message: err instanceof Error ? err.message : 'Không thể xem bản viết lại',
        }),
      )
      .finally(() => {
        busyRef.current = false
      })
  }, [])

  const askCoach = useCallback((question?: string) => {
    const submission = submissionRef.current
    const trimmed = (question ?? coachQuestionRef.current).trim()
    if (!submission || !trimmed || stateRef.current.coachLoading) return
    const fromCompose = question === undefined
    dispatch({ type: 'coachStart' })
    api
      .askWritingCoach(submission.id, trimmed, options)
      .then((response) => {
        dispatch({
          type: 'coachSuccess',
          exchange: { question: trimmed, answer: response.answer, suggestions: response.suggestions },
        })
        if (fromCompose) dispatch({ type: 'coachQuestion', value: '' })
      })
      .catch((err) =>
        dispatch({
          type: 'coachError',
          message: err instanceof Error ? err.message : COACH_FAILED,
        }),
      )
  }, [options])

  const setTab = useCallback(
    (tab: WorkspaceTab) => {
      if (tab === 'review' && stateRef.current.phase === 'compare') {
        backToLatest()
        return
      }
      dispatch({ type: 'tab', tab })
    },
    [backToLatest],
  )

  const startRevision = useCallback(() => {
    const text = lastEvaluationRef.current?.text ?? ''
    dispatch({ type: 'revisionDraft', text })
  }, [])

  const cancelRevision = useCallback(() => dispatch({ type: 'cancelRevision' }), [])

  const retry = useCallback(() => {
    const action = retryActionRef.current
    dispatch({ type: 'retry' })
    retryActionRef.current = null
    if (action === 'submit') submit()
    else if (action === 'revise') revise()
  }, [submit, revise])

  const setAnswer = useCallback((value: string) => dispatch({ type: 'answer', value }), [])
  const setCoachQuestion = useCallback(
    (value: string) => dispatch({ type: 'coachQuestion', value }),
    [],
  )

  return {
    phase: state.phase,
    tab: state.tab,
    answer: state.answer,
    setAnswer,
    draftSaved: state.draftSaved,
    submission: state.submission,
    evaluation: state.evaluation,
    compare: state.compare,
    latestRevisionNumber: state.submission?.revisions.at(-1)?.revision_number ?? 1,
    hints: state.hints,
    hintsTotal: state.hintsTotal,
    revealAvailable: state.revealAvailable,
    revealed: state.revealed,
    hintPending: state.hintPending,
    revealPending: state.revealPending,
    coachThread: state.coachThread,
    coachQuestion: state.coachQuestion,
    setCoachQuestion,
    coachLoading: state.coachLoading,
    coachError: state.coachError,
    submitError: state.submitError,
    actionError: state.actionError,
    retryAction: state.retryAction,
    revisionMode: state.revisionMode,
    submit,
    revise,
    retry,
    startRevision,
    cancelRevision,
    setTab,
    selectRevision,
    backToLatest,
    requestHint,
    reveal,
    askCoach,
  }
}