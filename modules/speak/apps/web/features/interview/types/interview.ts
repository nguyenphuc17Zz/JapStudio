export type InterviewerPersonality = "friendly" | "strict" | "analytical";

export interface IndustryTemplate {
  id: string;
  label_vi: string;
  label_ja: string;
  description: string;
  suggested_roles: string[];
  icon_name: string;
}

export interface PREPStarters {
  point: string;
  reason: string;
  example: string;
  summary: string;
}

export interface InterviewQuestion {
  id: string;
  question_ja: string;
  question_vi: string;
  reading_hiragana?: string;
  romaji?: string;
  interviewer_name: string;
  interviewer_title: string;
  interviewer_style: InterviewerPersonality;
  intent_explanation_vi: string;
  prep_starters: PREPStarters;
  key_vocab_hints: Array<{ ja: string; vi: string }>;
  turn_index: number;
  total_turns: number;
  source: string;
}

export interface PREPScoreBreakdown {
  point_score: number;
  reason_score: number;
  example_score: number;
  summary_score: number;
  feedback_vi: string;
}

export interface KeigoAnalysisItem {
  original_phrase: string;
  corrected_phrase: string;
  keigo_type: string;
  explanation_vi: string;
}

export interface InterviewCoachEvaluation {
  overall_score: number;
  prep_score: number;
  keigo_score: number;
  prep_breakdown: PREPScoreBreakdown;
  keigo_fixes: KeigoAnalysisItem[];
  coach_feedback_vi: string;
  strengths_vi: string[];
  areas_to_improve_vi: string[];
  native_model_answer: string;
  native_model_reading?: string;
  native_model_vi: string;
  recommended_vocab: Array<{ ja: string; vi: string }>;
  suggested_followup_question_hint?: string;
}

export interface InterviewTurnRecord {
  turn_index: number;
  question: InterviewQuestion;
  candidate_answer: string;
  evaluation: InterviewCoachEvaluation;
}

export interface FinalReportResponse {
  decision: string;
  decision_badge: "naitei" | "passed" | "practice";
  overall_score: number;
  average_prep_score: number;
  average_keigo_score: number;
  summary_feedback_vi: string;
  key_recommendations_vi: string[];
  interviewer_comment_vi: string;
}
