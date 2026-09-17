"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Volume2,
  Mic,
} from "lucide-react";
import { CombatCapsuleHUD } from "@/features/reflex/components/CombatCapsuleHUD";
import { StudioSpeakingController } from "@/features/reflex/components/StudioSpeakingController";
import { ZenUnifiedInputBar } from "@/components/ui/zen-unified-input-bar";
import { ZenLoadingState } from "@/components/ui/zen-loading-state";
import { ExerciseSourceBadge } from "@/components/ui/exercise-source-badge";
import { soundFX } from "@/lib/sound-fx";
import {
  useInterviewCoachSession,
  InterviewCoachLobby,
  InterviewInterviewerCard,
  InterviewPREPScaffold,
  InterviewCoachFeedbackCard,
  InterviewSessionSummaryModal,
} from "@/features/interview";

export default function InterviewPage() {
  const [inSession, setInSession] = useState(false);
  const [transcriptInput, setTranscriptInput] = useState("");

  const {
    role,
    interviewerStyle,
    turnIndex,
    currentQuestion,
    isLoadingQuestion,
    isEvaluating,
    lastEvaluation,
    turnHistory,
    isSessionCompleted,
    finalReport,
    isPlayingVoice,
    startSession,
    submitAnswer,
    nextQuestion,
    completeSession,
    playQuestionVoice,
    stopVoice,
  } = useInterviewCoachSession();

  const handleStartSession = async (
    selectedRole: string,
    selectedStyle: any,
    context?: string
  ) => {
    setInSession(true);
    setTranscriptInput("");
    await startSession(selectedRole, selectedStyle, context);
  };

  const handleSubmit = async (textToSubmit?: string) => {
    const text = textToSubmit || transcriptInput;
    if (!text.trim() || isEvaluating) return;
    await submitAnswer(text);
    setTranscriptInput("");
  };

  const handleNext = async () => {
    soundFX.playKatana();
    setTranscriptInput("");
    await nextQuestion();
  };

  const handleExit = () => {
    stopVoice();
    setInSession(false);
  };

  if (!inSession) {
    return (
      <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 md:p-8 flex items-center justify-center">
        <InterviewCoachLobby
          onStartSession={handleStartSession}
          isLoading={isLoadingQuestion}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col max-w-[1600px] mx-auto p-3 sm:p-4 md:p-6 gap-4">
      {/* Top Cockpit Capsule HUD */}
      <CombatCapsuleHUD
        questionNumber={turnIndex}
        totalQuestions={5}
        subModeLabel="Phỏng Vấn AI"
        subModeJa="面接"
        currentStreak={turnHistory.length}
        provenanceBadge={
          currentQuestion ? (
            <ExerciseSourceBadge
              source={(currentQuestion.source as any) || "ai"}
            />
          ) : undefined
        }
        onNextTask={handleNext}
        isNextDisabled={!lastEvaluation || isEvaluating}
        onSubmit={() => completeSession()}
        onExit={handleExit}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto pr-1">
        {isLoadingQuestion || !currentQuestion ? (
          <div className="col-span-12 flex items-center justify-center p-12">
            <ZenLoadingState
              variant="studio"
              title="Phỏng vấn viên đang soạn câu hỏi tiếp nối..."
            />
          </div>
        ) : (
          <>
            {/* Left Column: Interviewer Question & PREP Coach Feedback */}
            <div className="lg:col-span-7 space-y-4">
              <InterviewInterviewerCard
                question={currentQuestion}
                isPlayingVoice={isPlayingVoice}
                onPlayVoice={playQuestionVoice}
                onStopVoice={stopVoice}
                isLoading={isEvaluating}
              />

              {/* Real-time Coach Feedback Card appears when answered */}
              {lastEvaluation && (
                <InterviewCoachFeedbackCard
                  evaluation={lastEvaluation}
                  onNextQuestion={handleNext}
                  isLastTurn={turnIndex >= 5}
                />
              )}
            </div>

            {/* Right Column: PREP Scaffold & Speaking Controller */}
            <div className="lg:col-span-5 space-y-4 flex flex-col">
              {/* PREP Sentence Starters & Hints */}
              <InterviewPREPScaffold
                prepStarters={currentQuestion.prep_starters}
                keyVocabHints={currentQuestion.key_vocab_hints}
                onSelectPhrase={(phrase) => {
                  setTranscriptInput((prev) =>
                    prev ? `${prev} ${phrase}` : phrase
                  );
                }}
              />

              {/* Response Input Area (Visible if not yet evaluated or user wants to re-answer) */}
              <div className="rounded-2xl border border-border/80 bg-card/70 p-4 md:p-5 shadow-xs backdrop-blur-xs space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      Câu Trả Lời Của Bạn (回答)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Nói qua Mic hoặc Gõ phím
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Áp dụng khung PREP: Nêu kết luận luận điểm trước (結論ファースト).
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <textarea
                    rows={4}
                    value={transcriptInput}
                    onChange={(e) => setTranscriptInput(e.target.value)}
                    disabled={isEvaluating}
                    placeholder="Nhập hoặc nói câu trả lời tiếng Nhật của bạn theo khung PREP..."
                    className="w-full p-3 rounded-xl border border-border/80 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
                  />

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTranscriptInput("")}
                      disabled={!transcriptInput || isEvaluating}
                      className="text-xs rounded-xl"
                    >
                      Xóa
                    </Button>

                    <Button
                      type="button"
                      onClick={() => handleSubmit()}
                      disabled={!transcriptInput.trim() || isEvaluating}
                      className="gap-1.5 rounded-xl font-bold shadow-xs text-xs px-5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{isEvaluating ? "Coach đang chấm..." : "Gửi Coach Đánh Giá"}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Assessment Summary Report Modal */}
      {isSessionCompleted && (
        <InterviewSessionSummaryModal
          report={finalReport}
          turnHistory={turnHistory}
          role={role}
          onRestart={() => {
            setInSession(false);
          }}
        />
      )}
    </div>
  );
}
