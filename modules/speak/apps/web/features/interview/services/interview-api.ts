"use client";

import { apiClient } from "@/services/api-client";
import type {
  FinalReportResponse,
  IndustryTemplate,
  InterviewCoachEvaluation,
  InterviewerPersonality,
  InterviewQuestion,
} from "../types/interview";

export interface GetTemplatesResponse {
  templates: IndustryTemplate[];
  interviewers: Record<
    string,
    {
      name: string;
      title: string;
      tone_vi: string;
    }
  >;
}

export interface GenerateQuestionParams {
  role: string;
  company_context?: string;
  interviewer_style: InterviewerPersonality;
  turn_index: number;
  previous_turns?: Array<{
    question_ja: string;
    candidate_answer: string;
  }>;
}

export interface EvaluateAnswerParams {
  role: string;
  question_ja: string;
  user_answer: string;
  turn_index: number;
  interviewer_style: InterviewerPersonality;
}

export interface FinalizeReportParams {
  role: string;
  turns_history: Array<{
    question_ja: string;
    candidate_answer: string;
    evaluation: {
      overall_score: number;
      prep_score: number;
      keigo_score: number;
    };
  }>;
}

export const interviewApi = {
  async getTemplates(): Promise<GetTemplatesResponse> {
    return apiClient.get<GetTemplatesResponse>("/interview/templates");
  },

  async generateQuestion(
    params: GenerateQuestionParams
  ): Promise<InterviewQuestion> {
    return apiClient.post<InterviewQuestion>("/interview/question", params);
  },

  async evaluateAnswer(
    params: EvaluateAnswerParams
  ): Promise<InterviewCoachEvaluation> {
    return apiClient.post<InterviewCoachEvaluation>("/interview/coach", params);
  },

  async finalizeReport(
    params: FinalizeReportParams
  ): Promise<FinalReportResponse> {
    return apiClient.post<FinalReportResponse>("/interview/report", params);
  },
};
