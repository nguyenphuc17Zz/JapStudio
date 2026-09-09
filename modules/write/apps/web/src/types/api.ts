export interface HealthResponse {
  status: 'ok'
  app: string
  version: string
  environment: string
  timestamp: string
  database: 'ok' | 'unchecked'
}

export interface AiCapabilities {
  generate: boolean
  generate_structured: boolean
  stream: boolean
}

export interface AiProviderStatus {
  name: string
  configured: boolean
  available: boolean
  default_model: string
  capabilities: AiCapabilities
}

export interface AiProvidersResponse {
  default_provider: string
  fallback_providers: string[]
  providers: AiProviderStatus[]
}

export interface AiProviderCredential {
  configured: boolean
  api_key_masked: string | null
  base_url: string | null
  default_model?: string | null
}

export interface AiProviderConfigResponse {
  gemini: AiProviderCredential
  groq: AiProviderCredential
  ollama: AiProviderCredential
}

export interface AiProviderConfigUpdate {
  gemini_api_key?: string
  gemini_default_model?: string
  groq_api_key?: string
  groq_default_model?: string
  ollama_base_url?: string
  ollama_default_model?: string
  default_provider?: string
}

export interface AiModelInfo {
  id: string
  provider: string
  display_name: string | null
  owned_by: string | null
}

export interface AiProviderModels {
  provider: string
  models: AiModelInfo[]
  error: string | null
}

export type ExerciseType =
  | 'sentence_translation'
  | 'multi_sentence_translation'
  | 'paragraph_translation'
  | 'free_writing'
  | 'register_challenge'
  | 'scenario_response'
  | 'email_writing'
  | 'chat_writing'
  | 'report_writing'
  | 'ticket_writing'
  | 'opinion_writing'

export type TargetLength =
  | 'short_sentence'
  | 'sentence'
  | 'multi_sentence'
  | 'paragraph'
  | 'long_writing'

export type Register = 'casual' | 'polite' | 'business' | 'mixed'

export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

export interface ExerciseGenerationRequest {
  exercise_type?: ExerciseType
  topic?: string
  register?: Register
  jlpt_level?: JlptLevel
  difficulty?: number
  target_length?: TargetLength
  provider?: string
  model?: string
}

export interface GenerationMetadata {
  provider: string
  model: string
  generation_version: string
  prompt_version: string
  generation_timestamp: string
  regeneration_attempts: number
}

export interface VocabularyHint {
  expression: string
  reading?: string | null
  meaning_vi: string
  level?: string | null
}

export interface Exercise {
  id: string
  exercise_type: ExerciseType
  topic: string
  subtopic: string | null
  context: string
  prompt_vi: string
  target_length: TargetLength
  register: Register
  jlpt_level: JlptLevel
  difficulty: number
  grammar_complexity: number
  vocabulary_complexity: number
  context_complexity: number
  naturalness_target: number
  status: 'pending' | 'completed'
  generation_metadata: (GenerationMetadata & { key_vocabulary?: VocabularyHint[] }) | null
  key_vocabulary?: VocabularyHint[]
  created_at: string
  updated_at: string
}

export interface ExerciseListResponse {
  items: Exercise[]
  total: number
  skip: number
  limit: number
}

export interface ExerciseListParams {
  exercise_type?: ExerciseType
  topic?: string
  register?: Register
  jlpt_level?: JlptLevel
  difficulty?: number
  skip?: number
  limit?: number
}

export type IssueCategory =
  | 'grammar'
  | 'vocabulary'
  | 'naturalness'
  | 'register'
  | 'semantic'

export type IssueSeverity = 'info' | 'minor' | 'major' | 'critical'

export type SemanticClassification =
  | 'fully_equivalent'
  | 'mostly_equivalent'
  | 'partially_equivalent'
  | 'meaning_changed'

export type NaturalnessClassification =
  | 'natural'
  | 'acceptable'
  | 'slightly_unnatural'
  | 'unnatural'
  | 'very_unnatural'

export interface EvaluationIssue {
  category: IssueCategory
  severity: IssueSeverity
  original_text: string
  explanation: string
  suggested_fix: string
  reason: string | null
}

export interface EvaluationScores {
  overall_score: number
  semantic_score: number
  grammar_score: number
  vocabulary_score: number
  naturalness_score: number
  context_fit_score: number
  register_fit_score: number
}

export interface Corrections {
  correct_version: string
  natural_version: string
  native_version: string
  casual_version: string | null
  polite_version: string | null
  business_version: string | null
}

export interface WritingScaffoldRequest {
  prompt_vi: string
  context_vi?: string | null
  jlpt_level?: string | null
  register?: string | null
  genre?: string | null
  keywords?: string[]
  provider?: string | null
  model?: string | null
}

export interface IdeaAngleItem {
  title: string
  description: string
  starter: string
}

export interface GoldenPhraseItem {
  japanese: string
  reading?: string | null
  meaning: string
  type: 'connector' | 'vocabulary' | 'expression' | 'starter'
}

export interface WritingScaffoldResponse {
  outline_steps: string[]
  idea_angles: IdeaAngleItem[]
  golden_phrases: GoldenPhraseItem[]
}

export interface LearningModeState {
  enabled: boolean
  hints_revealed_count: number
  hints_total: number
  reveal_available: boolean
}

export interface AttemptEvaluationResponse {
  id: string
  exercise_id: string
  attempt_number: number
  answer_text: string
  scores: EvaluationScores
  semantic_classification: SemanticClassification
  naturalness_classification: NaturalnessClassification
  issues: EvaluationIssue[]
  summary: string
  hints: string[]
  learning_mode: LearningModeState
  corrections: Corrections | null
  evaluation_metadata: { evaluation_version: string; stages: unknown[] } | null
  status: string
  created_at: string
  updated_at: string
}

export interface HintResponse {
  hint: string
  hints_revealed_count: number
  hints_total: number
  reveal_available: boolean
}

export interface RevealResponse {
  attempt_id: string
  attempt_number: number
  corrections: Corrections
  revealed: boolean
}

export interface AttemptListItem {
  id: string
  attempt_number: number
  answer_text: string
  overall_score: number | null
  status: string
  created_at: string
}

export interface AttemptListResponse {
  items: AttemptListItem[]
  total: number
  skip: number
  limit: number
}

export type VocabularyType = 'word' | 'expression' | 'collocation'

export type VocabularyConfidence = 'high' | 'medium' | 'low'

export type VocabularyFamiliarity = 'new' | 'learning' | 'familiar' | 'strong'

export type VocabularySourceType =
  | 'user_answer'
  | 'ai_correction'
  | 'ai_natural'
  | 'ai_native'
  | 'ai_register_variant'
  | 'ai_explanation'

export interface VocabularyListItem {
  id: string
  expression: string
  reading: string | null
  type: VocabularyType
  meaning_vi: string
  part_of_speech: string | null
  estimated_jlpt_level: string | null
  difficulty: number
  register: string | null
  usage_context: string | null
  example_sentence: string
  natural_alternatives: string[]
  notes: string | null
  importance: number
  confidence: VocabularyConfidence
  familiarity: VocabularyFamiliarity
  discovered_count: number
  seen_count: number
  used_count: number
  incorrect_count: number
  correct_usage_count: number
  last_seen: string | null
  created_at: string
}

export interface VocabularyListResponse {
  items: VocabularyListItem[]
  total: number
  skip: number
  limit: number
}

export interface VocabularyListParams {
  type?: VocabularyType
  jlpt_level?: JlptLevel
  difficulty_min?: number
  difficulty_max?: number
  register?: string
  source_type?: VocabularySourceType
  search?: string
  skip?: number
  limit?: number
}

export interface VocabularyDiscoveryInfo {
  id: string
  attempt_id: string
  exercise_id: string
  attempt_number: number | null
  exercise_prompt_vi: string | null
  source_type: VocabularySourceType
  user_expression: string | null
  learning_reason: string
  context_snippet: string | null
  example_sentence: string | null
  provider: string
  model: string
  prompt_version: string
  vocabulary_version: string
  created_at: string
}

export interface VocabularyDetail extends VocabularyListItem {
  source_attempt_id: string | null
  source_exercise_id: string | null
  user_expression: string | null
  learning_reason: string
  discovered_at: string | null
  updated_at: string
  provider: string
  model: string
  prompt_version: string
  vocabulary_version: string
  discoveries: VocabularyDiscoveryInfo[]
}

export interface AttemptVocabularyItem {
  id: string
  expression: string
  reading: string | null
  type: VocabularyType
  meaning_vi: string
  estimated_jlpt_level: string | null
  difficulty: number
  importance: number
  confidence: VocabularyConfidence
  source_type: VocabularySourceType
  user_expression: string | null
  learning_reason: string
  example_sentence: string
  created_at: string
}

export interface AttemptVocabularyResponse {
  items: AttemptVocabularyItem[]
  total: number
}

export interface VocabularyExtractResponse {
  attempt_id: string
  created: number
  merged: number
  rejected: number
  skipped: number
  total: number
}

export type VocabLookupDirection = 'auto' | 'vi_to_ja' | 'ja_to_vi'

export interface VocabLookupRequest {
  query: string
  context?: string | null
  direction?: VocabLookupDirection
  register_preference?: Register | string | null
  target_level?: JlptLevel | string | null
  provider?: string
  model?: string
}

export interface VocabLookupAlternative {
  expression: string
  reading?: string | null
  meaning_vi: string
  estimated_jlpt_level?: string | null
  register?: string | null
  difference_explanation: string
}

export interface VocabLookupExample {
  ja: string
  vi: string
  situation?: string | null
}

export interface VocabLookupBestMatch {
  expression: string
  reading?: string | null
  meaning_vi: string
  part_of_speech?: string | null
  estimated_jlpt_level?: string | null
  difficulty: number
  register?: string | null
  nuance_explanation: string
  usage_collocation?: string | null
  example_sentence: string
  example_sentence_vi: string
  examples?: VocabLookupExample[]
}


export interface VocabLookupResponse {
  query: string
  detected_direction: 'vi_to_ja' | 'ja_to_vi' | string
  context_used?: string | null
  best_match: VocabLookupBestMatch
  alternatives: VocabLookupAlternative[]
  provider?: string | null
  model?: string | null
}

export interface VocabSaveLookupRequest {
  expression: string
  reading?: string | null
  meaning_vi: string
  part_of_speech?: string | null
  estimated_jlpt_level?: string | null
  difficulty?: number
  register?: string | null
  nuance_explanation?: string | null
  example_sentence?: string | null
  notes?: string | null
}

export interface VocabSaveLookupResponse {
  entry_id: string
  is_new: boolean
  message: string
}

export type LearningStrategy = 'targeted' | 'reinforcement' | 'exploration' | 'scenario_practice'


export interface SkillInfo {
  skill: string
  score: number
  confidence: 'high' | 'medium' | 'low'
  trend: 'improving' | 'stable' | 'declining'
  evidence_count: number
}

export interface JlptEstimate {
  min_level?: JlptLevel
  max_level?: JlptLevel
  confidence?: 'high' | 'medium' | 'low'
}

export interface RecentTrends {
  overall_score: number
  improvement: number
  last_7d_attempts: number
}

export interface LearnerFocus {
  goal: string | null
  target_jlpt: string | null
  daily_target: number
  weaknesses: string[]
  strengths: string[]
  estimated_jlpt: JlptEstimate
  recent_trends: RecentTrends
  evidence_count: number
}

export interface LearningSessionInfo {
  id: string
  goal: string | null
  recommended_focus: string[] | null
  exercises_completed: number
  created_at: string
}

export interface RecommendedExercise {
  id: string
  exercise_type: ExerciseType
  topic: string
  prompt_vi: string
  context: string
  target_length: TargetLength
  register: Register
  jlpt_level: JlptLevel
  difficulty: number
}

export interface LearningRecommendation {
  id: string
  strategy: LearningStrategy
  exercise_type: ExerciseType
  topic: string
  register: Register
  jlpt_level: JlptLevel
  difficulty: number
  target_length: TargetLength
  focus_skills: string[]
  reason: string
  explanation: string | null
  status: 'recommended' | 'completed' | 'replaced'
  exercise_id: string | null
  exercise: RecommendedExercise | null
  scenario_genre: string | null
  created_at: string
}

export interface LearningTodayResponse {
  session: LearningSessionInfo | null
  focus: LearnerFocus
  recommendation: LearningRecommendation | null
}

export interface LearningProfile {
  id: string
  goal: string | null
  goal_type: string | null
  target_jlpt: string | null
  daily_target: number
  preferred_registers: string[] | null
  preferred_topics: string[] | null
  native_language: string
  target_level: string | null
  adaptive_state: Record<string, unknown> | null
  evidence_count: number
  profile_version: string
  streak_enabled: boolean
  memory_enabled: boolean
  created_at: string
  updated_at: string
}

export interface LearningProfileUpdate {
  goal?: string | null
  goal_type?: string | null
  target_jlpt?: JlptLevel | null
  daily_target?: number
  preferred_registers?: string[] | null
  preferred_topics?: string[] | null
  streak_enabled?: boolean
  memory_enabled?: boolean
}

export interface LearningHistoryResponse {
  items: LearningRecommendation[]
  total: number
  skip: number
  limit: number
}

export interface LevelState {
  current_level: number
  current_xp: number
  xp_in_level: number
  xp_to_next_level: number
  progress_percent: number
}

export interface DailyGoalState {
  target: number
  completed_count: number
  completed: boolean
  progress_percent: number
}

export interface GamificationSummary {
  level: LevelState
  current_streak: number
  longest_streak: number
  last_active_date: string | null
  today_xp: number
  daily_goal: DailyGoalState
}

export interface XpEventItem {
  id: string
  event_type: string
  amount: number
  source_type: string
  source_id: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface XpHistoryResponse {
  items: XpEventItem[]
  total: number
  skip: number
  limit: number
}

export interface DailyMission {
  id: string
  mission_type: string
  title: string
  description: string
  target_count: number
  completed_count: number
  completed: boolean
  focus_skills: string[]
  topic: string
  register: string
  difficulty: number
  reason: string
  status: string
  provider: string
  model: string
  prompt_version: string
  created_at: string
}

export interface SessionSummary {
  progress_summary: {
    summary: string
    strengths: string[]
    weaknesses: string[]
    ai_generated: boolean
  } | null
  updated_at: string | null
}

export interface GamificationTodayResponse {
  summary: GamificationSummary
  mission: DailyMission | null
  focus: Record<string, unknown>
  recommendation: Record<string, unknown> | null
  session_summary: SessionSummary | null
  encouragement: string | null
  reminders: string[]
}

export type ChallengeType =
  | 'naturalness'
  | 'register'
  | 'vocabulary'
  | 'compression'
  | 'expansion'
  | 'nuance'
  | 'error_fix'

export interface Challenge {
  id: string
  challenge_type: ChallengeType
  instruction_vi: string
  source_text: string
  target_skill: string
  difficulty: number
  objective: string
  required_expression: string | null
  exercise_id: string
  status: string
  success_criteria: Record<string, unknown>
  xp_reward: number
  completed: boolean
  completed_at: string | null
  created_at: string
}

export interface ChallengeGenerateRequest {
  provider?: string
  model?: string
}

export interface ChallengeAttemptRequest {
  answer_text: string
  provider?: string
  model?: string
}

export interface ChallengeAttempt {
  id: string
  challenge_id: string
  attempt_id: string
  success: boolean
  score: number
  answer_text: string
  evaluation: Record<string, unknown>
  xp_awarded: number
  created_at: string
}

export interface ChallengeAttemptListResponse {
  items: ChallengeAttempt[]
  total: number
}

export interface MilestoneItem {
  id: string
  milestone_key: string
  title: string
  description: string
  achieved_at: string
  celebration: Record<string, unknown> | null
}

export interface MilestoneListResponse {
  items: MilestoneItem[]
}

export type JourneyObjectiveStatus = 'locked' | 'active' | 'completed' | 'skipped'

export interface JourneyMilestone {
  id: string
  position: number
  title: string
  description: string
  status: 'locked' | 'active' | 'completed'
  unlocked_at: string | null
  completed_at: string | null
}

export interface JourneyObjective {
  id: string
  milestone_id: string
  position: number
  title: string
  description: string
  target_competencies: string[]
  target_skills: string[]
  exercise_modes: string[]
  target_level: string
  priority: number
  status: JourneyObjectiveStatus
  unlocked_at: string | null
  completed_at: string | null
}

export interface JourneyProgress {
  skill_evidence: Record<string, { score: number; count: number }>
  mastery_state: string
  exercises_completed: number
  attempts_submitted: number
  average_score: number
  best_score: number
}

export interface JourneyStatusResponse {
  journey_id: string
  status: 'active' | 'completed' | 'archived'
  goal_type: string
  goal: string | null
  title: string | null
  overview_vi: string | null
  progress: number
  source: string
  current_milestone_id: string | null
  current_objective_id: string | null
  explanation: string | null
  started_at: string
  completed_at: string | null
  milestones: JourneyMilestone[]
  objectives: JourneyObjective[]
  objectives_progress: Record<string, JourneyProgress>
}

export interface JourneyCreateRequest {
  goal_type?: string | null
  goal?: string | null
  force_regenerate?: boolean
  provider?: string
  model?: string
}

export interface JourneyObjectiveContextResponse {
  objective_id: string
  objective_title: string
  milestone_title: string
  competency_labels_vi: Record<string, string>
  target_skills: string[]
  suggested_modes: string[]
  context: string
  progress: JourneyProgress
}

export interface JourneyEvidenceItem {
  objective_id: string
  exercise_id: string
  attempt_id: string
  exercise_type: string
  mode: string
  topic: string
  score: number
  skills: Record<string, unknown>
  created_at: string
}

export interface JourneyEvidenceListResponse {
  objective_id: string
  items: JourneyEvidenceItem[]
  total: number
}

export interface JourneyReplanningResponse {
  journey_id: string | null
  replan_requested: boolean
  trigger: string
  reason: string
  applied: boolean
  event_id: string | null
}

export interface ObjectiveExplanationResponse {
  objective_id: string
  summary_vi: string
  recommended_focus_vi: string
  source: string
}

export const GOAL_TYPE_LABELS_VI: Record<string, string> = {
  general: 'Tiếng Nhật tổng hợp',
  daily_conversation: 'Hội thoại hằng ngày',
  business: 'Tiếng Nhật công việc',
  it: 'Tiếng Nhật IT',
  brse: 'Tiếng Nhật BRSE',
  jlpt: 'Luyện thi JLPT',
  natural_japanese: 'Tiếng Nhật tự nhiên',
  writing_fluency: 'Lưu loát viết',
}

export const MASTERY_STATE_LABELS_VI: Record<string, string> = {
  not_started: 'Chưa bắt đầu',
  introduced: 'Đã làm quen',
  practicing: 'Đang luyện tập',
  developing: 'Đang phát triển',
  proficient: 'Thành thục',
  mastered: 'Đã thành thạo',
}

export interface WritingScores {
  sentence_quality: number
  discourse_quality: number
  overall_writing: number
  coherence_score: number
  cohesion_score: number
  organization_score: number
  flow_score: number
  style_consistency_score: number
  redundancy_score: number
  scenario_fit?: number | null
  scenario_semantic_fit?: number | null
  audience_fit?: number | null
  purpose_fit?: number | null
  tone_fit?: number | null
  constraint_compliance?: number | null
}

export interface WritingIssue {
  category: string
  severity: IssueSeverity
  sentence_index: number | null
  sentence_range: number[] | null
  explanation: string
  suggested_fix: string
}

export interface WritingSentenceScore {
  index: number
  text: string
  overall_score: number
  semantic_score: number
  grammar_score: number
  vocabulary_score: number
  naturalness_score: number
  context_fit_score: number
  register_fit_score: number
  issues: Array<Record<string, unknown>>
  summary: string
}

export interface WritingProvenance {
  provider: string
  model: string
  evaluation_version: string
  stages: Array<Record<string, unknown>>
  created_at: string
}

export interface WritingRewrites {
  minimal_fix: string
  natural_rewrite: string
  native_rewrite: string
  professional_rewrite: string | null
}

export interface ScenarioRequiredPoint {
  id: string
  description: string
  status: 'satisfied' | 'partially_satisfied' | 'missing'
  explanation: string
}

export interface ScenarioFormatSection {
  name: string
  status: 'present' | 'partial' | 'missing'
  note: string | null
}

export interface WritingScenarioRequirement {
  id: string
  description: string
}

export interface WritingScenario {
  id: string
  genre: string
  medium: string
  audience: string
  relationship: string
  purpose: string
  register: string
  tone: string
  target_length: string
  jlpt_level: string
  situation_vi: string
  context_vi: string
  required_points: WritingScenarioRequirement[]
  optional_points: string[]
  forbidden_patterns: string[]
  difficulty: number
  difficulty_metadata: Record<string, number>
  generation_metadata: Record<string, unknown> | null
  created_at: string
}

export interface ScenarioHistoryItem {
  scenario_id: string
  genre: string
  medium: string
  audience: string
  purpose: string
  register: string
  attempt_count: number
  last_attempt_at: string
}

export interface ScenarioHistoryResponse {
  items: ScenarioHistoryItem[]
  total: number
}

export interface ScenarioGenerateRequest {
  genre?: string
  medium?: string
  audience?: string
  purpose?: string
  register?: Register
  jlpt_level?: JlptLevel
  difficulty?: number
  provider?: string
  model?: string
}

export interface WritingLearningMode {
  enabled: boolean
  hints_revealed_count: number
  hints_total: number
  reveal_available: boolean
}

export interface WritingStructureSuggestion {
  reorder_advice: string | null
  template: string | null
  template_reason: string | null
}

export interface WritingEvaluationResponse {
  submission_id: string
  revision_number: number
  revision_id: string
  attempt_id: string
  exercise_id: string
  exercise_type: string
  target_length: string
  register: string
  text: string
  sentence_count: number
  scores: WritingScores
  strengths: string[]
  summary: string
  issues: WritingIssue[]
  sentence_scores: WritingSentenceScore[]
  improved_structure: string | null
  rewrites: WritingRewrites | null
  structure_suggestion: WritingStructureSuggestion | null
  learning_mode: WritingLearningMode | null
  discourse_available: boolean
  scenario_required_points: ScenarioRequiredPoint[] | null
  scenario_format_sections: ScenarioFormatSection[] | null
  scenario_unavailable: boolean | null
  status: string
  created_at: string
  provenance: WritingProvenance | null
}

export interface WritingRevisionListItem {
  id: string
  revision_number: number
  sentence_count: number
  overall_writing: number | null
  status: string
  created_at: string
}

export interface WritingSubmissionResponse {
  id: string
  exercise_id: string
  exercise_type: string
  target_length: string
  register: string
  topic: string
  prompt_vi: string
  mode: string
  status: string
  revision_count: number
  revisions: WritingRevisionListItem[]
  created_at: string
  updated_at: string
}

export interface WritingRevisionResponse {
  submission_id: string
  revision_number: number
  text: string
  scores: WritingScores
  deltas: Record<string, number>
  created_at: string
}

export interface WritingSentenceDiff {
  added: string[]
  removed: string[]
  changed: string[]
}

export interface WritingCompareResponse {
  submission_id: string
  from_revision: number
  to_revision: number
  deltas: Record<string, number>
  sentence_diff: WritingSentenceDiff
  guidance: string | null
  guidance_version: string | null
}

export interface WritingHintResponse {
  hint: string
  hints_revealed_count: number
  hints_total: number
  reveal_available: boolean
}

export interface WritingRevealResponse {
  submission_id: string
  revision_number: number
  rewrites: WritingRewrites
  revealed: boolean
}

export interface WritingCoachRequest {
  question: string
  provider?: string
  model?: string
}

export interface WritingCoachResponse {
  answer: string
  suggestions: string[]
}

export type SimulationMode = 'guided' | 'immersive'

export interface SimulationCreateRequest {
  scenario_id: string
  mode?: SimulationMode
  provider?: string
  model?: string
}

export interface SimulationTurnRequest {
  text: string
  end_early?: boolean
  provider?: string
  model?: string
}

export interface SimulationCoachRequest {
  question: string
  provider?: string
  model?: string
}

export interface SimulationStateOut {
  objective: string
  current_stage: string
  unresolved_items: string[]
  completed_items: string[]
  participant_positions: Record<string, unknown>
  facts: string[]
  decisions: string[]
  constraints: string[]
  emotional_context: string
  next_goal: string
}

export interface SimulationCorrections {
  minimal_fix: string | null
  natural_rewrite: string | null
  native_rewrite: string | null
}

export interface SimulationTurnIssueOut {
  category: string
  severity: string
  explanation: string
  suggested_fix: string
}

export interface SimulationTurnEvaluationOut {
  overall_score: number
  sentence_quality: number | null
  scenario_fit: number | null
  goal_progress: number
  communication_effectiveness: number
  naturalness_score: number | null
  strengths: string[]
  issues: SimulationTurnIssueOut[]
  feedback_vi: string | null
  corrections: SimulationCorrections | null
}

export interface SimulationTurnOut {
  id: string
  turn_number: number
  actor: 'ai' | 'user'
  turn_type: string
  text: string
  status: string
  created_at: string
  evaluation: SimulationTurnEvaluationOut | null
}

export interface SimulationSessionResponse {
  id: string
  scenario_id: string
  simulation_type: string
  mode: SimulationMode
  register: string
  jlpt_level: string
  difficulty: number
  pressure_condition: string
  status: string
  resolution: string | null
  max_turns: number
  current_turn: number
  objective_vi: string
  persona: Record<string, unknown> | null
  state: SimulationStateOut
  meta: Record<string, unknown>
  summary: Record<string, unknown> | null
  turns: SimulationTurnOut[]
  created_at: string
  updated_at: string
}

export interface SimulationHistoryItem {
  id: string
  simulation_type: string
  mode: SimulationMode
  register: string
  status: string
  resolution: string | null
  turn_count: number
  average_overall: number | null
  scenario_id: string
  created_at: string
  updated_at: string
}

export interface SimulationHistoryResponse {
  items: SimulationHistoryItem[]
  total: number
}

export interface SimulationCompareItem {
  previous_session_id: string
  deltas: Record<string, number>
}

export interface SimulationSummaryResponse {
  session_id: string
  summary_vi: string
  dimensions: Record<string, number>
  strengths: string[]
  needs_work: string[]
  resolution: string
  turn_count: number
  compare: SimulationCompareItem | null
  suggested_challenge: Record<string, unknown> | null
  ai_generated: boolean
  provider: string
  model: string
  prompt_version: string
}

export interface SimulationExplainResponse {
  turn_id: string
  corrections: SimulationCorrections | null
  issues: SimulationTurnIssueOut[]
  feedback_vi: string | null
  summary: string
}

export interface SimulationCoachResponse {
  answer: string
  suggestions: string[]
}

export interface QualityTaskHealth {
  calls: number
  success_rate: number | null
  avg_latency_ms: number | null
  fallback_rate: number | null
  quality_pass_rate: number | null
  input_tokens: number
  output_tokens: number
  total_tokens: number
  estimated_cost_usd: number
}

export interface QualityStatusResponse {
  enabled: boolean
  tasks: string[]
  criticality: Record<string, string>
  thresholds: Record<string, string | number | boolean>
}

export interface QualityRecentFailure {
  task: string
  provider: string | null
  model: string | null
  duration_ms: number
  success: boolean
  failure_class: string | null
  retry_count: number
  fallback_used: boolean
  quality_status: string | null
  result_hash: string | null
  criticality: string | null
  estimated_cost: number | null
  created_at: string
}

export interface QualityTelemetryResponse {
  total_events: number
  overall: QualityTaskHealth
  tasks: Record<string, QualityTaskHealth>
  providers: Record<string, QualityTaskHealth>
  recent_failures: QualityRecentFailure[]
}

export interface QualityPromptEntry {
  task: string
  version: string
  description: string
  criticality: string
  cost_profile: string
  output_schema: string | null
}

export interface BenchmarkRunRequest {
  provider?: string
  model?: string
  categories?: string[]
  limit?: number
}

export interface BenchmarkCaseResult {
  case_id: string
  category: string
  task: string
  schema_pass: boolean
  consistency_pass: boolean
  expected_properties_pass: boolean
  semantic_accuracy: boolean | null
  false_positive_grammar: boolean | null
  naturalness_agreement: boolean | null
  latency_ms: number
  violations: string[]
}

export interface BenchmarkAggregate {
  cases: number
  schema_pass_rate: number | null
  consistency_pass_rate: number | null
  expected_properties_pass_rate: number | null
  semantic_accuracy: number | null
  false_positive_grammar_rate: number | null
  naturalness_agreement: number | null
  avg_latency_ms: number | null
  results: BenchmarkCaseResult[]
}

export interface BenchmarkRun {
  id: string
  provider: string
  model: string
  status: string
  aggregate: BenchmarkAggregate | null
  created_at: string
}

export interface BenchmarkResult {
  case_id: string
  provider: string
  model: string
  schema_pass: boolean
  consistency_pass: boolean
  expected_properties_pass: boolean
  semantic_accuracy: boolean | null
  false_positive_grammar: boolean | null
  naturalness_agreement: boolean | null
  latency_ms: number
  token_usage: Record<string, number> | null
  created_at: string
}

export type MemoryCategory =
  | 'preference'
  | 'learning_pattern'
  | 'mistake_pattern'
  | 'successful_pattern'
  | 'vocabulary_memory'
  | 'expression_memory'
  | 'scenario_memory'
  | 'simulation_memory'
  | 'goal_memory'
  | 'style_preference'
  | 'milestone_memory'

export type MemoryConfidence = 'high' | 'medium' | 'low'

export interface LearnerMemory {
  id: string
  category: MemoryCategory
  type: 'semantic' | 'episodic' | 'pattern' | 'preference'
  content: string
  confidence: MemoryConfidence
  importance: number
  source_type: string
  source_id: string | null
  evidence: unknown[]
  occurrence_count: number
  status: 'active' | 'archived' | 'expired'
  memory_class: 'stable' | 'temporary'
  first_seen_at: string
  last_seen_at: string
  created_at: string
  updated_at: string
}

export interface LearnerMemoryCreate {
  category: MemoryCategory
  type?: 'semantic' | 'episodic' | 'pattern' | 'preference'
  content: string
  importance?: number
}

export interface MemoryListResponse {
  items: LearnerMemory[]
  total: number
  skip: number
  limit: number
}

export interface MemoryRefreshResponse {
  processed_events: number
  created: number
  updated: number
  rejected: number
  expired: number
}
// --- Analytics (Phase 14) ---

export type AnalyticsWindow = '7d' | '14d' | '30d' | '90d' | 'all_time'

export interface AnalyticsSkillOutcome {
  skill: string
  current: number | null
  baseline: number | null
  delta: number | null
  trend: 'up' | 'down' | 'stable' | null
  evidence_count: number
  insufficient_evidence: boolean
  note: string | null
}

export interface AnalyticsSummary {
  window: AnalyticsWindow
  active_days: number
  total_attempts: number
  completed_exercises: number
  evaluation_attempts: number
  discourse_submissions: number
  simulation_sessions: number
  discoveries: number
  scenarios_created: number
  recommendations_completed: number
  memories_created: number
  objectives_completed: number
}

export interface AnalyticsLearnerSummary {
  window: AnalyticsWindow
  skills: AnalyticsSkillOutcome[]
  generated_at: string
}

export interface AnalyticsLearningOutcomes {
  window: AnalyticsWindow
  skills: AnalyticsSkillOutcome[]
}

export interface AnalyticsFeatureEntry {
  metric_key: string
  label: string
  value: number | null
  sample_count: number
  trend: string | null
  insufficient_evidence: boolean
}

export interface AnalyticsFeatures {
  window: AnalyticsWindow
  scenario_effectiveness: AnalyticsFeatureEntry[]
  simulation_effectiveness: AnalyticsFeatureEntry[]
  curriculum_effectiveness: AnalyticsFeatureEntry[]
  recommendation_effectiveness: AnalyticsFeatureEntry | null
  difficulty_effectiveness: AnalyticsFeatureEntry[]
  vocabulary_effectiveness: AnalyticsFeatureEntry[]
  memory_effectiveness: AnalyticsFeatureEntry[]
}

export interface AnalyticsTelemetryRow {
  task: string
  provider: string
  model: string | null
  calls: number
  success_rate: number | null
  quality_pass_rate: number | null
  avg_latency_ms: number | null
  fallback_rate: number | null
  estimated_cost_usd: number
  prompt_version: string | null
}

export interface AnalyticsCostRow {
  metric_key: string
  label: string
  value: number | null
  dimension: string | null
  dimension_value: string | null
  sample_count: number
}

export interface AnalyticsAiResponse {
  window: AnalyticsWindow
  overview: AnalyticsCostRow[]
  by_task: AnalyticsTelemetryRow[]
  by_provider: AnalyticsTelemetryRow[]
  prompt_regressions: AnalyticsTelemetryRow[]
  cost_by_provider: AnalyticsCostRow[]
  cost_by_task: AnalyticsCostRow[]
}

export interface AnalyticsCalibrationItem {
  difficulty: number
  level: string | null
  exercise_type: string | null
  avg_score: number | null
  completion_rate: number | null
  attempt_count: number
  verdict: 'too_easy' | 'too_hard' | 'appropriate' | 'mixed'
  note: string | null
}

export interface AnalyticsCalibration {
  window: AnalyticsWindow
  items: AnalyticsCalibrationItem[]
}

export interface AnalyticsFunnelStage {
  stage: string
  value: number
  conversion: number | null
}

export interface AnalyticsFunnel {
  window: AnalyticsWindow
  stages: AnalyticsFunnelStage[]
}

export type RecommendationDecision = 'accept' | 'reject' | 'implement'

export interface AnalyticsRecommendation {
  id: string
  area: string
  priority: 'low' | 'medium' | 'high'
  finding: string
  recommended_action: string
  evidence: string[]
  confidence: 'low' | 'medium' | 'high'
  inference_type: 'observation' | 'comparison'
  source: string
  status: 'pending' | 'accepted' | 'rejected' | 'implemented'
  created_at: string
  decided_at: string | null
  decision_note: string | null
}

export interface AnalyticsRecommendationsResponse {
  total: number
  items: AnalyticsRecommendation[]
}

export interface AnalyticsInsight {
  area: string
  priority: string
  finding: string
  recommended_action: string
  evidence: string[]
  confidence: string
  inference_type: string
}

export interface AnalyticsAnalyzeRequest {
  window?: AnalyticsWindow
  provider?: string
  model?: string
}

export interface AnalyticsAnalyzeResponse {
  recommendations: AnalyticsRecommendation[]
  insights: AnalyticsInsight[]
}

export interface AnalyticsExperiment {
  id: string
  name: string
  description: string | null
  target: string
  control: Record<string, unknown>
  variant: Record<string, unknown>
  allocation: number
  status: 'draft' | 'active' | 'completed' | 'archived'
  metrics: string[]
  created_at: string
}

export interface AnalyticsExperimentCreateRequest {
  name: string
  description?: string
  target: string
  control: Record<string, unknown>
  variant: Record<string, unknown>
  allocation?: number
  metrics?: string[]
}

export interface AnalyticsExperimentMetricComparison {
  metric: string
  control_value: number | null
  variant_value: number | null
  delta: number | null
  sample_count: number
  insufficient_evidence: boolean
}

export interface AnalyticsExperimentMetrics {
  experiment_id: string
  comparisons: AnalyticsExperimentMetricComparison[]
}

export interface AnalyticsExperimentAssignResponse {
  experiment_id: string
  arm: 'control' | 'variant'
  assigned_at: string
}

// ================= Cultural & Gamification AI Types =================

export interface HankoSuggestionOption {
  kanji: string
  reading: string
  meaning_vi: string
  seal_style: string
  philosophy: string
}

export interface HankoSuggestionResponse {
  name_input: string
  options: HankoSuggestionOption[]
  overall_advice: string
}

export interface HaikuGenerateRequest {
  season?: string
  theme?: string
  streak_days?: number
  provider?: string
  model?: string
}

export interface HaikuGenerateResponse {
  season: string
  kigo: string
  lines_jp: string[]
  lines_reading: string[]
  translation_vi: string
  explanation: string
  author_jp: string
  author_vi: string
}

export interface OmikujiDrawRequest {
  clan_id?: string
  study_focus?: string
  provider?: string
  model?: string
}

export interface OmikujiFortuneResponse {
  rank: string
  rank_vi: string
  buff: string
  exp_buff_percent: number
  color: string
  waka_jp: string
  waka_reading: string
  waka_vi: string
  writing_advice: string
  grammar_advice: string
  vocab_advice: string
  streak_advice: string
  lucky_kanji: string
  lucky_kanji_reading: string
  lucky_kanji_meaning: string
  lucky_grammar: string
  lucky_color: string
}

export interface KotowazaGenerateRequest {
  category?: string
  jlpt_level?: string
  provider?: string
  model?: string
}

export interface KotowazaResponse {
  expression_jp: string
  reading: string
  meaning_literal: string
  vietnamese_equivalent: string
  origin_story: string
  example_sentence_jp: string
  example_sentence_vi: string
  practice_prompt: string
  is_yojijukugo: boolean
}

export interface KitsuneDialogueRequest {
  streak?: number
  today_completed_count?: number
  current_clan?: string
  user_mood?: string
  page_context?: string
  provider?: string
  model?: string
}

export interface KitsuneDialogueResponse {
  mood: string
  message_vi: string
  message_jp: string
  action_tip: string
}

export interface KitsuneChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export interface KitsuneChatRequest {
  messages: KitsuneChatMessage[]
  clan_id?: string
  page_context?: string
  streak?: number
  provider?: string
  model?: string
}

export interface KitsuneChatResponse {
  reply: string
  mood: string
  japanese_phrase?: string
  suggested_chips?: string[]
}

export interface FuriganaToken {
  surface: string
  reading: string | null
  is_kanji: boolean
  pos?: string[]
}

export interface FuriganaConvertResponse {
  original_text: string
  annotated_text: string
  ruby_html: string
  tokens: FuriganaToken[]
}

export interface FuriganaConvertRequest {
  text: string
  mode?: 'A' | 'B' | 'C'
}

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'ai'
  | 'grammar'
  | 'vocabulary'
  | 'naturalness'
  | 'semantic'
  | 'register'
  | 'discourse'
  | 'scenario'

// Phase 16: Writing Intelligence Foundation
export type WeaknessStatus = 'new' | 'recurring' | 'persistent' | 'improving' | 'mastered' | 'regressed'
export type WeaknessLifecycleState =
  | 'new'
  | 'observed'
  | 'recurring'
  | 'targeted'
  | 'improving'
  | 'stable'
  | 'mastered'
  | 'recurrent'

export interface MasteryEvidence {
  exposures: number
  correct_uses: number
  incorrect_uses: number
  recurrences: number
  days_since_last_error: number
  context_scores: Record<string, number>
  context_diversity: number
  register_diversity: number
  free_writing_pass_rate: number
  contexts_passed: string[]
  contexts_failed: string[]
  mastery_score: number
}

export interface MasteryNarrative {
  why_it_matters: string
  current_mastery: string
  evidence_text: string
  next_step: string
}

export interface MasteryHistoryEvent {
  from_state: string | null
  to_state: string
  timestamp: string
  trigger: string
  mastery_score?: number
  corrected_count?: number
  recurrence_count?: number
  details?: Record<string, any>
}

export interface WritingWeakness {
  id: string
  user_id: string | null
  category: 'grammar' | 'lexicon' | 'naturalness' | 'register' | 'discourse' | string
  subtype: string
  description: string
  examples: string[]
  frequency: number
  first_seen_at: string
  last_seen_at: string
  severity: 'info' | 'minor' | 'major' | 'critical' | string
  recurrence_count: number
  corrected_count: number
  exposure_count: number
  mastery_score: number
  confidence: 'low' | 'medium' | 'high' | string
  status: WeaknessStatus
  lifecycle_state?: WeaknessLifecycleState | string
  correct_count_by_context?: Record<string, number>
  incorrect_count_by_context?: Record<string, number>
  context_generalization_score?: number
  register_diversity_score?: number
  last_correct_at?: string | null
  last_incorrect_at?: string | null
  days_since_last_error?: number
  retest_due_at?: string | null
  retest_interval_days?: number
  retest_passed_count?: number
  mastery_evidence?: Record<string, any>
  mastery_history?: MasteryHistoryEvent[]
  mastery_narrative?: MasteryNarrative | null
  narrative_generated_at?: string | null
  affected_registers: string[]
  affected_contexts: string[]
  affected_jlpt_levels: string[]
  related_expressions: string[]
  related_grammar_patterns: string[]
  evidence_refs: Array<{
    evaluation_id?: string
    source_type?: string
    created_at?: string
  }>
  created_at: string
  updated_at: string
}

export interface WeaknessDetail extends WritingWeakness {
  evidence_summary?: MasteryEvidence
  narrative?: MasteryNarrative
  is_retest_due?: boolean
  target_retest_context?: string
}

export interface DueRetest {
  weakness_id: string
  category: string
  subtype: string
  description: string
  lifecycle_state: string
  retest_due_at: string
  retest_interval_days: number
  target_context_type: string
  is_overdue: boolean
  days_overdue: number
  narrative?: MasteryNarrative | null
}

export interface DueRetestListResponse {
  items: DueRetest[]
  total: number
}

export interface EvidenceSummary {
  total_weaknesses: number
  by_lifecycle_state: Record<string, number>
  contexts_tracked: string[]
  average_context_diversity: number
  average_mastery_score: number
  due_retests_count: number
  mastered_count: number
  recurrent_count: number
  top_improving: WritingWeakness[]
  top_at_risk: WritingWeakness[]
}

export interface WritingWeaknessListResponse {
  items: WritingWeakness[]
  total: number
  skip: number
  limit: number
}

export interface DimensionSummary {
  category: string
  total_weaknesses: number
  mastered_count: number
  recurring_count: number
  persistent_count: number
  average_mastery: number
}

export interface WritingFingerprint {
  strongest_dimensions: string[]
  weakest_dimensions: string[]
  top_recurring: WritingWeakness[]
  emerging: WritingWeakness[]
  declining: WritingWeakness[]
  persistent: WritingWeakness[]
  register_weaknesses: WritingWeakness[]
  naturalness_weaknesses: WritingWeakness[]
  discourse_weaknesses: WritingWeakness[]
  dimensions: DimensionSummary[]
  total_tracked_weaknesses: number
  active_weakness_count: number
  mastered_weakness_count: number
  overall_mastery_rate: number
}

export interface WritingIntelligenceProfile {
  fingerprint: WritingFingerprint
  top_recurring_weaknesses: WritingWeakness[]
  persistent_weaknesses: WritingWeakness[]
  recent_improvements: WritingWeakness[]
  recommended_focus: string[]
  total_evaluations_analyzed: number
  last_analyzed_at: string | null
}

export interface WritingIntelligenceSummary {
  top_recurring: WritingWeakness[]
  persistent: WritingWeakness[]
  recent_improvements: WritingWeakness[]
  recommended_focus: string[]
  overall_mastery_rate: number
  active_weaknesses_count: number
  strongest_dimensions: string[]
  weakest_dimensions: string[]
}

export interface WritingWeaknessListParams {
  category?: string
  status?: string
  lifecycle_state?: string
  severity?: string
  skip?: number
  limit?: number
}

export interface WeaknessRootCause {
  category: string
  subtype: string
  root_cause_vi: string
  japanese_pattern_tip: string
  example_bad_vs_good: string | null
}

export interface WritingDiagnosisResult {
  overall_assessment_vi: string
  strengths_assessment_vi: string
  root_causes: WeaknessRootCause[]
  action_plan_vi: string[]
  recommended_grammar_focus: string[]
  encouragement_vi: string
  estimated_writing_level: string
}

// Phase 18: Targeted Writing Drill Types
export type WritingDrillType =
  | 'recognition'
  | 'correction'
  | 'rewrite'
  | 'vietnamese_to_japanese'
  | 'japanese_to_natural_rewrite'
  | 'pattern_substitution'
  | 'free_response'
  | 'real_world_mini_task'

export type DrillGuidanceLevel =
  | 'heavy_guidance'
  | 'light_guidance'
  | 'minimal_guidance'
  | 'no_guidance'

export interface DrillOption {
  id: string
  text: string
  is_correct: boolean
  explanation?: string
}

export interface DrillItem {
  id: string
  drill_type: WritingDrillType
  stage: number
  guidance_level: DrillGuidanceLevel
  title_vi: string
  instructions_vi: string
  context_description: string
  source_text: string
  scaffold?: string | null
  hints: string[]
  options?: DrillOption[] | null
  target_focus: string
  explanation: string
  target_answer?: string | null
  accepted_alternatives?: string[]
}

export interface DrillAttemptRecord {
  item_id: string
  item_index: number
  user_answer: string
  is_correct: boolean
  score: number
  feedback_vi: string
  nuance_contrast?: string | null
  corrected_text?: string | null
  hints_revealed_count: number
  revealed: boolean
  evaluated_at: string
}

export interface DrillOutcome {
  total_items: number
  passed_items: number
  average_score: number
  completion_rate: number
  mastery_delta: number
  debrief_vi?: string | null
  next_step_vi?: string | null
}

export interface DrillSession {
  id: string
  user_id?: string | null
  weakness_id?: string | null
  weakness_category: string
  weakness_subtype: string
  title: string
  target_focus: string
  jlpt_level: string
  difficulty: number
  status: 'active' | 'completed' | 'abandoned'
  current_item_index: number
  total_items: number
  items: DrillItem[]
  attempts: DrillAttemptRecord[]
  outcome?: DrillOutcome | null
  mastery_delta: number
  created_at: string
  completed_at?: string | null
}

export interface DrillGenerateParams {
  weakness_id?: string
  category?: string
  subtype?: string
  jlpt_level?: string
  difficulty?: number
  context_domain?: string
  provider?: string
  model?: string
}

export interface DrillAttemptParams {
  item_id?: string
  item_index?: number
  answer_text: string
  provider?: string
  model?: string
}

export interface DrillAttemptResult {
  is_correct: boolean
  score: number
  feedback_vi: string
  nuance_contrast?: string | null
  corrected_text?: string | null
  item_index: number
  next_item_index: number
  session_status: string
  outcome?: DrillOutcome | null
  mastery_delta: number
}

export interface DrillHintResult {
  hint?: string | null
  hints_revealed_count: number
  hints_total: number
}

export interface DrillRevealResult {
  target_answer: string
  explanation: string
  accepted_alternatives: string[]
}

export interface DueDrillWeakness {
  weakness_id: string
  category: string
  subtype: string
  description: string
  mastery_score: number
  lifecycle_state: string
  severity: string
  recommended_drill_types: string[]
  priority_reason: string
  retest_due: boolean
}

export interface DueDrillListResponse {
  items: DueDrillWeakness[]
  total: number
}

export interface DrillSessionListResponse {
  items: DrillSession[]
  total: number
  skip: number
  limit: number
}

// ---------------------------------------------------------------------------
// Phase 19 — Self-Correction & Rewrite Lab Types
// ---------------------------------------------------------------------------

export type RewriteMode = 'minimal' | 'natural' | 'register' | 'concision' | 'expansion' | 'native'

export type ImprovementStatus =
  | 'significantly_improved'
  | 'improved'
  | 'partially_improved'
  | 'unchanged'
  | 'regressed'

export interface RewriteVariants {
  original: string
  minimal_correction: string
  natural_japanese: string
  formal_business?: string | null
  casual_variant?: string | null
  synthesis_prompt_vi: string
  explanations: Record<string, string>
}

export interface SelfCorrectionAttemptResult {
  is_correct: boolean
  is_improved: boolean
  score: number
  improvement_status: ImprovementStatus
  quality_delta: number
  feedback_vi: string
  remaining_issues: string[]
  next_step_action: 'proceed_to_transfer' | 'advance_to_clue' | 'advance_to_pattern' | 'advance_to_reveal'
  next_clue?: string | null
  next_pattern?: string | null
}

export interface TransferTask {
  concept_tested: string
  scenario_prompt_vi: string
  required_pattern: string
  context_hint_vi?: string | null
}

export interface TransferEvaluation {
  transferred_successfully: boolean
  pattern_applied_correctly: boolean
  score: number
  feedback_vi: string
  strengths: string[]
  improvement_points: string[]
  exemplar_sentence?: string | null
}

export interface RewriteModeResult {
  mode: RewriteMode
  mode_label_vi: string
  rewritten_text: string
  explanation_vi: string
  key_changes: string[]
}

export interface DiffChunk {
  type: 'equal' | 'insert' | 'delete' | 'replace'
  before_text: string
  after_text: string
  rationale_vi: string
}

export interface DiffExplanation {
  before: string
  after: string
  chunks: DiffChunk[]
  improvement_status: ImprovementStatus
  quality_delta: number
  summary_rationale_vi: string
}

export interface SocraticCoachResult {
  answer: string
  pattern_highlight?: string | null
  why_previous_failed_vi?: string | null
  suggestions: string[]
}

export interface RewriteLabAttemptRecord {
  attempt_number: number
  text: string
  is_correct: boolean
  is_improved: boolean
  score: number
  improvement_status: ImprovementStatus
  quality_delta: number
  feedback_vi: string
  remaining_issues: string[]
  step_evaluated_at: number
}

export interface TransferAttemptRecord {
  text: string
  transferred_successfully: boolean
  pattern_applied_correctly: boolean
  score: number
  feedback_vi: string
  strengths: string[]
  improvement_points: string[]
  exemplar_sentence?: string | null
}

export interface RewriteLabSession {
  id: string
  user_id?: string | null
  source_type: string
  source_id?: string | null
  original_text: string
  context_vi?: string | null
  has_issue: boolean
  issue_category?: string | null
  issue_category_name_vi?: string | null
  issue_explanation_vi?: string | null
  target_concept?: string | null
  target_segment?: string | null
  current_step: number // 2: Category, 3: Attempt 1, 4: Clue, 5: Pattern, 6: Reveal
  status: 'active' | 'self_corrected' | 'revealed' | 'transferred' | 'completed'
  clue?: string | null
  pattern?: string | null
  attempts: RewriteLabAttemptRecord[]
  revealed_variants?: RewriteVariants | null
  transfer_task?: TransferTask | null
  transfer_attempts: TransferAttemptRecord[]
  created_at: string
  updated_at: string
}

export interface CreateRewriteSessionParams {
  text: string
  context_vi?: string
  source_type?: string
  source_id?: string
  provider?: string
  model?: string
}

export interface SubmitSelfCorrectionParams {
  attempt_text: string
  provider?: string
  model?: string
}

export interface SubmitTransferParams {
  transfer_text: string
  provider?: string
  model?: string
}

export interface TransformModeParams {
  text: string
  mode: RewriteMode
  target_register?: 'casual' | 'polite' | 'business'
  context_vi?: string
  provider?: string
  model?: string
}

export interface DiffExplainParams {
  before: string
  after: string
  provider?: string
  model?: string
}

export interface SocraticCoachParams {
  question: string
  session_id?: string
  current_weakness?: string
  provider?: string
  model?: string
}

export interface RecentSnippetItem {
  id: string
  text: string
  source_type: 'practice' | 'challenge' | 'free_writing' | 'simulation' | 'weakness'
  source_title: string
  context_vi?: string | null
  issue_preview?: string | null
  created_at: string
}

export interface RecentSnippetsResponse {
  snippets: RecentSnippetItem[]
  total: number
}

// ----------------------------------------------------------------------------
// Phase 20: Real-World Writing Mission System Types
// ----------------------------------------------------------------------------

export type MissionCategory = 'daily_life' | 'work' | 'services' | 'social'
export type PromptMode = 'vietnamese_scenario' | 'japanese_scenario' | 'contextual_simulation'

export interface VocabularyHelperItem {
  word: string
  reading: string
  meaning: string
  example?: string | null
}

export interface MissionRequiredPoint {
  id: string
  description: string
}

export interface RealWorldMissionGenerateRequest {
  category?: MissionCategory | string
  action_type?: string
  prompt_mode?: PromptMode | string
  target_weakness_id?: string | null
  role?: string | null
  recipient?: string | null
  register?: Register | string
  jlpt_level?: JlptLevel | string
  difficulty?: number
  provider?: string
  model?: string
}

export interface RealWorldMission {
  id: string
  category: MissionCategory
  action_type: string
  prompt_mode: PromptMode
  role: string
  recipient: string
  relationship: string
  objective: string
  situation_vi: string
  context_vi: string
  situation_ja?: string | null
  context_ja?: string | null
  incoming_message?: string | null
  constraints: string[]
  required_points: MissionRequiredPoint[]
  target_register: Register
  optional_vocabulary: VocabularyHelperItem[]
  success_conditions: string[]
  difficulty: number
  jlpt_level: JlptLevel
  pedagogical_target_summary?: string | null
  created_at: string
}

export interface MissionEvaluationRequest {
  scenario_id?: string | null
  text: string
  mission_context?: Record<string, unknown> | null
  provider?: string
  model?: string
}

export interface MissionDimensionScore {
  score: number
  status: 'excellent' | 'good' | 'needs_work' | 'poor'
  feedback_vi: string
}

export interface Mission10Dimensions {
  task_completion: MissionDimensionScore
  factual_completeness: MissionDimensionScore
  naturalness: MissionDimensionScore
  grammar: MissionDimensionScore
  vocabulary: MissionDimensionScore
  register: MissionDimensionScore
  politeness: MissionDimensionScore
  tone: MissionDimensionScore
  clarity: MissionDimensionScore
  discourse: MissionDimensionScore
}

export interface MissionRequiredPointCheck {
  id: string
  description: string
  status: 'satisfied' | 'partially_satisfied' | 'missing'
  explanation_vi: string
}

export interface MissionEvaluationResponse {
  overall_score: number
  passed: boolean
  dimensions: Mission10Dimensions
  required_points: MissionRequiredPointCheck[]
  constraints_respected: boolean
  constraints_feedback: string[]
  strengths_vi: string[]
  improvements_vi: string[]
  native_model_rewrite: string
  rewrite_nuances_vi: string
  cultural_discourse_tip_vi?: string | null
  weakness_mastery_updated: boolean
  weakness_feedback_summary?: string | null
  scenario_id?: string | null
}

export interface TransitionToSimulationResponse {
  session_id: string
  scenario_id: string
  status: string
  current_turn: number
  persona?: {
    name?: string
    role?: string
    relationship?: string
    tone?: string
    language_style?: string
  } | null
  turns: Array<{
    id?: string
    turn_number: number
    actor: 'user' | 'ai'
    text: string
  }>
}

export interface MissionTaxonomyCategory {
  id: MissionCategory
  label_vi: string
  label_ja: string
  icon: string
  description: string
  action_count: number
}

export interface MissionTaxonomyAction {
  action_type: string
  category: MissionCategory
  label_vi: string
  label_ja: string
  default_register: Register
  recommended_jlpt: string[]
  default_medium: string
  typical_role_vi: string
  typical_recipient_vi: string
  communicative_purpose_vi: string
}

export interface MissionTaxonomyPromptMode {
  mode: PromptMode
  mode_code: string
  label_vi: string
  description_vi: string
  recommended_level: string
}

export interface MissionTaxonomyDimension {
  key: keyof Mission10Dimensions
  label_vi: string
  label_ja: string
  description_vi: string
  weight: number
}

export interface MissionTaxonomyResponse {
  categories: MissionTaxonomyCategory[]
  actions: MissionTaxonomyAction[]
  prompt_modes: MissionTaxonomyPromptMode[]
  evaluation_dimensions: MissionTaxonomyDimension[]
}

// ==========================================
// Phase 21: Japanese Expression Intelligence
// ==========================================

export type ExpressionType =
  | 'collocation'
  | 'discourse_marker'
  | 'sentence_ending'
  | 'connector'
  | 'set_phrase'

export type TransferClassification =
  | 'natural'
  | 'possible_but_unnatural'
  | 'literal_translation'
  | 'native_preferred'

export interface ExpressionRecord {
  id: string
  user_id: string | null
  expression: string
  base_word: string | null
  expression_type: ExpressionType
  used_count: number
  misused_count: number
  avoided_count: number
  natural_use_count: number
  registers_used: string[]
  naturalness_avg: number
  is_overused: boolean
  overuse_count: number
  vietnamese_literal: boolean
  transfer_classification: TransferClassification
  native_alternatives: string[]
  collocations: string[]
  example_contexts: string[]
  nuance_notes: string | null
  first_used_at: string
  last_used_at: string
  created_at: string
  updated_at: string
}

export interface ExpressionBankSummary {
  total_expressions: number
  overused_count: number
  literal_count: number
  collocations_count: number
  discourse_markers_count: number
  sentence_endings_count: number
  average_naturalness: number
  by_transfer_classification: {
    natural?: number
    possible_but_unnatural?: number
    literal_translation?: number
    native_preferred?: number
  }
  top_overused: ExpressionRecord[]
  top_transfers: ExpressionRecord[]
}

export interface ExpressionBankListResponse {
  items: ExpressionRecord[]
  total: number
  skip: number
  limit: number
}

export interface CollocationIssue {
  expression: string
  base_word: string
  classification: 'natural' | 'acceptable' | 'unnatural'
  native_alternative: string
  explanation_vi: string
  register: string
}

export interface OveruseDetection {
  expression: string
  count: number
  is_legitimate: boolean
  explanation_vi: string
  suggested_alternatives: string[]
}

export interface TransferDetection {
  expression: string
  classification: 'grammatically_possible_but_unnatural' | 'literal_translation' | 'native_preferred_alternative'
  native_alternative: string
  explanation_vi: string
}

export interface CollocationAnalysisResult {
  collocations: CollocationIssue[]
  overuse: OveruseDetection[]
  transfers: TransferDetection[]
  overall_naturalness_score: number
  summary_vi: string
}

export interface ExpressionVariationItem {
  text: string
  register: string
  nuance_vi: string
  key_phrase: string
}

export interface ExpressionVariationResult {
  original: string
  variations: ExpressionVariationItem[]
  synthesis_prompt_vi: string
}

export interface RegisterTransformationResult {
  original: string
  source_register: string
  target_register: string
  transformed_text: string
  key_changes: string[]
  explanation_vi: string
}

export interface CollocationSuggestionItem {
  collocation: string
  meaning_vi: string
  example_sentence: string
  register: string
}

export interface CollocationSuggestionsResult {
  base_word: string
  suggestions: CollocationSuggestionItem[]
  tip_vi: string
}

export interface AnalyzeExpressionsParams {
  text: string
  context_vi?: string
  target_register?: string
  provider?: string
  model?: string
}

export interface GenerateVariationsParams {
  text: string
  context_vi?: string
  provider?: string
  model?: string
}

export interface RegisterTransformParams {
  text: string
  source_register?: string
  target_register: string
  provider?: string
  model?: string
}

export interface ExpressionBankListParams {
  expression_type?: string
  is_overused?: boolean
  vietnamese_literal?: boolean
  transfer_classification?: string
  base_word?: string
  skip?: number
  limit?: number
}

// ---------------------------------------------------------------------------
// Phase 22 — Adaptive Writing Curriculum 2.0 Types
// ---------------------------------------------------------------------------

export interface RankedWeakness {
  weakness_id: string
  category: string
  subtype: string
  description: string
  priority_score: number
  priority_reason: string
  lifecycle_state: string
  next_context_type: string
  severity: string
  recurrence_count: number
  mastery_score: number
}

export interface PlanTask {
  task_id: string
  task_type:
    | 'targeted_drill'
    | 'self_correction'
    | 'real_world_writing'
    | 'transfer_retest'
    | 'exploration'
    | string
  weakness_id?: string | null
  category?: string | null
  subtype?: string | null
  context_type:
    | 'sentence'
    | 'rewrite'
    | 'casual'
    | 'polite'
    | 'business'
    | 'paragraph'
    | 'free_writing'
    | 'real_world_mission'
    | string
  task_description: string
  reason: string
  register?: string | null
  jlpt_level?: string | null
  bucket: 'persistent' | 'reinforcement' | 'exploration' | string
}

export interface DailyPlan {
  plan_date: string
  tasks: PlanTask[]
  total_tasks: number
  bucket_breakdown: Record<string, number>
  generated_at: string
  enriched: boolean
}

export interface WeaknessPriorityResponse {
  items: RankedWeakness[]
  total: number
  enriched: boolean
}

export interface SessionDoneRequest {
  completed_task_ids: string[]
}

export interface SessionDoneResult {
  completed_count: number
  contexts_advanced: string[]
  session_debrief?: string | null
}

// ---------------------------------------------------------------------------
// Phase 23 — Writing Mastery & Boss Assessment Types
// ---------------------------------------------------------------------------

export interface SubSkillItem {
  name: string
  category: string
  status: string
  score: number
  evidence_count: number
}

export interface MasteryCriteriaProof {
  repeated_correct_usage: boolean
  repeated_correct_count: number
  delayed_retention: boolean
  retention_days: number
  new_context_transfer: boolean
  distinct_contexts_count: number
  free_writing_evidence: boolean
  free_writing_pass_rate: number
  real_world_evidence: boolean
  real_world_pass_count: number
  is_fully_mastered: boolean
  missing_criteria: string[]
}

export interface WritingMasteryDimension {
  key: string
  label: string
  label_vi: string
  description_vi: string
  score: number
  status: string
  confidence: string
  evidence_count: number
  recent_trend: string
  sub_skills: SubSkillItem[]
  criteria_proof?: MasteryCriteriaProof | null
}

export interface WritingMasteryProfile {
  dimensions: WritingMasteryDimension[]
  overall_mastery_index: number
  mastered_count: number
  unstable_count: number
  persistent_count: number
  current_strengths: string[]
  current_priorities: string[]
  next_boss_task_recommendation?: {
    task_id: string
    title: string
    task_type: string
    target_register: string
    time_limit_minutes: number
    status: string
  } | null
}

export interface BossTask {
  id: string
  task_type: string
  title: string
  situation_vi: string
  context_vi: string
  audience: string
  relationship: string
  target_register: string
  required_constraints: string[]
  forbidden_patterns: string[]
  target_word_count_min: number
  target_word_count_max: number
  time_limit_minutes: number
  target_weakness_ids: string[]
  adversarial_traps: string[]
  jlpt_level: string
  difficulty: number
  status: string
  created_at: string
}

export interface BossTieredRewrites {
  minimal_fix: string
  natural_polish: string
  business_mastery: string
  polish_notes_vi?: string | null
}

export interface RegressionDiagnosisItem {
  weakness_subtype: string
  category: string
  diagnosis_vi: string
  trigger_context: string
}

export interface BossEvaluationResult {
  id: string
  task_id: string
  overall_score: number
  verdict: 'PASS_WITH_DISTINCTION' | 'PASS' | 'NEEDS_RETRY' | 'FAILED' | string
  scores: Record<string, number>
  feedback_vi: string
  strengths: string[]
  critical_gaps: string[]
  rewrites: BossTieredRewrites
  historical_comparison: {
    has_baseline: boolean
    score_delta: number
    past_evaluations_count: number
    trajectory: string
  }
  weakness_impacts: Array<{
    subtype: string
    impact: string
    description: string
  }>
  regression_diagnoses: RegressionDiagnosisItem[]
  evaluated_at: string
}

export interface BossHistoryItem {
  id: string
  task_id: string
  task_title: string
  task_type: string
  target_register: string
  overall_score: number
  verdict: string
  character_count: number
  duration_seconds: number
  evaluated_at: string
}

export interface WeaknessEvolutionItem {
  id: string
  category: string
  subtype: string
  description: string
  lifecycle_state: string
  status: string
  mastery_score: number
  days_since_last_error: number
  corrected_count: number
  recurrence_count: number
  first_seen_at: string
  last_seen_at: string
}

export interface EvolutionTrendPoint {
  date: string
  score: number
  session_type?: string | null
  notes?: string | null
}

export interface WritingEvolutionTimeline {
  weaknesses_eliminated: WeaknessEvolutionItem[]
  weaknesses_reduced: WeaknessEvolutionItem[]
  persistent_weaknesses: WeaknessEvolutionItem[]
  newly_emerging_weaknesses: WeaknessEvolutionItem[]
  register_progress: EvolutionTrendPoint[]
  naturalness_progress: EvolutionTrendPoint[]
  free_writing_progress: EvolutionTrendPoint[]
  milestone_events: Array<{
    title: string
    description: string
    achieved_at: string
    icon: string
  }>
  ai_narrative_story?: string | null
}


