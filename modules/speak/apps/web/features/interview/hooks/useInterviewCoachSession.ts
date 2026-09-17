"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { interviewApi } from "../services/interview-api";
import {
  speakJapaneseText,
  stopWebSpeech,
} from "@/features/speaking/services/web-speech";
import { soundFX } from "@/lib/sound-fx";
import { toast } from "@/lib/toast";
import type {
  FinalReportResponse,
  InterviewCoachEvaluation,
  InterviewerPersonality,
  InterviewQuestion,
  InterviewTurnRecord,
} from "../types/interview";

interface UseInterviewCoachSessionProps {
  initialRole?: string;
  initialPersonality?: InterviewerPersonality;
}

export function useInterviewCoachSession({
  initialRole = "IT / Kỹ sư phần mềm",
  initialPersonality = "friendly",
}: UseInterviewCoachSessionProps = {}) {
  const [role, setRole] = useState(initialRole);
  const [interviewerStyle, setInterviewerStyle] =
    useState<InterviewerPersonality>(initialPersonality);
  const [companyContext, setCompanyContext] = useState("");

  const [turnIndex, setTurnIndex] = useState(1);
  const [currentQuestion, setCurrentQuestion] =
    useState<InterviewQuestion | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastEvaluation, setLastEvaluation] =
    useState<InterviewCoachEvaluation | null>(null);
  const [turnHistory, setTurnHistory] = useState<InterviewTurnRecord[]>([]);

  const [isSessionCompleted, setIsSessionCompleted] = useState(false);
  const [isFinalizingReport, setIsFinalizingReport] = useState(false);
  const [finalReport, setFinalReport] = useState<FinalReportResponse | null>(
    null
  );
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  // Play question audio automatically
  const playQuestionAudio = useCallback((questionText: string) => {
    stopWebSpeech();
    setIsPlayingVoice(true);
    speakJapaneseText(questionText, {
      onStart: () => setIsPlayingVoice(true),
      onEnd: () => setIsPlayingVoice(false),
      onError: () => setIsPlayingVoice(false),
    });
  }, []);

  // Fetch or generate question
  const fetchQuestion = useCallback(
    async (
      targetTurn: number,
      targetRole: string,
      targetStyle: InterviewerPersonality,
      history: InterviewTurnRecord[]
    ) => {
      setIsLoadingQuestion(true);
      setLastEvaluation(null);
      try {
        const prevTurnsData = history.map((h) => ({
          question_ja: h.question.question_ja,
          candidate_answer: h.candidate_answer,
        }));

        const question = await interviewApi.generateQuestion({
          role: targetRole,
          company_context: companyContext || undefined,
          interviewer_style: targetStyle,
          turn_index: targetTurn,
          previous_turns: prevTurnsData,
        });

        setCurrentQuestion(question);
        setTurnIndex(targetTurn);
        playQuestionAudio(question.question_ja);
      } catch (err: any) {
        toast.error("Không thể tải câu hỏi phỏng vấn. Vui lòng thử lại.");
      } finally {
        setIsLoadingQuestion(false);
      }
    },
    [companyContext, playQuestionAudio]
  );

  // Start new interview session
  const startSession = useCallback(
    async (
      selectedRole: string,
      selectedStyle: InterviewerPersonality,
      context?: string
    ) => {
      setRole(selectedRole);
      setInterviewerStyle(selectedStyle);
      if (context !== undefined) setCompanyContext(context);
      setTurnIndex(1);
      setTurnHistory([]);
      setLastEvaluation(null);
      setIsSessionCompleted(false);
      setFinalReport(null);

      soundFX.playKatana();
      await fetchQuestion(1, selectedRole, selectedStyle, []);
    },
    [fetchQuestion]
  );

  // Submit candidate's spoken or typed answer
  const submitAnswer = useCallback(
    async (userAnswer: string) => {
      if (!currentQuestion || !userAnswer.trim()) return;

      setIsEvaluating(true);
      stopWebSpeech();
      setIsPlayingVoice(false);
      soundFX.playSuccess();

      try {
        const evaluation = await interviewApi.evaluateAnswer({
          role,
          question_ja: currentQuestion.question_ja,
          user_answer: userAnswer,
          turn_index: turnIndex,
          interviewer_style: interviewerStyle,
        });

        setLastEvaluation(evaluation);

        const newRecord: InterviewTurnRecord = {
          turn_index: turnIndex,
          question: currentQuestion,
          candidate_answer: userAnswer,
          evaluation,
        };

        setTurnHistory((prev) => [...prev, newRecord]);
      } catch (err: any) {
        toast.error("Lỗi khi đánh giá câu trả lời. Vui lòng thử lại.");
      } finally {
        setIsEvaluating(false);
      }
    },
    [currentQuestion, role, turnIndex, interviewerStyle]
  );

  // Complete session & generate report
  const completeSession = useCallback(
    async (finalHistory?: InterviewTurnRecord[]) => {
      setIsFinalizingReport(true);
      setIsSessionCompleted(true);
      stopWebSpeech();
      setIsPlayingVoice(false);

      const historyToUse = finalHistory || turnHistory;
      try {
        const turnsData = historyToUse.map((h) => ({
          question_ja: h.question.question_ja,
          candidate_answer: h.candidate_answer,
          evaluation: {
            overall_score: h.evaluation.overall_score,
            prep_score: h.evaluation.prep_score,
            keigo_score: h.evaluation.keigo_score,
          },
        }));

        const report = await interviewApi.finalizeReport({
          role,
          turns_history: turnsData,
        });

        setFinalReport(report);
        if (report.decision_badge === "naitei") {
          soundFX.playVictory();
        } else {
          soundFX.playSuccess();
        }
      } catch (err: any) {
        toast.error("Lỗi khi tổng hợp báo cáo kết quả.");
      } finally {
        setIsFinalizingReport(false);
      }
    },
    [role, turnHistory]
  );

  // Proceed to next question or complete
  const nextQuestion = useCallback(async () => {
    if (turnIndex >= 5) {
      await completeSession();
      return;
    }

    const nextTurn = turnIndex + 1;
    await fetchQuestion(nextTurn, role, interviewerStyle, turnHistory);
  }, [turnIndex, role, interviewerStyle, turnHistory, fetchQuestion, completeSession]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      stopWebSpeech();
    };
  }, []);

  return {
    role,
    setRole,
    interviewerStyle,
    setInterviewerStyle,
    companyContext,
    setCompanyContext,
    turnIndex,
    currentQuestion,
    isLoadingQuestion,
    isEvaluating,
    lastEvaluation,
    turnHistory,
    isSessionCompleted,
    setIsSessionCompleted,
    isFinalizingReport,
    finalReport,
    isPlayingVoice,
    startSession,
    submitAnswer,
    nextQuestion,
    completeSession,
    playQuestionVoice: () =>
      currentQuestion && playQuestionAudio(currentQuestion.question_ja),
    stopVoice: () => {
      stopWebSpeech();
      setIsPlayingVoice(false);
    },
  };
}
