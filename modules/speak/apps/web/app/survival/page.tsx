"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  Coffee,
  Briefcase,
  Plane,
  Utensils,
  ShoppingBag,
  Flame,
} from "lucide-react";
import { useSurvivalSession } from "@/features/survival/hooks/useSurvivalSession";
import { SurvivalPromptCard } from "@/features/survival/components/SurvivalPromptCard";
import { SurvivalContextCard } from "@/features/survival/components/SurvivalContextCard";
import { SurvivalFeedbackCard } from "@/features/survival/components/SurvivalFeedbackCard";
import { CombatCapsuleHUD } from "@/features/reflex/components/CombatCapsuleHUD";
import { StudioSpeakingController } from "@/features/reflex/components/StudioSpeakingController";
import { SurvivalSessionSummaryModal } from "@/features/survival/components/SurvivalSessionSummaryModal";
import { useLiveSpeechRecognition } from "@/hooks/use-live-speech-recognition";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import { ExerciseSourceBadge } from "@/components/ui/exercise-source-badge";
import type { SurvivalDifficulty } from "@/features/survival/types/survival";

const TOPIC_CHIPS = [
  { id: "all", label_vi: "Tất cả", icon: Sparkles },
  { id: "kitchen", label_vi: "Gia dụng & Bếp", icon: Coffee },
  { id: "food", label_vi: "Ẩm thực & Quán nhậu", icon: Utensils },
  { id: "workplace", label_vi: "Công sở & Phỏng vấn", icon: Briefcase },
  { id: "transport", label_vi: "Giao thông & Đi lại", icon: Plane },
  { id: "daily", label_vi: "Đời sống", icon: ShoppingBag },
];

export default function SurvivalSpeakingPage() {
  const {
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
    prepCountdown,
    isCountingDown,
    streak,
    completedTasksCount,
    successfulTasksCount,
    totalXp,
    isSessionCompleted,
    setIsSessionCompleted,
    submitAttempt,
    nextTask,
    retryCurrentTask,
    regenerateWithAI,
    resetSession,
  } = useSurvivalSession();

  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useLiveSpeechRecognition("ja-JP");

  const [manualText, setManualText] = useState("");
  const currentLiveTranscript = (transcript + " " + interimTranscript).trim();

  const handleStartRecord = () => {
    if (isLoadingTask || isEvaluating) return;
    resetTranscript();
    startListening();
    soundFX.playTaiko();
  };

  const handleStopRecord = () => {
    stopListening();
  };

  const handleSubmitSpoken = (overrideText?: string) => {
    const textToSubmit = (overrideText || manualText || currentLiveTranscript).trim();
    if (!textToSubmit) return;
    stopListening();
    submitAttempt(textToSubmit);
    resetTranscript();
    setManualText("");
  };

  return (
    <div className="w-full max-w-[1760px] mx-auto h-[calc(100vh-3.5rem)] flex flex-col justify-between px-2 sm:px-4 py-2 gap-2 overflow-hidden select-none animate-in fade-in duration-200">
      {/* 1. Combat Capsule HUD */}
      <CombatCapsuleHUD
        questionNumber={completedTasksCount + 1}
        subModeLabel={mode === "circumlocution" ? "Diễn Đạt Vòng (Taboo)" : "Cứu Nguy Hội Thoại"}
        subModeJa="生還"
        currentStreak={streak}
        duration={0}
        sessionRemainingSec={0}
        sessionElapsedSec={0}
        subtitleMode="japanese"
        setSubtitleMode={() => {}}
        filterTrigger={{
          label: TOPIC_CHIPS.find((c) => c.id === selectedTopic)?.label_vi || "Tất cả",
          onClick: () => {
            const idx = TOPIC_CHIPS.findIndex((c) => c.id === selectedTopic);
            const nextIdx = (idx + 1) % TOPIC_CHIPS.length;
            setSelectedTopic(TOPIC_CHIPS[nextIdx].id);
          },
        }}
        onNextTask={nextTask}
        isNextDisabled={isLoadingTask || isRegeneratingAI}
        provenanceBadge={
          (mode === "circumlocution" ? currentCircumTask : currentScenarioTask) ? (
            <ExerciseSourceBadge
              source={(mode === "circumlocution" ? currentCircumTask : currentScenarioTask)?.source || "ai"}
            />
          ) : undefined
        }
        extraActions={
          <div className="flex items-center gap-1.5">
            <div className="flex items-center p-0.5 bg-muted/40 rounded-xl border border-border/40">
              <button
                onClick={() => setMode("circumlocution")}
                className={cn(
                  "px-2 py-0.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
                  mode === "circumlocution"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Taboo
              </button>
              <button
                onClick={() => setMode("scenarios")}
                className={cn(
                  "px-2 py-0.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer",
                  mode === "scenarios"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Cứu nguy
              </button>
            </div>

            <div className="hidden sm:flex items-center p-0.5 bg-muted/40 rounded-lg border border-border/40 text-[10px]">
              {(["easy", "medium", "hard"] as SurvivalDifficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    "px-1.5 py-0.5 rounded-md font-bold capitalize transition-all cursor-pointer",
                    difficulty === d
                      ? "bg-card text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {d === "easy" ? "Dễ" : d === "medium" ? "Vừa" : "Khó"}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={regenerateWithAI}
              disabled={isRegeneratingAI || isLoadingTask}
              className="h-8 px-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 gap-1 rounded-xl shadow-2xs cursor-pointer transition-all"
              title="AI tạo bài tập mới ngẫu nhiên"
            >
              <Sparkles className={cn("size-3.5", isRegeneratingAI && "animate-spin text-amber-500")} />
              <span className="hidden sm:inline">{isRegeneratingAI ? "Đang tạo..." : "✨ AI Đổi bài"}</span>
            </Button>
          </div>
        }
        onSubmit={() => setIsSessionCompleted(true)}
        onExit={() => (window.location.href = "/dashboard")}
        onOpenHelp={() => {}}
      />

      {/* 2. Cockpit Main Grid (1-Screen Viewport Fit) */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {isLoadingTask ? (
          <div className="h-full flex flex-col items-center justify-center space-y-2 rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl shadow-xl">
            <div className="size-8 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
            <p className="text-xs text-muted-foreground animate-pulse font-medium">
              Đang chuẩn bị dữ liệu khẩu ngữ sinh tồn...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full min-h-0">
            {/* COLUMN 1 (4 cols): Prompt Card */}
            <div className="lg:col-span-4 flex flex-col h-full min-h-0 overflow-hidden rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl shadow-lg p-3.5 sm:p-4">
              <SurvivalPromptCard
                mode={mode}
                circumTask={currentCircumTask}
                scenarioTask={currentScenarioTask}
                countdownSeconds={prepCountdown}
                isCountingDown={isCountingDown}
                onRegenerateAI={regenerateWithAI}
                isRegeneratingAI={isRegeneratingAI}
                onNextTask={nextTask}
                streak={streak}
              />
            </div>

            {/* COLUMN 2 (5 cols): Context Card OR Feedback Card */}
            <div className="lg:col-span-5 flex flex-col h-full min-h-0 overflow-y-auto pr-0.5">
              {lastEvaluation ? (
                <SurvivalFeedbackCard
                  evaluation={lastEvaluation}
                  onContinue={nextTask}
                  onRetry={retryCurrentTask}
                />
              ) : (
                <SurvivalContextCard
                  mode={mode}
                  circumTask={currentCircumTask}
                  scenarioTask={currentScenarioTask}
                  currentHintTier={currentHintTier}
                  onSelectHintTier={setCurrentHintTier}
                />
              )}
            </div>

            {/* COLUMN 3 (3 cols): Studio Speaking Controller */}
            <div className="lg:col-span-3 h-full min-h-0">
              <StudioSpeakingController
                phase={
                  isEvaluating
                    ? "evaluating"
                    : isListening
                    ? "recording"
                    : lastEvaluation
                    ? "result"
                    : "ready"
                }
                liveTranscript={currentLiveTranscript}
                onStartRecord={handleStartRecord}
                onStopRecord={handleStopRecord}
                onSubmit={handleSubmitSpoken}
                onRetry={retryCurrentTask}
                onNext={nextTask}
                onSkip={nextTask}
                onResetTranscript={() => {
                  resetTranscript();
                  setManualText("");
                }}
                textInput={manualText}
                onTextInputChange={setManualText}
                placeholder="Nói hoặc gõ cách diễn đạt tiếng Nhật..."
                promptSpeakerLabel={mode === "circumlocution" ? "Từ khóa cấm" : "Cứu nguy"}
              />
            </div>
          </div>
        )}
      </div>

      {/* Session Completion Summary Modal */}
      <SurvivalSessionSummaryModal
        isOpen={isSessionCompleted}
        onClose={() => resetSession()}
        completedCount={completedTasksCount}
        successfulCount={successfulTasksCount}
        bestStreak={streak}
        totalXp={totalXp}
        onRestart={resetSession}
      />
    </div>
  );
}
