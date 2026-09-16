export type SurvivalMode = "circumlocution" | "scenarios";

export type RepairStrategy =
  | "buying_time"
  | "asking_repetition"
  | "asking_clarification"
  | "self_correction"
  | "simplification";

export type SocialRelationship = "casual" | "polite" | "business";

export type SurvivalDifficulty = "easy" | "medium" | "hard";

export interface SurvivalHintTier {
  tier: number;
  title: string;
  content: string;
  penalty_weight?: number;
}

export interface SurvivalVocabularyItem {
  term: string;
  reading?: string | null;
  romaji?: string | null;
  meaning_vi: string;
  part_of_speech?: string;
}

export interface CircumlocutionTask {
  id: string;
  target_word: string;
  reading_hiragana: string;
  romaji: string;
  vietnamese_meaning: string;
  category: string;
  genus: string;
  differentia: string;
  forbidden_words: string[];
  taboo_lemmas: string[];
  difficulty: SurvivalDifficulty;
  time_limit_seconds: number;
  tier_hints: SurvivalHintTier[];
  sample_explanations: string[];
  suggested_vocabulary: SurvivalVocabularyItem[];
  semantic_anchors: string[];
  source?: "ai" | "bank" | "mock";
}

export interface SurvivalScenarioTask {
  id: string;
  context: string;
  context_title_vi: string;
  relationship: SocialRelationship;
  problem_description_vi: string;
  npc_utterance_ja: string;
  npc_utterance_reading?: string | null;
  recommended_strategy: RepairStrategy;
  suggested_repair_phrases: string[];
  difficulty: SurvivalDifficulty;
  time_limit_seconds: number;
  tier_hints: SurvivalHintTier[];
  suggested_vocabulary: SurvivalVocabularyItem[];
  source?: "ai" | "bank" | "mock";
}

export interface SayItBetterVariants {
  casual: string;
  professional: string;
  idiomatic: string;
}

export interface SurvivalEvaluationResult {
  is_successful: boolean;
  overall_score: number;
  taboo_violated: boolean;
  violated_words: string[];
  listener_guessed_correctly: boolean;
  listener_guessed_word?: string | null;
  listener_confidence: number;
  strategy_identified?: RepairStrategy | null;
  speed_rating: "instant" | "normal" | "slow";
  ttfw_ms?: number | null;
  ai_feedback_vi: string;
  say_it_better?: SayItBetterVariants | null;
  suggested_corrections: string[];
  is_fast_pass: boolean;
  evaluation_source: "fast_pass" | "ai_router" | "mock";
  xp_earned: number;
}

export interface SOSSuggestionItem {
  strategy: RepairStrategy;
  title: string;
  japanese_phrase: string;
  reading_hiragana: string;
  meaning_vi: string;
}

export interface SOSHintResponse {
  suggestions: SOSSuggestionItem[];
}
