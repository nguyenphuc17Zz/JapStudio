"use client";

import { apiClient } from "@/services/api-client";

export type InterpretSubMode = "interpret_word" | "interpret_sentence" | "interpret_situation" | "mixed";
export type InterpretRelation = "casual_friend" | "business_polite";
export type InterpretScaffold = "none" | "keyword_hint" | "sentence_starter";

export interface InterpretExercise {
  id: string;
  exercise_type: string;
  title: string;
  objective: string;
  scenario: string | null;
  instructions: string;
  difficulty: string;
  created_at: string;
  extra_metadata?: Record<string, any>;
  subMode: string;
  promptVi: string;
  expectedJaKeywords: string[];
  referenceJa: string | null;
  situationVi: string | null;
  topic: string | null;
  relation: InterpretRelation;
  scaffold: InterpretScaffold;
  blind: boolean;
  timerMs: number;
  generationSource?: "ai" | "smart_cache_pool" | "template_fallback";
  isFallback?: boolean;
  fallbackReason?: string;
}

export interface FidelityItem {
  idea_vi: string;
  hit: boolean;
  evidence: string;
}

export interface InterpretResult {
  exerciseId: string;
  success: boolean;
  score: number;
  feedback: string;
  transcript: string;
  assessment: any;
  reactionLatencyMs: number | null;
  timerMs: number;
  timedOut: boolean;
  keywordsHit: string[];
  vietglishFlags: string[];
  fidelityMap: FidelityItem[];
  isPerfect: boolean;
  subMode: string;
  referenceJa?: string | null;
}

export interface GenerateOpts {
  subMode: InterpretSubMode;
  relation?: InterpretRelation;
  scaffold?: InterpretScaffold;
  topic?: string;
  timerMs?: number;
  difficulty?: string;
}

export const SUB_MODE_META: Record<string, { timerMs: number; label: string; ja: string }> = {
  interpret_word: { timerMs: 8000, label: "Từ/cụm", ja: "単語" },
  interpret_sentence: { timerMs: 20000, label: "Dịch câu", ja: "文" },
  interpret_situation: { timerMs: 30000, label: "Tình huống", ja: "通訳" },
};

export function resolveSubMode(subMode: InterpretSubMode): "interpret_word" | "interpret_sentence" | "interpret_situation" {
  if (subMode === "mixed") {
    const r = Math.random();
    return r < 0.4 ? "interpret_word" : r < 0.7 ? "interpret_sentence" : "interpret_situation";
  }
  return subMode;
}

export async function generateExercise(opts: GenerateOpts): Promise<InterpretExercise> {
  const effMode = resolveSubMode(opts.subMode);
  const params = new URLSearchParams();
  params.set("sub_mode", effMode);
  params.set("relation", opts.relation || "casual_friend");
  params.set("scaffold", opts.scaffold || "keyword_hint");
  if (opts.topic) params.set("topic", opts.topic);
  if (opts.timerMs !== undefined) params.set("timer_limit_ms", String(opts.timerMs));
  if (opts.difficulty) params.set("difficulty", opts.difficulty);
  params.set("nonce", `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const data = (await apiClient.post(`/interpret/exercises/generate?${params.toString()}`)) as any;
  const ic = data.extra_metadata?.interpret_config || {};
  return {
    ...data,
    subMode: ic.sub_mode || data.exercise_type,
    promptVi: ic.prompt_vi || data.scenario || "",
    expectedJaKeywords: ic.expected_ja_keywords || [],
    referenceJa: ic.reference_ja || null,
    situationVi: ic.situation_vi || null,
    topic: ic.topic || null,
    relation: ic.relation || opts.relation || "casual_friend",
    scaffold: ic.scaffold || opts.scaffold || "keyword_hint",
    blind: !!ic.blind,
    timerMs: ic.timer_limit_ms ?? opts.timerMs ?? SUB_MODE_META[effMode].timerMs,
    generationSource: ic.generation_source || data.extra_metadata?.generation_source || "ai",
    isFallback: !!(ic.is_fallback ?? data.extra_metadata?.is_fallback),
    fallbackReason: ic.fallback_reason || data.extra_metadata?.fallback_reason,
  };
}

export async function submitAttempt(
  exerciseId: string,
  payload: {
    user_transcript: string;
    reaction_latency_ms: number | null;
    timer_ms: number;
    timed_out: boolean;
    late_response?: boolean;
    speech_confidence?: number | null;
    expected_keywords?: string[];
    blind?: boolean;
    independence?: string;
  }
): Promise<any> {
  const interpret_metrics = {
    reaction_latency_ms: payload.reaction_latency_ms,
    timer_limit_ms: payload.timer_ms,
    timed_out: payload.timed_out,
    late_response: payload.late_response || false,
    speech_confidence: payload.speech_confidence,
    independence: payload.independence || "independent",
    expected_keywords: payload.expected_keywords || [],
    blind: payload.blind || false,
  };
  try {
    return await apiClient.post(`/interpret/exercises/${exerciseId}/submit`, {
      user_transcript: payload.user_transcript,
      reaction_latency_ms: payload.reaction_latency_ms,
      timer_limit_ms: payload.timer_ms,
      timed_out: payload.timed_out,
      late_response: payload.late_response || false,
      speech_confidence: payload.speech_confidence,
      expected_keywords: payload.expected_keywords || [],
      blind: payload.blind || false,
      interpret_metrics,
    });
  } catch {
    return await apiClient.post(`/learning/exercises/${exerciseId}/submit`, {
      user_transcript: payload.user_transcript,
      response_speed_ms: payload.reaction_latency_ms,
      reaction_latency_ms: payload.reaction_latency_ms,
      timer_limit_ms: payload.timer_ms,
      timed_out: payload.timed_out,
      late_response: payload.late_response || false,
      speech_confidence: payload.speech_confidence,
      interpret_metrics,
    });
  }
}

export async function getTopics(): Promise<any> {
  return apiClient.get("/interpret/topics");
}

export async function getProgress(period: string = "30d"): Promise<any> {
  return apiClient.get(`/interpret/progress?period=${period}`);
}
