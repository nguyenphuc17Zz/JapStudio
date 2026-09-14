"use client";

import { apiClient } from "@/services/api-client";

export type WindowProfile = "infinite" | "relaxed" | "normal" | "fast" | "reflex";
export type AizuchiRelation = "casual_friend" | "business_polite";
export type AizuchiSubMode = "aizuchi_reaction" | "warikomi_interrupt" | "mixed";

export interface NPCTurn {
  text: string;
  text_vi?: string;
  pause_window_ms: number;
  expected_types: string[];
  sample_responses?: string[];
}

export interface AizuchiExercise {
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
  relation: AizuchiRelation;
  windowMs: number;
  windowProfile: WindowProfile;
  speed: number;
  npcTurns: NPCTurn[];
  expectedTypes: string[];
  sampleResponses?: string[];
  generationSource?: "ai" | "smart_cache_pool" | "template_fallback";
  isFallback?: boolean;
  fallbackReason?: string;
}

export interface AizuchiResult {
  exerciseId: string;
  turnIndex: number;
  success: boolean;
  score: number;
  feedback: string;
  transcript: string;
  assessment: any;
  reactionLatencyMs: number | null;
  windowMs: number;
  timedOut: boolean;
  overlapRude: boolean;
  bcType: string | null;
  isPerfect: boolean;
  sampleResponses?: string[];
}

export interface GenerateOpts {
  subMode: AizuchiSubMode;
  relation?: AizuchiRelation;
  windowProfile?: WindowProfile;
  speed?: number;
  windowMs?: number;
  difficulty?: string;
  numTurns?: number;
}

export const WINDOW_LEVELS: Array<{ id: WindowProfile; ms: number; label: string; ja: string }> = [
  { id: "infinite", ms: 0, label: "Tự do", ja: "無制限" },
  { id: "relaxed", ms: 900, label: "Chậm", ja: "ゆっくり" },
  { id: "normal", ms: 600, label: "Tự nhiên", ja: "普通" },
  { id: "fast", ms: 450, label: "Nhanh", ja: "速い" },
  { id: "reflex", ms: 350, label: "Bản xứ", ja: "瞬発" },
];

export function resolveSubMode(subMode: AizuchiSubMode): "aizuchi_reaction" | "warikomi_interrupt" {
  if (subMode === "mixed") return Math.random() < 0.7 ? "aizuchi_reaction" : "warikomi_interrupt";
  return subMode;
}

export async function generateExercise(opts: GenerateOpts): Promise<AizuchiExercise> {
  const effMode = resolveSubMode(opts.subMode);
  const params = new URLSearchParams();
  params.set("sub_mode", effMode);
  params.set("relation", opts.relation || "casual_friend");
  params.set("window_profile", opts.windowProfile || "normal");
  params.set("speed", String(opts.speed ?? 1.0));
  params.set("num_turns", String(opts.numTurns ?? 3));
  if (opts.windowMs !== undefined) params.set("window_ms", String(opts.windowMs));
  if (opts.difficulty) params.set("difficulty", opts.difficulty);
  params.set("nonce", `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const data = (await apiClient.post(`/aizuchi/exercises/generate?${params.toString()}`)) as any;
  const ac = data.extra_metadata?.aizuchi_config || {};
  return {
    ...data,
    subMode: ac.sub_mode || data.exercise_type,
    relation: ac.relation || opts.relation || "casual_friend",
    windowMs: ac.window_ms ?? opts.windowMs ?? 600,
    windowProfile: ac.window_profile || opts.windowProfile || "normal",
    speed: ac.speed ?? opts.speed ?? 1.0,
    npcTurns: ac.npc_turns || [],
    expectedTypes: ac.expected_types || ["continuer"],
    sampleResponses: ac.sample_responses || ac.npc_turns?.[0]?.sample_responses || [],
    generationSource: ac.generation_source || data.extra_metadata?.generation_source || "ai",
    isFallback: !!(ac.is_fallback ?? data.extra_metadata?.is_fallback),
    fallbackReason: ac.fallback_reason || data.extra_metadata?.fallback_reason,
  };
}

export async function submitAttempt(
  exerciseId: string,
  payload: {
    user_transcript: string;
    reaction_latency_ms: number | null;
    window_ms: number;
    timed_out: boolean;
    late_response?: boolean;
    overlap_rude?: boolean;
    bc_type?: string | null;
    speech_confidence?: number | null;
  }
): Promise<any> {
  try {
    return await apiClient.post(`/aizuchi/exercises/${exerciseId}/submit`, {
      user_transcript: payload.user_transcript,
      reaction_latency_ms: payload.reaction_latency_ms,
      window_ms: payload.window_ms,
      timer_limit_ms: payload.window_ms,
      timed_out: payload.timed_out,
      late_response: payload.late_response || false,
      overlap_rude: payload.overlap_rude || false,
      bc_type: payload.bc_type,
      speech_confidence: payload.speech_confidence,
      aizuchi_metrics: {
        reaction_latency_ms: payload.reaction_latency_ms,
        window_ms: payload.window_ms,
        timer_limit_ms: payload.window_ms,
        timed_out: payload.timed_out,
        late_response: payload.late_response || false,
        overlap_rude: payload.overlap_rude || false,
        bc_type: payload.bc_type,
        speech_confidence: payload.speech_confidence,
      },
    });
  } catch {
    return await apiClient.post(`/learning/exercises/${exerciseId}/submit`, {
      user_transcript: payload.user_transcript,
      response_speed_ms: payload.reaction_latency_ms,
      reaction_latency_ms: payload.reaction_latency_ms,
      timer_limit_ms: payload.window_ms,
      timed_out: payload.timed_out,
      late_response: payload.late_response || false,
      speech_confidence: payload.speech_confidence,
      aizuchi_metrics: {
        reaction_latency_ms: payload.reaction_latency_ms,
        window_ms: payload.window_ms,
        timer_limit_ms: payload.window_ms,
        timed_out: payload.timed_out,
        late_response: payload.late_response || false,
        overlap_rude: payload.overlap_rude || false,
        bc_type: payload.bc_type,
        speech_confidence: payload.speech_confidence,
      },
    });
  }
}

export async function getWindowProfiles(): Promise<any> {
  return apiClient.get("/aizuchi/pressure-profiles");
}

export async function getProgress(period: string = "30d"): Promise<any> {
  return apiClient.get(`/aizuchi/progress?period=${period}`);
}
