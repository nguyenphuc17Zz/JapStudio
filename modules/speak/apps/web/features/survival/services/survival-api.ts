"use client";

import { apiClient } from "@/services/api-client";
import type {
  CircumlocutionTask,
  SOSHintResponse,
  SocialRelationship,
  SurvivalDifficulty,
  SurvivalEvaluationResult,
  SurvivalMode,
  SurvivalScenarioTask,
} from "../types/survival";

export interface GetSurvivalTaskParams {
  mode: SurvivalMode;
  topic?: string;
  difficulty?: SurvivalDifficulty;
  forceAi?: boolean;
}

export interface EvaluateSurvivalParams {
  mode: SurvivalMode;
  taskId: string;
  spokenText: string;
  audioDurationMs?: number;
  ttfwMs?: number;
  hintTierUsed?: number;
  relationship?: SocialRelationship;
}

export interface SOSHintParams {
  lastAiMessage: string;
  userDraftText?: string;
  relationship?: SocialRelationship;
}

export interface SurvivalTopic {
  id: string;
  label_vi: string;
  label_ja: string;
  icon: string;
}

export const survivalApi = {
  async getTopics(): Promise<SurvivalTopic[]> {
    return apiClient.get<SurvivalTopic[]>("/survival/topics");
  },

  async getTask(params: GetSurvivalTaskParams): Promise<CircumlocutionTask | SurvivalScenarioTask> {
    const query = new URLSearchParams({
      mode: params.mode,
      topic: params.topic || "all",
      difficulty: params.difficulty || "easy",
      force_ai: params.forceAi ? "true" : "false",
    });
    return apiClient.get<CircumlocutionTask | SurvivalScenarioTask>(`/survival/task?${query.toString()}`);
  },

  async evaluateAttempt(params: EvaluateSurvivalParams): Promise<SurvivalEvaluationResult> {
    return apiClient.post<SurvivalEvaluationResult>("/survival/evaluate", {
      mode: params.mode,
      task_id: params.taskId,
      spoken_text: params.spokenText,
      audio_duration_ms: params.audioDurationMs,
      ttfw_ms: params.ttfwMs,
      hint_tier_used: params.hintTierUsed || 0,
      relationship: params.relationship,
    });
  },

  async getSosHint(params: SOSHintParams): Promise<SOSHintResponse> {
    return apiClient.post<SOSHintResponse>("/survival/sos-hint", {
      last_ai_message: params.lastAiMessage,
      user_draft_text: params.userDraftText,
      relationship: params.relationship || "polite",
    });
  },
};
