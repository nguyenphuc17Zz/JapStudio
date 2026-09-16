"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  Square,
  Play,
  ArrowRight,
  RefreshCw,
  Settings2,
  Trophy,
  Zap,
  Target,
  BookOpen,
  ChevronLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Volume2,
  Keyboard,
  Sparkles,
  Layers,
  Compass,
  Database,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRamp } from "@/hooks/use-ramp";
import { useAudioRecorder } from "@/features/audio/hooks/useAudioRecorder";
import { convertToWavBlob } from "@/features/audio";
import { RampScaffoldPanel } from "@/features/speaking/components/RampScaffoldPanel";
import { RampFeedbackCard } from "@/features/speaking/components/RampFeedbackCard";
import { RampSessionSummaryCard } from "@/features/speaking/components/RampSessionSummary";
import { CombatCapsuleHUD } from "@/features/reflex/components/CombatCapsuleHUD";
import { StudioSpeakingController } from "@/features/reflex/components/StudioSpeakingController";
import { ExerciseSourceBadge } from "@/components/ui/exercise-source-badge";

const RampCheatsheetModal = dynamic(
  () => import("@/features/speaking/components/RampCheatsheetModal").then((m) => m.RampCheatsheetModal),
  { ssr: false }
);
const GlobalKeybindingsModal = dynamic(
  () => import("@/components/layout/global-keybindings-modal").then((m) => m.GlobalKeybindingsModal),
  { ssr: false }
);
import { useSystemKeybindings } from "@/hooks/use-system-keybindings";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { soundFX } from "@/lib/sound-fx";
import { SakuraPetals } from "@/components/ui/sakura-petals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { ZenLoadingState } from "@/components/ui/zen-loading-state";
import { ZenUnifiedInputBar } from "@/components/ui/zen-unified-input-bar";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const idx = res.indexOf(",");
      resolve(idx >= 0 ? res.slice(idx + 1) : res);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const EXERCISE_TYPE_LABEL: Record<string, string> = {
  speak_echo: "Echo 反復",
  speak_substitute: "代入 Substitute",
  speak_complete: "補完 Complete",
  speak_one_sentence: "一文 One Sentence",
  speak_expand: "拡張 Expand",
  speak_reason: "理由付け Reason",
  speak_example: "例示 Example",
  speak_keyword: "キーワード Keyword",
  speak_guided: "誘導 Guided",
  speak_spontaneous: "自由 Spontaneous",
  speak_followup: "フォローアップ Follow-up",
};

export default function RampPage() {
  const ramp = useRamp();
  const recorder = useAudioRecorder();



  // Modals & configuration
  const [selectedGoal, setSelectedGoal] = usePersistedState<string>(
    "speaking_ramp_goal",
    "general"
  );
  const [subtitleMode, setSubtitleMode] = usePersistedState<"hidden" | "japanese" | "vietnamese">(
    "speaking_ramp_subtitle",
    "vietnamese"
  );
  const [inputMode, setInputMode] = usePersistedState<"voice" | "office">(
    "speaking_ramp_input_mode",
    "voice"
  );
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [showKeybindingsModal, setShowKeybindingsModal] = useState(false);

  // Session elapsed timer (supports infinite mode)
  const [sessionElapsedSec, setSessionElapsedSec] = useState(0);

  // Zero-Lobby: Automatically initialize Endless Mode on first mount if no active session
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current && ramp.phase === "idle" && !ramp.session && !ramp.isLoading && !ramp.error) {
      hasInitializedRef.current = true;
      (async () => {
        const s = await ramp.startSession({
          desired_minutes: 0, // Endless mode
          session_goal: selectedGoal,
        });
        if (s) {
          await ramp.loadNextExercise(false, false, s.id);
        }
      })();
    }
  }, [ramp, selectedGoal]);

  // Input & Timers
  const [transcriptInput, setTranscriptInput] = useState("");
  const [showEmbeddedScaffold, setShowEmbeddedScaffold] = useState(false);
  const [prepLeft, setPrepLeft] = useState(0);
  const [recElapsed, setRecElapsed] = useState(0);
  const rafRef = useRef<number | null>(null);
  const prepStartRef = useRef<number | null>(null);
  const recStartRef = useRef<number | null>(null);
  const phaseRef = useRef(ramp.phase);
  useEffect(() => { phaseRef.current = ramp.phase; }, [ramp.phase]);

  const recorderRef = useRef(recorder);
  useEffect(() => {
    recorderRef.current = recorder;
  });

  // Guaranteed microphone, animation, and speech cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebSpeech();
      recorderRef.current.releaseMicrophone();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // System keybindings
  const { matchesAction } = useSystemKeybindings();

  // Errors surface
  useEffect(() => { if (ramp.error) toast.error(ramp.error); }, [ramp.error]);
  useEffect(() => { if (recorder.error) toast.error(recorder.error); }, [recorder.error]);

  // Prep countdown with SoundFX
  const startPrep = useCallback((sec: number) => {
    if (sec <= 0) {
      ramp.setPhase("recording");
      return;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const t0 = performance.now();
    prepStartRef.current = t0;
    setPrepLeft(sec);

    let lastSecBeep = sec;
    const tick = (now: number) => {
      if (phaseRef.current !== "preparing") return;
      const left = Math.max(0, sec - (now - t0) / 1000);
      setPrepLeft(left);

      const currentSec = Math.ceil(left);
      if (currentSec <= 3 && currentSec > 0 && currentSec !== lastSecBeep) {
        soundFX.playSuikinkutsu();
        lastSecBeep = currentSec;
      }

      if (left <= 0) {
        soundFX.playFurin();
        ramp.setPhase("recording");
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [ramp]);

  // Recording timer
  useEffect(() => {
    if (ramp.phase === "recording") {
      recStartRef.current = performance.now();
      const tick = (now: number) => {
        if (phaseRef.current !== "recording") return;
        setRecElapsed((now - (recStartRef.current || now)) / 1000);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [ramp.phase]);

  // Start new endless session immediately
  const handleNewSession = useCallback(async () => {
    soundFX.playTaiko();
    const s = await ramp.startSession({
      desired_minutes: 0,
      session_goal: selectedGoal,
    });
    if (s) {
      await ramp.loadNextExercise(false, false, s.id);
    }
  }, [ramp, selectedGoal]);

  const handleBeginExercise = useCallback(() => {
    soundFX.playTaiko();
    const targetSec = ramp.currentExercise?.task_spec?.target_duration_sec || 0;
    if (targetSec > 0) {
      startPrep(5); // 5s prep
    } else {
      ramp.setPhase("recording");
    }
    recorder.startRecording();
  }, [ramp, recorder, startPrep]);

  const handleStopAndSubmit = useCallback(async () => {
    soundFX.playTaiko();
    const blob = await recorder.stopRecording();
    ramp.setPhase("submitting");
    setRecElapsed(0);

    let audio_base64: string | undefined;
    const transcriptText = transcriptInput.trim();

    if (blob && blob.size > 1000) {
      try {
        const wavBlob = await convertToWavBlob(blob);
        audio_base64 = await blobToBase64(wavBlob);
      } catch (e) {
        try {
          audio_base64 = await blobToBase64(blob);
        } catch {}
      }
    }

    if (!transcriptText && !audio_base64) {
      toast.error("Vui lòng nói qua micro hoặc nhập văn bản câu trả lời.");
      ramp.setPhase("recording");
      return;
    }

    const result = await ramp.submitAttempt({
      user_transcript: transcriptText || "[audio-only]",
      audio_base64,
      support_level_used: ramp.supportLevel,
      used_hint: ramp.usedHint,
    });

    if (result) {
      setTranscriptInput("");
    }
  }, [recorder, ramp, transcriptInput]);

  const handleDirectTextSubmit = useCallback(async (customText?: string) => {
    const text = (customText !== undefined ? customText : transcriptInput).trim();
    if (!text) {
      toast.error("Vui lòng nhập câu trả lời tiếng Nhật của bạn.");
      return;
    }
    soundFX.playTaiko();
    ramp.setPhase("submitting");
    setRecElapsed(0);
    const result = await ramp.submitAttempt({
      user_transcript: text,
      audio_base64: undefined,
      support_level_used: ramp.supportLevel,
      used_hint: ramp.usedHint,
    });
    if (result) {
      setTranscriptInput("");
    }
  }, [ramp, transcriptInput]);

  const handleRetry = useCallback(async () => {
    soundFX.playSuikinkutsu();
    await ramp.loadNextExercise(true);
    setTranscriptInput("");
  }, [ramp]);

  const handleNext = useCallback(async () => {
    soundFX.playSuikinkutsu();
    const result = ramp.submitResult;
    const forceFollowup = result?.feedback?.followup != null;
    await ramp.loadNextExercise(false, forceFollowup);
    setTranscriptInput("");
  }, [ramp]);

  const handleComplete = useCallback(async () => {
    soundFX.playVictory();
    await ramp.completeSession();
  }, [ramp]);

  const handlePlayAudio = (text: string) => {
    stopWebSpeech();
    speakJapaneseText(text);
  };

  const handleInsertText = useCallback((text: string) => {
    setTranscriptInput((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return text;
      return `${trimmed} ${text}`;
    });
    setInputMode("office");
  }, [setInputMode]);

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === "?" || matchesAction(e, "openKeybindingsModal") || (e.key === "k" && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        setShowKeybindingsModal((prev) => !prev);
      } else if (matchesAction(e, "rampCheatsheet") || e.key === "c" || e.key === "C") {
        e.preventDefault();
        setShowCheatsheet((prev) => !prev);
      } else if (matchesAction(e, "rampStartOrSubmit") || e.code === "Space") {
        e.preventDefault();
        if (ramp.phase === "prompting") {
          handleBeginExercise();
        } else if (ramp.phase === "recording") {
          handleStopAndSubmit();
        }
      } else if (matchesAction(e, "rampRetry") || e.key === "r" || e.key === "R") {
        if (ramp.phase === "feedback") {
          e.preventDefault();
          handleRetry();
        }
      } else if (matchesAction(e, "rampNext") || e.key === "n" || e.key === "N") {
        if (ramp.phase === "feedback") {
          e.preventDefault();
          handleNext();
        }
      } else if (matchesAction(e, "rampHint") || e.key === "h" || e.key === "H") {
        if (ramp.phase === "prompting" || ramp.phase === "preparing") {
          e.preventDefault();
          ramp.revealHint();
        }
      } else if (e.key === "p" || e.key === "P") {
        const currentTask = ramp.currentExercise?.task_spec;
        if (currentTask) {
          e.preventDefault();
          handlePlayAudio(currentTask.echo_sentence || currentTask.template_sentence || currentTask.prompt_jp);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ramp.phase, ramp.currentExercise, handleBeginExercise, handleStopAndSubmit, handleRetry, handleNext, ramp, matchesAction]);

  // Contextual data
  const task = ramp.currentExercise?.task_spec;
  const targetSec = task?.target_duration_sec || 0;
  const exercisesCompleted = ramp.session?.exercises_completed || 0;
  const exercisesTotal = ramp.session?.exercises_total || 10;
  const isSessionActive = ramp.phase !== "complete";

  // Session elapsed timer (counts up continuously in endless mode)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isSessionActive) {
      interval = setInterval(() => {
        setSessionElapsedSec((prev) => prev + 1);
      }, 1000);
    } else {
      setSessionElapsedSec(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSessionActive]);

  const formatSessionTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      className={cn(
        "w-full mx-auto animate-in fade-in duration-200",
        ramp.phase === "complete"
          ? "max-w-[1600px] space-y-3 p-4 min-h-[calc(100vh-3.5rem)] overflow-y-auto"
          : "h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden max-w-[1700px] p-2 sm:p-3 space-y-2"
      )}
    >
      {/* ── Combat Capsule HUD when active ── */}
      {ramp.phase !== "complete" && (
        <CombatCapsuleHUD
          questionNumber={exercisesCompleted + 1}
          totalQuestions={undefined}
          subModeLabel={EXERCISE_TYPE_LABEL[task?.exercise_type || ""] || "Nấc Thang Tăng Tốc"}
          subModeJa={ramp.stage ? `S${ramp.stage}` : "S0"}
          currentStreak={exercisesCompleted}
          duration={0}
          sessionRemainingSec={0}
          sessionElapsedSec={sessionElapsedSec}
          subtitleMode={subtitleMode === "hidden" ? "hidden" : subtitleMode === "vietnamese" ? "vietnamese" : "japanese"}
          setSubtitleMode={setSubtitleMode as any}
          filterTrigger={{
            label: task?.topic ? `Stage ${ramp.stage} · ${task.topic}` : `Stage ${ramp.stage || 0}`,
            onClick: () => setShowCheatsheet(true),
          }}
          onNextTask={handleNext}
          isNextDisabled={ramp.isLoading || ramp.isRegeneratingAI || !task}
          provenanceBadge={
            task ? (
              <ExerciseSourceBadge
                source={(task as any).source || (task as any).generation_source || "ai"}
              />
            ) : undefined
          }
          extraActions={
            <Button
              variant="outline"
              size="sm"
              disabled={ramp.isLoading || ramp.isRegeneratingAI || !task}
              onClick={async () => {
                soundFX.playTaiko();
                await ramp.regenerateWithAI();
                setTranscriptInput("");
              }}
              className={cn(
                "h-8 px-2.5 rounded-xl text-xs font-bold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 gap-1.5 shadow-2xs cursor-pointer transition-all",
                ramp.isRegeneratingAI && "opacity-70"
              )}
              title="Bỏ qua cache & gọi AI sinh bài tập mới theo nấc thang (Alt+R)"
            >
              <RefreshCw className={cn("h-3 w-3", ramp.isRegeneratingAI && "animate-spin")} />
              <span className="hidden sm:inline">
                {ramp.isRegeneratingAI ? "Đang đổi..." : "✨ AI Đổi bài"}
              </span>
              <span className="sm:hidden">Đổi</span>
            </Button>
          }
          onSubmit={handleComplete}
          onExit={() => (window.location.href = "/dashboard")}
          onOpenHelp={() => setShowKeybindingsModal(true)}
        />
      )}

      {/* ── Main Content Area ── */}
      <main className={cn("min-h-0", isSessionActive ? "flex-1 overflow-hidden" : "")}>
        {/* Phase: INITIALIZING WORKOUT -> Zen Studio Loading Skeleton */}
        {!task && !ramp.error && ramp.phase !== "complete" && (
          <ZenLoadingState
            variant="studio"
            title="Đang khởi tạo bài tập nấc thang..."
            ja="演習生成中..."
            description="AI đang thiết lập đề bài và giàn giáo phản xạ phù hợp với nấc thang của bạn..."
          />
        )}

        {/* Phase: ERROR RECOVERY */}
        {isSessionActive && !task && ramp.error && (
          <div className="p-8 rounded-3xl border border-destructive/30 bg-destructive/5 text-center space-y-3 washi-texture max-w-lg mx-auto">
            <p className="text-sm font-bold text-destructive">{ramp.error}</p>
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => ramp.loadNextExercise(false, false, ramp.session?.id)}
              >
                <RefreshCw className="h-4 w-4 mr-1.5" /> Thử tạo lại bài tập
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewSession}
              >
                Quay lại sảnh
              </Button>
            </div>
          </div>
        )}

        {/* Phase: WORKOUT (Redesigned 3-Column Golden Ratio Studio) */}
        {isSessionActive && task && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full min-h-0 overflow-hidden">
            {/* ── Column 1 (4 cols): Hero Challenge Card ── */}
            <div className="lg:col-span-4 h-full min-h-0 flex flex-col gap-3 overflow-y-auto scrollbar-thin pr-1 pb-2">
              <div className="p-4 sm:p-5 rounded-3xl border border-border/80 bg-card washi-texture shadow-xs space-y-3.5 relative overflow-hidden flex-1">
                <SakuraPetals count={1} />

                {/* Header: Stage Badge + Topic + Tokyo Native Audio */}
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="matcha" className="text-[11px] font-bold py-0.5 px-2.5 shadow-2xs">
                      Stage {task.stage || ramp.stage} • {EXERCISE_TYPE_LABEL[task.exercise_type] || task.exercise_type}
                    </Badge>
                    {task.topic && (
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 font-jp">
                        <Compass className="h-3.5 w-3.5 text-primary" /> {task.topic}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handlePlayAudio(task.echo_sentence || task.template_sentence || task.prompt_jp)}
                      className="h-8 px-2.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10 text-xs font-semibold gap-1.5 shrink-0 shadow-2xs"
                      title="Nghe phát âm chuẩn Tokyo (P)"
                    >
                      <Volume2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Nghe mẫu (P)</span>
                    </Button>
                  </div>
                </div>

                {/* Instruction Zone */}
                <div className="space-y-1">
                  {subtitleMode === "hidden" ? (
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-center text-xs text-muted-foreground">
                      🔒 Chế độ Ẩn đề bài — Hãy lắng nghe phát âm và tự tin phát ngôn
                    </div>
                  ) : (
                    <>
                      <div className="text-base sm:text-lg font-bold text-foreground font-jp leading-relaxed">
                        <UniversalFurigana text={task.prompt_jp} fontSize="lg" />
                      </div>
                      {subtitleMode === "vietnamese" && task.prompt_vi && (
                        <p className="text-xs text-muted-foreground leading-normal">
                          {task.prompt_vi}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Target Speech Board */}
                <div className="space-y-2 pt-1">
                  {/* A. Từ khóa cần thay thế (Substitute Slot) */}
                  {task.substitution_variable && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                          🎯 Từ khóa cần thay thế vào câu:
                        </span>
                        <div className="text-base sm:text-lg font-bold font-jp text-foreground">
                          「<UniversalFurigana text={task.substitution_variable} />」
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePlayAudio(task.substitution_variable!)}
                        className="h-8 px-2 rounded-xl text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-semibold gap-1 shrink-0"
                        title="Nghe phát âm từ này"
                      >
                        <Volume2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Nghe từ</span>
                      </Button>
                    </div>
                  )}

                  {/* B. Mẫu câu tham chiếu (Template Sentence) */}
                  {task.template_sentence && (
                    <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs washi-texture space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Mẫu câu tham chiếu:
                      </span>
                      <div className="text-base sm:text-lg font-bold text-foreground font-jp leading-relaxed">
                        「<UniversalFurigana text={task.template_sentence} fontSize="lg" />」
                      </div>
                    </div>
                  )}

                  {/* C. Câu nhại lại (Echo Sentence) */}
                  {task.echo_sentence && (
                    <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-center space-y-2.5">
                      <span className="text-[11px] font-bold text-primary block">
                        Câu mẫu chuẩn Tokyo — Hãy lắng nghe và nhại lại:
                      </span>
                      <div className="text-lg sm:text-xl font-bold text-foreground font-jp leading-relaxed">
                        「<UniversalFurigana text={task.echo_sentence} fontSize="lg" />」
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePlayAudio(task.echo_sentence!)}
                        className="h-8 px-3 rounded-xl border-primary/30 text-primary hover:bg-primary/15 gap-1.5 mx-auto font-bold shadow-2xs"
                      >
                        <Volume2 className="h-4 w-4" />
                        <span>Nghe phát âm chuẩn (P)</span>
                      </Button>
                    </div>
                  )}

                  {/* D. Câu hạt giống cần mở rộng (Seed Sentence) */}
                  {task.seed_sentence && (
                    <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs washi-texture space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Câu gốc cần mở rộng:
                        </span>
                        {task.expansion_dimension && (
                          <Badge variant="matcha" size="sm" className="font-bold text-[10px]">
                            + Thêm thông tin: {task.expansion_dimension}
                          </Badge>
                        )}
                      </div>
                      <div className="text-base sm:text-lg font-bold text-foreground font-jp leading-relaxed">
                        「<UniversalFurigana text={task.seed_sentence} fontSize="lg" />」
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Column 2 (4 cols): Scaffold OR Feedback Card ── */}
            <div className="lg:col-span-4 h-full min-h-0 flex flex-col gap-3 overflow-y-auto scrollbar-thin px-0.5 pb-2">
              {ramp.phase === "feedback" && ramp.submitResult ? (
                <RampFeedbackCard
                  result={ramp.submitResult}
                  onRetry={handleRetry}
                  onNext={handleNext}
                  onElaborate={handleNext}
                  stageChanged={ramp.submitResult.delta?.stage_changed}
                />
              ) : (
                <RampScaffoldPanel
                  task={task}
                  supportLevel={ramp.supportLevel}
                  onRevealHint={ramp.revealHint}
                  hintRevealed={ramp.usedHint}
                  onInsertText={handleInsertText}
                />
              )}
            </div>

            {/* ── Column 3 (4 cols): Studio Speaking Controller ── */}
            <div className="lg:col-span-4 h-full min-h-0">
              <StudioSpeakingController
                phase={
                  ramp.phase === "submitting"
                    ? "evaluating"
                    : ramp.phase === "recording"
                    ? "recording"
                    : ramp.phase === "preparing"
                    ? "prompt_playing"
                    : ramp.phase === "feedback"
                    ? "result"
                    : "ready"
                }
                liveTranscript={transcriptInput}
                onStartRecord={handleBeginExercise}
                onStopRecord={handleStopAndSubmit}
                onSubmit={(text) => handleDirectTextSubmit(text)}
                onRetry={handleRetry}
                onNext={handleNext}
                onSkip={handleNext}
                onResetTranscript={() => setTranscriptInput("")}
                textInput={transcriptInput}
                onTextInputChange={setTranscriptInput}
                placeholder="Nói hoặc gõ câu tiếng Nhật theo nấc thang..."
                promptSpeakerLabel="Câu mẫu Tokyo"
                onPlayPrompt={() => handlePlayAudio(task.echo_sentence || task.template_sentence || task.prompt_jp)}
              />
            </div>
          </div>
        )}

        {/* Phase: COMPLETE -> Summary */}
        {ramp.phase === "complete" && ramp.summary && (
          <div className="h-full overflow-y-auto scrollbar-thin p-1">
            <RampSessionSummaryCard
              summary={ramp.summary}
              onStartNew={handleNewSession}
            />
          </div>
        )}
      </main>

      {/* ── Modals & Drawers ── */}
      <RampCheatsheetModal
        isOpen={showCheatsheet}
        onClose={() => setShowCheatsheet(false)}
      />

      <GlobalKeybindingsModal
        isOpen={showKeybindingsModal}
        onClose={() => setShowKeybindingsModal(false)}
      />
    </div>
  );
}
