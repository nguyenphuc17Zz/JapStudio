import { ApiClient } from '../lib/api'
import { config } from '../lib/config'
import type {
  AiProviderConfigResponse,
  AiProviderConfigUpdate,
  AiProviderModels,
  AiProvidersResponse,
  AnalyticsAiResponse,
  AnalyticsAnalyzeRequest,
  AnalyticsAnalyzeResponse,
  AnalyticsCalibration,
  AnalyticsExperiment,
  AnalyticsExperimentAssignResponse,
  AnalyticsExperimentCreateRequest,
  AnalyticsExperimentMetrics,
  AnalyticsFeatures,
  AnalyticsFunnel,
  AnalyticsLearnerSummary,
  AnalyticsLearningOutcomes,
  AnalyticsRecommendation,
  AnalyticsRecommendationsResponse,
  AnalyticsSummary,
  AnalyticsWindow,
  AttemptEvaluationResponse,
  AttemptListResponse,
  AttemptVocabularyResponse,
  BenchmarkResult,
  BenchmarkRun,
  BenchmarkRunRequest,
  Challenge,
  ChallengeAttempt,
  ChallengeAttemptListResponse,
  ChallengeGenerateRequest,
  DailyMission,
  Exercise,
  ExerciseGenerationRequest,
  ExerciseListParams,
  ExerciseListResponse,
  GamificationSummary,
  GamificationTodayResponse,
  FuriganaConvertResponse,
  HealthResponse,
  HintResponse,
  LearningHistoryResponse,
  LearningProfile,
  LearningProfileUpdate,
  LearningRecommendation,
  LearningTodayResponse,
  LearnerMemory,
  LearnerMemoryCreate,
  MemoryListResponse,
  MemoryRefreshResponse,
  MilestoneListResponse,
  JourneyCreateRequest,
  JourneyEvidenceListResponse,
  JourneyObjectiveContextResponse,
  JourneyReplanningResponse,
  JourneyStatusResponse,
  ObjectiveExplanationResponse,
  QualityPromptEntry,
  QualityStatusResponse,
  QualityTelemetryResponse,
  RevealResponse,
  ScenarioGenerateRequest,
  ScenarioHistoryResponse,
  VocabLookupRequest,
  VocabLookupResponse,
  VocabSaveLookupRequest,
  VocabSaveLookupResponse,
  VocabularyDetail,
  VocabularyExtractResponse,
  VocabularyListParams,
  VocabularyListResponse,
  XpHistoryResponse,

  WritingCompareResponse,
  WritingEvaluationResponse,
  WritingHintResponse,
  WritingRevealResponse,
  WritingRevisionResponse,
  WritingSubmissionResponse,
  WritingCoachResponse,
  WritingScaffoldRequest,
  WritingScaffoldResponse,
  WritingScenario,
  SimulationCreateRequest,
  SimulationSessionResponse,
  SimulationHistoryResponse,
  SimulationSummaryResponse,
  SimulationCoachResponse,
  SimulationExplainResponse,
  HankoSuggestionResponse,
  HaikuGenerateRequest,
  HaikuGenerateResponse,
  OmikujiDrawRequest,
  OmikujiFortuneResponse,
  KotowazaGenerateRequest,
  KotowazaResponse,
  KitsuneDialogueRequest,
  KitsuneDialogueResponse,
  KitsuneChatRequest,
  KitsuneChatResponse,
  WritingIntelligenceProfile,
  WritingIntelligenceSummary,
  WritingWeaknessListResponse,
  WritingWeakness,
  WritingWeaknessListParams,
  WritingDiagnosisResult,
  DueRetestListResponse,
  EvidenceSummary,
  WeaknessDetail,
  MasteryHistoryEvent,
  DrillGenerateParams,
  DrillAttemptParams,
  DrillAttemptResult,
  DrillHintResult,
  DrillRevealResult,
  DrillSession,
  DueDrillListResponse,
  DrillSessionListResponse,
  RewriteLabSession,
  RewriteVariants,
  SelfCorrectionAttemptResult,
  TransferTask,
  TransferEvaluation,
  RewriteModeResult,
  DiffExplanation,
  SocraticCoachResult,
  CreateRewriteSessionParams,
  SubmitSelfCorrectionParams,
  SubmitTransferParams,
  TransformModeParams,
  DiffExplainParams,
  SocraticCoachParams,
  RecentSnippetsResponse,
  MissionTaxonomyResponse,
  RealWorldMissionGenerateRequest,
  RealWorldMission,
  MissionEvaluationRequest,
  MissionEvaluationResponse,
  TransitionToSimulationResponse,
  ExpressionRecord,
  ExpressionBankSummary,
  ExpressionBankListResponse,
  CollocationAnalysisResult,
  ExpressionVariationResult,
  RegisterTransformationResult,
  CollocationSuggestionsResult,
  AnalyzeExpressionsParams,
  GenerateVariationsParams,
  RegisterTransformParams,
  ExpressionBankListParams,
  DailyPlan,
  WeaknessPriorityResponse,
  SessionDoneRequest,
  SessionDoneResult,
  WritingMasteryProfile,
  WritingEvolutionTimeline,
  BossTask,
  BossEvaluationResult,
  BossHistoryItem,
} from '../types/api'

export const apiClient = new ApiClient({ baseUrl: config.apiBaseUrl, timeoutMs: 25_000 })

const aiModelsClient = new ApiClient({ baseUrl: config.apiBaseUrl, timeoutMs: 30_000 })

export const api = {
  health: (options?: { checkDb?: boolean }) =>
    apiClient.get<HealthResponse>(`/health${options?.checkDb ? '?check_db=true' : ''}`),
  aiProviders: () => apiClient.get<AiProvidersResponse>('/api/v1/ai/providers'),
  aiProviderConfig: () =>
    apiClient.get<AiProviderConfigResponse>('/api/v1/ai/providers/config'),
  saveAiProviderConfig: (payload: AiProviderConfigUpdate) =>
    apiClient.put<AiProviderConfigResponse>('/api/v1/ai/providers/config', payload),
  aiModels: (params: { provider?: string } = {}) =>
    aiModelsClient.get<AiProviderModels[]>('/api/v1/ai/models', params),
  qualityStatus: () => apiClient.get<QualityStatusResponse>('/api/v1/ai/quality/status'),
  qualityTelemetry: () => apiClient.get<QualityTelemetryResponse>('/api/v1/ai/quality/telemetry'),
  qualityPrompts: () => apiClient.get<QualityPromptEntry[]>('/api/v1/ai/quality/prompts'),
  runBenchmark: (payload: BenchmarkRunRequest) =>
    apiClient.post<BenchmarkRun>('/api/v1/ai/benchmark/run', payload),
  getBenchmarkRun: (runId: string) => apiClient.get<BenchmarkRun>(`/api/v1/ai/benchmark/${runId}`),
  getBenchmarkResults: (runId: string) =>
    apiClient.get<BenchmarkResult[]>(`/api/v1/ai/benchmark/${runId}/results`),
  generateExercise: (payload: ExerciseGenerationRequest) =>
    apiClient.post<Exercise>('/api/v1/exercises/generate', payload),
  getExercise: (id: string) => apiClient.get<Exercise>(`/api/v1/exercises/${id}`),
  deleteExercise: (id: string) => apiClient.delete<void>(`/api/v1/exercises/${id}`),
  deleteAllExercises: () => apiClient.delete<{ deleted: number }>('/api/v1/exercises'),
  listExercises: (params: ExerciseListParams = {}) =>
    apiClient.get<ExerciseListResponse>('/api/v1/exercises', params),
  submitAttempt: (
    exerciseId: string,
    answerText: string,
    options?: { provider?: string; model?: string },
  ) =>
    apiClient.post<AttemptEvaluationResponse>(
      `/api/v1/exercises/${exerciseId}/attempts`,
      {
        answer_text: answerText,
        ...(options?.provider ? { provider: options.provider } : {}),
        ...(options?.model ? { model: options.model } : {}),
      },
    ),
  listAttempts: (exerciseId: string, params: { skip?: number; limit?: number } = {}) =>
    apiClient.get<AttemptListResponse>(`/api/v1/exercises/${exerciseId}/attempts`, params),
  getAttempt: (exerciseId: string, attemptId: string) =>
    apiClient.get<AttemptEvaluationResponse>(
      `/api/v1/exercises/${exerciseId}/attempts/${attemptId}`,
    ),
  nextHint: (exerciseId: string, attemptId: string) =>
    apiClient.post<HintResponse>(`/api/v1/exercises/${exerciseId}/attempts/${attemptId}/hint`),
  revealAttempt: (exerciseId: string, attemptId: string) =>
    apiClient.post<RevealResponse>(`/api/v1/exercises/${exerciseId}/attempts/${attemptId}/reveal`),
  listVocabulary: (params: VocabularyListParams = {}) =>
    apiClient.get<VocabularyListResponse>('/api/v1/vocabulary', params),
  getVocabulary: (id: string) => apiClient.get<VocabularyDetail>(`/api/v1/vocabulary/${id}`),
  lookupVocabularyAI: (payload: VocabLookupRequest) =>
    apiClient.post<VocabLookupResponse>('/api/v1/vocabulary/ai-lookup', payload),
  saveLookupVocabulary: (payload: VocabSaveLookupRequest) =>
    apiClient.post<VocabSaveLookupResponse>('/api/v1/vocabulary/save-lookup', payload),
  reprocessVocabulary: (attemptId: string) =>
    apiClient.post<VocabularyExtractResponse>(`/api/v1/vocabulary/reprocess/${attemptId}`),

  extractAttemptVocabulary: (exerciseId: string, attemptId: string) =>
    apiClient.post<VocabularyExtractResponse>(
      `/api/v1/exercises/${exerciseId}/attempts/${attemptId}/vocabulary/extract`,
    ),
  listAttemptVocabulary: (exerciseId: string, attemptId: string) =>
    apiClient.get<AttemptVocabularyResponse>(
      `/api/v1/exercises/${exerciseId}/attempts/${attemptId}/vocabulary`,
    ),
  getLearningProfile: () => apiClient.get<LearningProfile>('/api/v1/learning/profile'),
  updateLearningProfile: (payload: LearningProfileUpdate) =>
    apiClient.put<LearningProfile>('/api/v1/learning/profile', payload),
  refreshLearningProfile: () => apiClient.post<LearningProfile>('/api/v1/learning/profile/refresh'),
  getLearningToday: () => apiClient.get<LearningTodayResponse>('/api/v1/learning/today'),
  getLearningRecommendation: () =>
    apiClient.get<LearningRecommendation | null>('/api/v1/learning/recommendation'),
  nextLearningRecommendation: (options?: { provider?: string; model?: string }) =>
    apiClient.post<LearningRecommendation>(
      '/api/v1/learning/next',
      options
        ? {
            ...(options.provider ? { provider: options.provider } : {}),
            ...(options.model ? { model: options.model } : {}),
          }
        : undefined,
    ),
  listLearningHistory: (params: { skip?: number; limit?: number } = {}) =>
    apiClient.get<LearningHistoryResponse>('/api/v1/learning/history', params),
  getGamificationSummary: () =>
    apiClient.get<GamificationSummary>('/api/v1/gamification/summary'),
  getXpHistory: (params: { skip?: number; limit?: number } = {}) =>
    apiClient.get<XpHistoryResponse>('/api/v1/gamification/xp/history', params),
  getGamificationToday: () =>
    apiClient.get<GamificationTodayResponse>('/api/v1/gamification/today'),
  getDailyMission: () => apiClient.get<DailyMission | null>('/api/v1/gamification/mission'),
  regenerateDailyMission: (options?: { provider?: string; model?: string }) =>
    apiClient.post<DailyMission | null>(
      '/api/v1/gamification/mission/regenerate',
      options
        ? {
            ...(options.provider ? { provider: options.provider } : {}),
            ...(options.model ? { model: options.model } : {}),
          }
        : undefined,
    ),
  getMilestones: () => apiClient.get<MilestoneListResponse>('/api/v1/gamification/milestones'),
  getJourneyStatus: () => apiClient.get<JourneyStatusResponse | null>('/api/v1/learning/journey'),
  createJourney: (payload: JourneyCreateRequest) =>
    apiClient.post<JourneyStatusResponse>('/api/v1/learning/journey', payload),
  getJourneyObjectiveContext: () =>
    apiClient.get<JourneyObjectiveContextResponse | null>(
      '/api/v1/learning/journey/objective/context',
    ),
  getJourneyObjectiveEvidence: () =>
    apiClient.get<JourneyEvidenceListResponse>('/api/v1/learning/journey/objective/evidence'),
  replanJourney: (requestedChanges: Record<string, unknown>[] = []) =>
    apiClient.post<JourneyReplanningResponse>('/api/v1/learning/journey/replan', requestedChanges),
  getObjectiveExplanation: (objectiveId: string) =>
    apiClient.get<ObjectiveExplanationResponse>(
      `/api/v1/learning/journey/objectives/${objectiveId}/explanation`,
    ),
  generateChallenge: (payload: ChallengeGenerateRequest = {}) =>
    apiClient.post<Challenge>('/api/v1/challenges/generate', payload),
  getChallenge: (id: string) => apiClient.get<Challenge>(`/api/v1/challenges/${id}`),
  generateScenario: (payload: ScenarioGenerateRequest = {}) =>
    apiClient.post<WritingScenario>('/api/v1/scenarios/generate', payload),
  getScenario: (id: string) => apiClient.get<WritingScenario>(`/api/v1/scenarios/${id}`),
  createScenarioExercise: (scenarioId: string) =>
    apiClient.post<Exercise>(`/api/v1/scenarios/${scenarioId}/exercise`),
  listRecentScenarios: (params: { skip?: number; limit?: number } = {}) =>
    apiClient.get<ScenarioHistoryResponse>('/api/v1/scenarios/recent', params),
  // Real-World Mission System (Phase 20)
  getMissionTaxonomy: () =>
    apiClient.get<MissionTaxonomyResponse>('/api/v1/scenarios/mission-taxonomy'),
  generateRealWorldMission: (payload: RealWorldMissionGenerateRequest = {}) =>
    apiClient.post<RealWorldMission>('/api/v1/scenarios/mission/generate', payload),
  evaluateRealWorldMission: (payload: MissionEvaluationRequest) =>
    apiClient.post<MissionEvaluationResponse>('/api/v1/scenarios/mission/evaluate', payload),
  transitionMissionToSimulation: (
    scenarioId: string,
    initialUserText: string,
    options?: { provider?: string; model?: string },
  ) =>
    apiClient.post<TransitionToSimulationResponse>(
      `/api/v1/scenarios/${scenarioId}/transition-simulation`,
      {
        scenario_id: scenarioId,
        initial_user_text: initialUserText,
        ...(options?.provider ? { provider: options.provider } : {}),
        ...(options?.model ? { model: options.model } : {}),
      },
    ),
  submitChallengeAttempt: (
    challengeId: string,
    answerText: string,
    options?: { provider?: string; model?: string },
  ) =>
    apiClient.post<ChallengeAttempt>(`/api/v1/challenges/${challengeId}/attempts`, {
      answer_text: answerText,
      ...(options?.provider ? { provider: options.provider } : {}),
      ...(options?.model ? { model: options.model } : {}),
    }),
  listChallengeAttempts: (challengeId: string) =>
    apiClient.get<ChallengeAttemptListResponse>(`/api/v1/challenges/${challengeId}/attempts`),
  createWritingSubmission: (
    exerciseId: string,
    text: string,
    options?: { provider?: string; model?: string },
  ) =>
    apiClient.post<WritingEvaluationResponse>('/api/v1/writing/submissions', {
      exercise_id: exerciseId,
      text,
      ...(options?.provider ? { provider: options.provider } : {}),
      ...(options?.model ? { model: options.model } : {}),
    }),
  getWritingSubmission: (submissionId: string) =>
    apiClient.get<WritingSubmissionResponse>(`/api/v1/writing/submissions/${submissionId}`),
  getWritingEvaluation: (submissionId: string) =>
    apiClient.get<WritingEvaluationResponse>(
      `/api/v1/writing/submissions/${submissionId}/evaluation`,
    ),
  submitWritingRevision: (
    submissionId: string,
    text: string,
    options?: { provider?: string; model?: string },
  ) =>
    apiClient.post<WritingRevisionResponse>(
      `/api/v1/writing/submissions/${submissionId}/revisions`,
      {
        text,
        ...(options?.provider ? { provider: options.provider } : {}),
        ...(options?.model ? { model: options.model } : {}),
      },
    ),
  compareWritingRevisions: (
    submissionId: string,
    fromRevision: number,
    toRevision: number,
  ) =>
    apiClient.get<WritingCompareResponse>(
      `/api/v1/writing/submissions/${submissionId}/compare`,
      { from_revision: fromRevision, to_revision: toRevision },
    ),
  nextWritingHint: (submissionId: string) =>
    apiClient.post<WritingHintResponse>(`/api/v1/writing/submissions/${submissionId}/hint`),
  revealWriting: (submissionId: string) =>
    apiClient.post<WritingRevealResponse>(`/api/v1/writing/submissions/${submissionId}/reveal`),
  askWritingCoach: (
    submissionId: string,
    question: string,
    options?: { provider?: string; model?: string },
  ) =>
    apiClient.post<WritingCoachResponse>(`/api/v1/writing/submissions/${submissionId}/coach`, {
      question,
      ...(options?.provider ? { provider: options.provider } : {}),
      ...(options?.model ? { model: options.model } : {}),
    }),
  getWritingScaffold: (payload: WritingScaffoldRequest) =>
    apiClient.post<WritingScaffoldResponse>('/api/v1/writing/scaffold', payload),
  createSimulation: (payload: SimulationCreateRequest) =>
    apiClient.post<SimulationSessionResponse>('/api/v1/simulations', payload),
  getSimulation: (sessionId: string) =>
    apiClient.get<SimulationSessionResponse>(`/api/v1/simulations/${sessionId}`),
  listSimulations: (params: { skip?: number; limit?: number } = {}) =>
    apiClient.get<SimulationHistoryResponse>('/api/v1/simulations', params),
  submitSimulationTurn: (
    sessionId: string,
    text: string,
    endEarly = false,
    options?: { provider?: string; model?: string },
  ) =>
    apiClient.post<SimulationSessionResponse>(`/api/v1/simulations/${sessionId}/turns`, {
      message: text,
      end_early: endEarly,
      ...(options?.provider ? { provider: options.provider } : {}),
      ...(options?.model ? { model: options.model } : {}),
    }),
  getSimulationSummary: (sessionId: string) =>
    apiClient.get<SimulationSummaryResponse>(`/api/v1/simulations/${sessionId}/summary`),
  askSimulationCoach: (
    sessionId: string,
    question: string,
    options?: { provider?: string; model?: string },
  ) =>
    apiClient.post<SimulationCoachResponse>(`/api/v1/simulations/${sessionId}/coach`, {
      question,
      ...(options?.provider ? { provider: options.provider } : {}),
      ...(options?.model ? { model: options.model } : {}),
    }),
  explainSimulationTurn: (sessionId: string, turnId: string) =>
    apiClient.post<SimulationExplainResponse>(
      `/api/v1/simulations/${sessionId}/turns/${turnId}/explain`,
    ),
  listMemories: (params: { category?: string; status?: string; skip?: number; limit?: number } = {}) =>
    apiClient.get<MemoryListResponse>('/api/v1/learning/memory', params),
  createMemory: (payload: LearnerMemoryCreate) =>
    apiClient.post<LearnerMemory>('/api/v1/learning/memory', payload),
  getMemory: (memoryId: string) => apiClient.get<LearnerMemory>(`/api/v1/learning/memory/${memoryId}`),
  forgetMemory: (memoryId: string) =>
    apiClient.delete<void>(`/api/v1/learning/memory/${memoryId}`),
  archiveMemory: (memoryId: string) =>
    apiClient.post<LearnerMemory>(`/api/v1/learning/memory/${memoryId}/archive`),
  refreshMemories: () =>
    apiClient.post<MemoryRefreshResponse>('/api/v1/learning/memory/refresh'),
  analyticsSummary: (window: AnalyticsWindow = '30d') =>
    apiClient.get<AnalyticsSummary>('/api/v1/analytics/summary', { window }),
  analyticsLearnerSummary: (window: AnalyticsWindow = '30d') =>
    apiClient.get<AnalyticsLearnerSummary>('/api/v1/analytics/learner-summary', { window }),
  analyticsLearningOutcomes: (window: AnalyticsWindow = '30d') =>
    apiClient.get<AnalyticsLearningOutcomes>('/api/v1/analytics/learning-outcomes', { window }),
  analyticsFeatures: (window: AnalyticsWindow = '30d') =>
    apiClient.get<AnalyticsFeatures>('/api/v1/analytics/features', { window }),
  analyticsAi: (window: AnalyticsWindow = '30d') =>
    apiClient.get<AnalyticsAiResponse>('/api/v1/analytics/ai', { window }),
  analyticsCalibration: (window: AnalyticsWindow = '30d') =>
    apiClient.get<AnalyticsCalibration>('/api/v1/analytics/calibration', { window }),
  analyticsFunnel: (window: AnalyticsWindow = '30d') =>
    apiClient.get<AnalyticsFunnel>('/api/v1/analytics/funnel', { window }),
  analyticsRecommendations: (
    params: { status?: string; skip?: number; limit?: number } = {},
  ) => apiClient.get<AnalyticsRecommendationsResponse>('/api/v1/analytics/recommendations', params),
  analyticsAnalyze: (payload: AnalyticsAnalyzeRequest | AnalyticsWindow = '30d') => {
    const body = typeof payload === 'string' ? { window: payload } : payload
    return apiClient.post<AnalyticsAnalyzeResponse>('/api/v1/analytics/analyze', body)
  },
  analyticsDraftRecommendation: (payload: { area: string; finding: string }) =>
    apiClient.post<AnalyticsRecommendation>('/api/v1/analytics/recommendations/draft', payload),
  analyticsDecision: (
    recommendationId: string,
    payload: { decision: 'accept' | 'reject' | 'implement'; note?: string },
  ) =>
    apiClient.post<AnalyticsRecommendation>(
      `/api/v1/analytics/recommendations/${recommendationId}/decision`,
      payload,
    ),
  analyticsCreateExperiment: (payload: AnalyticsExperimentCreateRequest) =>
    apiClient.post<AnalyticsExperiment>('/api/v1/analytics/experiments', payload),
  analyticsListExperiments: () =>
    apiClient.get<AnalyticsExperiment[]>('/api/v1/analytics/experiments'),
  analyticsExperimentMetrics: (experimentId: string) =>
    apiClient.get<AnalyticsExperimentMetrics>(
      `/api/v1/analytics/experiments/${experimentId}/metrics`,
    ),
  analyticsAssignExperiment: (experimentId: string, userId: string) =>
    apiClient.post<AnalyticsExperimentAssignResponse>(
      `/api/v1/analytics/experiments/${experimentId}/assign`,
      { user_id: userId },
    ),
  analyticsAnalyzeExperiment: (experimentId: string) =>
    apiClient.post<unknown>(`/api/v1/analytics/experiments/${experimentId}/analyze`),
  // Cultural & Gamification AI APIs
  suggestHanko: (payload: { name: string; provider?: string; model?: string }) =>
    apiClient.post<HankoSuggestionResponse>('/api/v1/culture/hanko/suggest', payload),
  generateHaiku: (payload: HaikuGenerateRequest = {}) =>
    apiClient.post<HaikuGenerateResponse>('/api/v1/culture/haiku/generate', payload),
  drawOmikuji: (payload: OmikujiDrawRequest = {}) =>
    apiClient.post<OmikujiFortuneResponse>('/api/v1/culture/omikuji/draw', payload),
  getRandomKotowaza: (payload: KotowazaGenerateRequest = {}) =>
    apiClient.post<KotowazaResponse>('/api/v1/culture/kotowaza/random', payload),
  getKitsuneDialogue: (payload: KitsuneDialogueRequest = {}) =>
    apiClient.post<KitsuneDialogueResponse>('/api/v1/culture/kitsune/dialogue', payload),
  chatWithKitsune: (payload: KitsuneChatRequest) =>
    apiClient.post<KitsuneChatResponse>('/api/v1/culture/kitsune/chat', payload),
  // Furigana & Sudachi NLP APIs
  convertFurigana: (text: string, mode: 'A' | 'B' | 'C' = 'C') =>
    apiClient.post<FuriganaConvertResponse>('/api/v1/furigana/convert', { text, mode }),
  batchConvertFurigana: (texts: string[], mode: 'A' | 'B' | 'C' = 'C') =>
    apiClient.post<FuriganaConvertResponse[]>('/api/v1/furigana/batch', { texts, mode }),
  // Writing Intelligence Foundation & Mastery Engine (Phases 16-17) APIs
  getWritingIntelligenceProfile: () =>
    apiClient.get<WritingIntelligenceProfile>('/api/v1/writing/intelligence/profile'),
  getWritingIntelligenceSummary: () =>
    apiClient.get<WritingIntelligenceSummary>('/api/v1/writing/intelligence/summary'),
  listWritingWeaknesses: (params: WritingWeaknessListParams = {}) =>
    apiClient.get<WritingWeaknessListResponse>('/api/v1/writing/intelligence/weaknesses', params),
  getWritingWeakness: (id: string) =>
    apiClient.get<WritingWeakness>(`/api/v1/writing/intelligence/weaknesses/${id}`),
  getWritingWeaknessDetail: (id: string) =>
    apiClient.get<WeaknessDetail>(`/api/v1/writing/intelligence/weaknesses/${id}/detail`),
  getWritingWeaknessHistory: (id: string) =>
    apiClient.get<MasteryHistoryEvent[]>(`/api/v1/writing/intelligence/weaknesses/${id}/history`),
  getDueRetests: () =>
    apiClient.get<DueRetestListResponse>('/api/v1/writing/intelligence/retests/due'),
  getEvidenceSummary: () =>
    apiClient.get<EvidenceSummary>('/api/v1/writing/intelligence/evidence/summary'),
  diagnoseWritingIntelligence: (params?: { provider?: string; model?: string }) =>
    apiClient.post<WritingDiagnosisResult>(
      `/api/v1/writing/intelligence/diagnose${
        params?.provider || params?.model
          ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
          : ''
      }`,
    ),
  // Targeted Writing Drill Engine (Phase 18) APIs
  generateWritingDrill: (payload: DrillGenerateParams = {}) =>
    apiClient.post<DrillSession>('/api/v1/writing/drills/generate', payload),
  getWritingDrillDue: () =>
    apiClient.get<DueDrillListResponse>('/api/v1/writing/drills/due'),
  getWritingDrillSession: (drillId: string) =>
    apiClient.get<DrillSession>(`/api/v1/writing/drills/${drillId}`),
  submitWritingDrillAttempt: (drillId: string, payload: DrillAttemptParams) =>
    apiClient.post<DrillAttemptResult>(`/api/v1/writing/drills/${drillId}/attempt`, payload),
  getWritingDrillHint: (drillId: string, itemId?: string) =>
    apiClient.post<DrillHintResult>(
      `/api/v1/writing/drills/${drillId}/hint${itemId ? `?item_id=${itemId}` : ''}`,
    ),
  revealWritingDrillAnswer: (drillId: string, itemId?: string) =>
    apiClient.post<DrillRevealResult>(
      `/api/v1/writing/drills/${drillId}/reveal${itemId ? `?item_id=${itemId}` : ''}`,
    ),
  listWritingDrillSessions: (
    params: { status?: string; weakness_id?: string; skip?: number; limit?: number } = {},
  ) =>
    apiClient.get<DrillSessionListResponse>('/api/v1/writing/drills', params),
  // Self-Correction & Rewrite Lab (Phase 19) APIs
  createRewriteLabSession: (payload: CreateRewriteSessionParams) =>
    apiClient.post<RewriteLabSession>('/api/v1/rewrite-lab/sessions', payload),
  getRewriteLabSession: (sessionId: string) =>
    apiClient.get<RewriteLabSession>(`/api/v1/rewrite-lab/sessions/${sessionId}`),
  submitSelfCorrectionAttempt: (sessionId: string, payload: SubmitSelfCorrectionParams) =>
    apiClient.post<SelfCorrectionAttemptResult>(
      `/api/v1/rewrite-lab/sessions/${sessionId}/attempt`,
      payload,
    ),
  revealRewriteLabVariants: (
    sessionId: string,
    params?: { provider?: string; model?: string },
  ) =>
    apiClient.post<RewriteVariants>(
      `/api/v1/rewrite-lab/sessions/${sessionId}/reveal${
        params?.provider || params?.model
          ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
          : ''
      }`,
    ),
  generateTransferTask: (
    sessionId: string,
    params?: { provider?: string; model?: string },
  ) =>
    apiClient.post<TransferTask>(
      `/api/v1/rewrite-lab/sessions/${sessionId}/transfer${
        params?.provider || params?.model
          ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
          : ''
      }`,
    ),
  submitTransferAttempt: (sessionId: string, payload: SubmitTransferParams) =>
    apiClient.post<TransferEvaluation>(
      `/api/v1/rewrite-lab/sessions/${sessionId}/transfer/attempt`,
      payload,
    ),
  transformRewriteMode: (payload: TransformModeParams) =>
    apiClient.post<RewriteModeResult>('/api/v1/rewrite-lab/transform', payload),
  explainSentenceDiff: (payload: DiffExplainParams) =>
    apiClient.post<DiffExplanation>('/api/v1/rewrite-lab/diff', payload),
  askSocraticWritingCoach: (payload: SocraticCoachParams) =>
    apiClient.post<SocraticCoachResult>('/api/v1/rewrite-lab/coach', payload),
  getRecentSnippets: (limit?: number) =>
    apiClient.get<RecentSnippetsResponse>(
      `/api/v1/rewrite-lab/recent-snippets?limit=${limit || 20}`,
    ),
  // Japanese Expression Intelligence (Phase 21) APIs
  analyzeExpressions: (payload: AnalyzeExpressionsParams) =>
    apiClient.post<CollocationAnalysisResult>('/api/v1/writing/expressions/analyze', payload),
  getExpressionBank: (params: ExpressionBankListParams = {}) =>
    apiClient.get<ExpressionBankListResponse>('/api/v1/writing/expressions/bank', params),
  getExpressionBankSummary: () =>
    apiClient.get<ExpressionBankSummary>('/api/v1/writing/expressions/bank/summary'),
  getExpressionRecord: (id: string) =>
    apiClient.get<ExpressionRecord>(`/api/v1/writing/expressions/bank/${id}`),
  getOverusedExpressions: (params: { min_count?: number; limit?: number } = {}) =>
    apiClient.get<ExpressionRecord[]>('/api/v1/writing/expressions/overused', params),
  getTransferExpressions: (params: { classification?: string; limit?: number } = {}) =>
    apiClient.get<ExpressionRecord[]>('/api/v1/writing/expressions/transfers', params),
  generateExpressionVariations: (payload: GenerateVariationsParams) =>
    apiClient.post<ExpressionVariationResult>('/api/v1/writing/expressions/variations', payload),
  transformRegisterLadder: (payload: RegisterTransformParams) =>
    apiClient.post<RegisterTransformationResult>('/api/v1/writing/expressions/register-transform', payload),
  getCollocationSuggestions: (baseWord: string, params?: { provider?: string; model?: string }) =>
    apiClient.get<CollocationSuggestionsResult>(
      `/api/v1/writing/expressions/collocations/${encodeURIComponent(baseWord)}`,
      params,
    ),
  // Adaptive Writing Curriculum 2.0 (Phase 22) APIs
  getCurriculumDailyPlan: (params: { enrich?: boolean; total_tasks?: number } = {}) =>
    apiClient.get<DailyPlan>('/api/v1/writing/intelligence/curriculum/daily-plan', params),
  getCurriculumPriorities: (params: { enrich?: boolean; limit?: number } = {}) =>
    apiClient.get<WeaknessPriorityResponse>(
      '/api/v1/writing/intelligence/curriculum/priorities',
      params,
    ),
  markCurriculumSessionDone: (payload: SessionDoneRequest, params: { enrich?: boolean } = {}) =>
    apiClient.post<SessionDoneResult>(
      `/api/v1/writing/intelligence/curriculum/session-done${
        params.enrich !== undefined ? `?enrich=${params.enrich}` : ''
      }`,
      payload,
    ),
  // Writing Mastery & Boss Assessment (Phase 23) APIs
  getWritingMasteryProfile: () =>
    apiClient.get<WritingMasteryProfile>('/api/v1/writing/mastery/profile'),
  getWritingEvolutionTimeline: (params?: { provider?: string; model?: string }) =>
    apiClient.get<WritingEvolutionTimeline>(
      `/api/v1/writing/mastery/evolution${
        params?.provider || params?.model
          ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
          : ''
      }`,
    ),
  generateBossTask: (payload: {
    task_type?: string
    jlpt_level?: string
    target_register?: string
    provider?: string
    model?: string
  } = {}) => apiClient.post<BossTask>('/api/v1/writing/mastery/boss/generate', payload),
  getPendingBossTask: () =>
    apiClient.get<BossTask | null>('/api/v1/writing/mastery/boss/pending'),
  submitBossWritingTask: (
    taskId: string,
    payload: {
      text: string
      duration_seconds?: number
      provider?: string
      model?: string
    },
  ) =>
    apiClient.post<BossEvaluationResult>(
      `/api/v1/writing/mastery/boss/${taskId}/submit`,
      payload,
    ),
  getBossAssessmentHistory: (limit?: number) =>
    apiClient.get<BossHistoryItem[]>(
      `/api/v1/writing/mastery/boss/history${limit ? `?limit=${limit}` : ''}`,
    ),
  getPopularTopics: () =>
    apiClient.get<import('../components/practice/TopicQuickPills').QuickTopicItem[]>('/api/v1/topics/popular'),
  getPracticeModes: () =>
    apiClient.get<import('../components/practice/PracticeModeSelector').ModeItem[]>('/api/v1/practice/modes'),
  getMissionActions: () => apiClient.get<unknown[]>('/api/v1/mission-actions'),
  listMissionActions: (params: { active_only?: boolean } = {}) =>
    apiClient.get<unknown[]>('/api/v1/mission-actions', params),
  getPricing: () => apiClient.get<Record<string, { input: number; output: number }>>('/api/v1/pricing'),
}