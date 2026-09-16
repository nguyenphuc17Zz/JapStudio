"use client";

import { apiClient } from "@/services/api-client";

export type BuilderSubMode = "sentence_assemble" | "sentence_expand" | "sentence_repair" | "mixed";
export type BuilderSkill = "te_chain" | "relative_clause" | "conditional" | "nominalization" | "contraction";
export type BuilderRelation = "casual_friend" | "business_polite";
export type BuilderScaffold = "none" | "keyword_hint" | "sentence_starter" | "structured_options";
export type BuilderControlLevel = "controlled" | "semi_controlled" | "free";

export interface BuilderSuggestedVocab {
  term: string;
  reading?: string;
  meaningVi: string;
}

export interface BuilderConnectorItem {
  term: string;
  meaningVi: string;
  kind?: string;
}

export interface BuilderHintTier {
  tier: 1 | 2 | 3 | 4;
  title: string;
  content: string;
}

export interface BuilderExercise {
  id: string;
  exercise_type: string;
  title: string;
  objective: string;
  scenario: string | null;
  instructions: string;
  difficulty: string;
  scaffold_hint: string | null;
  created_at: string;
  extra_metadata?: Record<string, any>;
  subMode: string;
  focusSkill: BuilderSkill;
  relation: BuilderRelation;
  scaffold: BuilderScaffold;
  controlLevel: BuilderControlLevel;
  blind: boolean;
  timerMs: number;
  keywords: string[];
  starter: string | null;
  sourceSentence: string | null;
  promptVi: string | null;
  situationVi: string | null;
  template: string | null;
  suggestedVocabulary: BuilderSuggestedVocab[];
  connectorItems: BuilderConnectorItem[];
  hints: BuilderHintTier[];
  expandRequirement: string | null;
  connectors: string[];
  canonical?: string;
  canonicalVi?: string;
  generationSource?: "ai" | "smart_cache_pool" | "template_fallback";
  isFallback?: boolean;
  fallbackReason?: string;
}

export interface ClauseSpan {
  text: string;
  kind: string;
  ok: boolean;
}

export interface BuilderResult {
  exerciseId: string;
  success: boolean;
  score: number;
  feedback: string;
  transcript: string;
  assessment: any;
  reactionLatencyMs: number | null;
  timerMs: number;
  timedOut: boolean;
  keywordsUsed: string[];
  keywordsMissing: string[];
  clauses: ClauseSpan[];
  isPerfect: boolean;
  focusSkill: BuilderSkill;
  subMode: string;
  canonical?: string;
  canonicalVi?: string;
}

export interface GenerateOpts {
  subMode: BuilderSubMode;
  focusSkill?: BuilderSkill;
  relation?: BuilderRelation;
  scaffold?: BuilderScaffold;
  timerMs?: number;
  difficulty?: string;
  force_ai?: boolean;
}

export const BUILDER_SKILLS: Array<{ id: BuilderSkill; ja: string; label: string; desc: string }> = [
  { id: "te_chain", ja: "て形接続", label: "Nối て", desc: "Vて + V, くて, で" },
  { id: "relative_clause", ja: "関係節", label: "MĐ quan hệ", desc: "昨日買った本 pattern" },
  { id: "conditional", ja: "条件", label: "Điều kiện", desc: "たら・ば・なら" },
  { id: "nominalization", ja: "名詞化", label: "Danh từ hóa", desc: "わけ・はず・ので" },
  { id: "contraction", ja: "縮約", label: "Nói tắt", desc: "てる・じゃん・よ" },
];

export const SCAFFOLDS: Array<{ id: BuilderScaffold; label: string; ja: string }> = [
  { id: "keyword_hint", label: "Từ khóa", ja: "キーワード" },
  { id: "sentence_starter", label: "Gợi ý mở đầu", ja: "書き出し" },
  { id: "structured_options", label: "Khung sườn", ja: "構成" },
  { id: "none", label: "Blind", ja: "自力" },
];

export function resolveSubMode(subMode: BuilderSubMode): "sentence_assemble" | "sentence_expand" | "sentence_repair" {
  if (subMode === "mixed") {
    const r = Math.random();
    return r < 0.4 ? "sentence_assemble" : r < 0.7 ? "sentence_expand" : "sentence_repair";
  }
  return subMode;
}

export async function generateExercise(opts: GenerateOpts): Promise<BuilderExercise> {
  const effMode = resolveSubMode(opts.subMode);
  const params = new URLSearchParams();
  params.set("sub_mode", effMode);
  if (opts.focusSkill) params.set("focus_skill", opts.focusSkill);
  params.set("relation", opts.relation || "casual_friend");
  params.set("scaffold", opts.scaffold || "keyword_hint");
  if (opts.timerMs !== undefined) params.set("timer_limit_ms", String(opts.timerMs));
  if (opts.difficulty) params.set("difficulty", opts.difficulty);
  if (opts.force_ai) params.set("force_ai", "true");
  params.set("nonce", `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const data = (await apiClient.post(`/builder/exercises/generate?${params.toString()}`)) as any;
  const bc = data.extra_metadata?.builder_config || {};
  const scaffold = bc.scaffold || opts.scaffold || "keyword_hint";
  const controlLevel: BuilderControlLevel =
    bc.control_level ||
    (scaffold === "structured_options" || scaffold === "sentence_starter"
      ? "controlled"
      : scaffold === "keyword_hint"
      ? "semi_controlled"
      : "free");

  return {
    ...data,
    subMode: bc.sub_mode || data.exercise_type,
    focusSkill: bc.focus_skill || opts.focusSkill || "te_chain",
    relation: bc.relation || opts.relation || "casual_friend",
    scaffold,
    controlLevel,
    blind: !!bc.blind,
    timerMs: bc.timer_limit_ms ?? opts.timerMs ?? 60000,
    keywords: bc.keywords || [],
    starter: bc.starter || data.scaffold_hint || null,
    sourceSentence: bc.source_sentence || null,
    promptVi: bc.prompt_vi || bc.situation_vi || data.scenario || null,
    situationVi: bc.situation_vi || null,
    template: bc.template || null,
    suggestedVocabulary: (bc.suggested_vocabulary || []).map((v: any) => ({
      term: v.term || "",
      reading: v.reading || "",
      meaningVi: v.meaning_vi || v.meaningVi || "",
    })),
    connectorItems: (bc.connector_items || []).map((c: any) => ({
      term: c.term || "",
      meaningVi: c.meaning_vi || c.meaningVi || "",
      kind: c.kind || "connector",
    })),
    hints: (bc.hints || []).map((h: any) => ({
      tier: h.tier,
      title: h.title,
      content: h.content,
    })),
    expandRequirement: bc.expand_requirement || null,
    connectors: bc.connectors || [],
    canonical: bc.canonical || data.acceptable_variants?.[0] || "",
    canonicalVi: bc.canonical_vi || "",
    generationSource: bc.generation_source || data.extra_metadata?.generation_source || "ai",
    isFallback: !!(bc.is_fallback ?? data.extra_metadata?.is_fallback),
    fallbackReason: bc.fallback_reason || data.extra_metadata?.fallback_reason,
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
    focus_skill?: string;
    keywords?: string[];
    scaffold_level?: string;
    blind?: boolean;
    independence?: string;
  }
): Promise<any> {
  const builder_metrics = {
    reaction_latency_ms: payload.reaction_latency_ms,
    timer_limit_ms: payload.timer_ms,
    timed_out: payload.timed_out,
    late_response: payload.late_response || false,
    speech_confidence: payload.speech_confidence,
    independence: payload.independence || "independent",
    focus_skill: payload.focus_skill,
    keywords: payload.keywords || [],
    scaffold_level: payload.scaffold_level,
    blind: payload.blind || false,
  };
  try {
    return await apiClient.post(`/builder/exercises/${exerciseId}/submit`, {
      user_transcript: payload.user_transcript,
      reaction_latency_ms: payload.reaction_latency_ms,
      timer_limit_ms: payload.timer_ms,
      timed_out: payload.timed_out,
      late_response: payload.late_response || false,
      speech_confidence: payload.speech_confidence,
      focus_skill: payload.focus_skill,
      keywords: payload.keywords || [],
      scaffold_level: payload.scaffold_level,
      blind: payload.blind || false,
      builder_metrics,
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
      builder_metrics,
    });
  }
}

export async function getSkills(): Promise<any> {
  return apiClient.get("/builder/skills");
}

export async function getProgress(period: string = "30d"): Promise<any> {
  return apiClient.get(`/builder/progress?period=${period}`);
}
