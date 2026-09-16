"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "@/lib/toast";
import { soundFX } from "@/lib/sound-fx";
import { survivalApi } from "../services/survival-api";
import type {
  CircumlocutionTask,
  SurvivalDifficulty,
  SurvivalEvaluationResult,
  SurvivalMode,
  SurvivalScenarioTask,
} from "../types/survival";

export function useSurvivalSession() {
  const [mode, setMode] = useState<SurvivalMode>("circumlocution");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<SurvivalDifficulty>("easy");

  const [currentCircumTask, setCurrentCircumTask] = useState<CircumlocutionTask | null>(null);
  const [currentScenarioTask, setCurrentScenarioTask] = useState<SurvivalScenarioTask | null>(null);

  const [isLoadingTask, setIsLoadingTask] = useState<boolean>(true);
  const [isRegeneratingAI, setIsRegeneratingAI] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [lastEvaluation, setLastEvaluation] = useState<SurvivalEvaluationResult | null>(null);

  const [currentHintTier, setCurrentHintTier] = useState<number>(0);
  const [autoStartMic, setAutoStartMic] = useState<boolean>(false);

  const [prepCountdown, setPrepCountdown] = useState<number>(5);
  const [isCountingDown, setIsCountingDown] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [streak, setStreak] = useState<number>(0);
  const [completedTasksCount, setCompletedTasksCount] = useState<number>(0);
  const [successfulTasksCount, setSuccessfulTasksCount] = useState<number>(0);
  const [totalXp, setTotalXp] = useState<number>(0);
  const [isSessionCompleted, setIsSessionCompleted] = useState<boolean>(false);

  // Load Task
  const loadTask = useCallback(
    async (forceAi = true) => {
      setIsLoadingTask(true);
      setLastEvaluation(null);
      setCurrentHintTier(0);

      try {
        const task = await survivalApi.getTask({
          mode,
          topic: selectedTopic,
          difficulty,
          forceAi: true,
        });

        if (mode === "circumlocution") {
          setCurrentCircumTask(task as CircumlocutionTask);
          setCurrentScenarioTask(null);
        } else {
          setCurrentScenarioTask(task as SurvivalScenarioTask);
          setCurrentCircumTask(null);
        }

        if (forceAi) {
          toast.success("✨ Bài tập thực tế mới đã sẵn sàng!");
        }

        // Start prep countdown
        setPrepCountdown(task.time_limit_seconds || 5);
        setIsCountingDown(true);
      } catch (err: any) {
        toast.error(err?.message || "Không thể tải bài tập từ AI");
      } finally {
        setIsLoadingTask(false);
        setIsRegeneratingAI(false);
      }
    },
    [mode, selectedTopic, difficulty]
  );

  // Countdown effect
  useEffect(() => {
    if (!isCountingDown) return;
    if (prepCountdown <= 0) {
      setIsCountingDown(false);
      return;
    }
    timerRef.current = setTimeout(() => {
      setPrepCountdown((prev) => prev - 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isCountingDown, prepCountdown]);

  // Initial load or mode/topic change
  useEffect(() => {
    loadTask(false);
  }, [loadTask]);

  // Submit attempt
  const submitAttempt = useCallback(
    async (spokenText: string, ttfwMs?: number) => {
      if (!spokenText.trim()) {
        toast.error("Chưa phát hiện giọng nói. Vui lòng bật mic và nói vào bài tập.");
        return;
      }

      setIsEvaluating(true);
      setIsCountingDown(false);

      const taskId = mode === "circumlocution" ? currentCircumTask?.id : currentScenarioTask?.id;
      if (!taskId) return;

      try {
        const result = await survivalApi.evaluateAttempt({
          mode,
          taskId,
          spokenText,
          ttfwMs,
          hintTierUsed: currentHintTier,
          relationship: mode === "scenarios" ? currentScenarioTask?.relationship : undefined,
        });

        setLastEvaluation(result);
        setCompletedTasksCount((prev) => prev + 1);

        if (result.is_successful) {
          soundFX.playSuccess();
          setStreak((prev) => prev + 1);
          setSuccessfulTasksCount((prev) => prev + 1);
          setTotalXp((prev) => prev + result.xp_earned);
        } else {
          soundFX.playError();
          setStreak(0);
        }

        // Complete session after 10 tasks
        if (completedTasksCount + 1 >= 10) {
          setIsSessionCompleted(true);
        }
      } catch (err: any) {
        toast.error(err?.message || "Lỗi đánh giá phát ngôn, vui lòng thử lại");
      } finally {
        setIsEvaluating(false);
      }
    },
    [mode, currentCircumTask, currentScenarioTask, currentHintTier, completedTasksCount]
  );

  const nextTask = useCallback(() => {
    loadTask(true);
  }, [loadTask]);

  const retryCurrentTask = useCallback(() => {
    setLastEvaluation(null);
    setPrepCountdown(5);
    setIsCountingDown(true);
  }, []);

  const regenerateWithAI = useCallback(() => {
    setIsRegeneratingAI(true);
    loadTask(true);
  }, [loadTask]);

  const resetSession = useCallback(() => {
    setCompletedTasksCount(0);
    setSuccessfulTasksCount(0);
    setStreak(0);
    setTotalXp(0);
    setIsSessionCompleted(false);
    loadTask(true);
  }, [loadTask]);

  return {
    mode,
    setMode,
    selectedTopic,
    setSelectedTopic,
    difficulty,
    setDifficulty,
    currentCircumTask,
    currentScenarioTask,
    isLoadingTask,
    isRegeneratingAI,
    isEvaluating,
    lastEvaluation,
    currentHintTier,
    setCurrentHintTier,
    autoStartMic,
    setAutoStartMic,
    prepCountdown,
    isCountingDown,
    streak,
    completedTasksCount,
    successfulTasksCount,
    totalXp,
    isSessionCompleted,
    setIsSessionCompleted,
    loadTask,
    submitAttempt,
    nextTask,
    retryCurrentTask,
    regenerateWithAI,
    resetSession,
  };
}
