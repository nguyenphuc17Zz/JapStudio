"use client";

import React, { useEffect, useState } from "react";
import { Persona } from "@/types/persona";
import {
  ConversationAnalysisSummary,
  ConversationTurn,
  CorrectionItem,
  RecordingState,
  TurnAnalysis,
  VoiceSession,
} from "../types";
import { getStatusColor } from "../state/session-state-machine";
import { AudioVisualizer } from "./AudioVisualizer";
import { ConversationTranscript } from "./ConversationTranscript";
import { CoachingFeedbackCard } from "./CoachingFeedbackCard";
import { ConversationReviewPanel } from "./ConversationReviewPanel";
import { CorrectionDetailModal } from "./CorrectionDetailModal";
import { LiveTurnScaffolding } from "./LiveTurnScaffolding";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  Pause,
  Play,
  Square,
  Send,
  Clock,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { analysisApi } from "../services/analysis-api";
import { useSystemKeybindings } from "@/hooks/use-system-keybindings";
import { ZenUnifiedInputBar } from "@/components/ui/zen-unified-input-bar";

interface ActiveSessionRoomProps {
  session: VoiceSession;
  persona: Persona;
  turns: ConversationTurn[];
  state: RecordingState;
  volumeLevel: number;
  isUserSpeaking: boolean;
  formattedElapsed: string;
  formattedSpeaking: string;
  isVoiceMuted?: boolean;
  onToggleVoiceMute?: () => void;
  autoEndOfSpeech?: boolean;
  onToggleAutoEndOfSpeech?: () => void;
  latestUserTranscript?: string | null;
  interimTranscript?: string;
  latestSttMetrics?: {
    model?: string;
    latency_ms?: number;
  } | null;
  isManualRecording?: boolean;
  manualSeconds?: number;
  onStartManualRecording?: () => void;
  onStopManualRecording?: () => void;
  hasPermission?: boolean | null;
  onRequestPermission?: () => Promise<boolean>;
  onSendTextTurn: (text: string) => void;
  onPause: () => void;
  onResume: () => void;
  onEndSession: () => void;
  onReplayVoice: (text: string) => void;
}

export function ActiveSessionRoom({
  session,
  persona,
  turns,
  state,
  volumeLevel,
  isUserSpeaking,
  formattedElapsed,
  formattedSpeaking,
  isVoiceMuted = false,
  onToggleVoiceMute,
  autoEndOfSpeech = true,
  onToggleAutoEndOfSpeech,
  latestUserTranscript,
  interimTranscript = "",
  latestSttMetrics,
  isManualRecording = false,
  manualSeconds = 0,
  onStartManualRecording,
  onStopManualRecording,
  hasPermission,
  onRequestPermission,
  onSendTextTurn,
  onPause,
  onResume,
  onEndSession,
  onReplayVoice,
}: ActiveSessionRoomProps) {
  const [inputText, setInputText] = useState("");
  const [analysisSummary, setAnalysisSummary] =
    useState<ConversationAnalysisSummary | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedCorrection, setSelectedCorrection] =
    useState<CorrectionItem | null>(null);

  const statusInfo = getStatusColor(state);

  // Poll analysis data in the background
  useEffect(() => {
    if (!session?.id) return;

    let isMounted = true;
    const fetchAnalysis = async () => {
      try {
        const data = await analysisApi.getSessionAnalysisSummary(session.id);
        if (isMounted) {
          setAnalysisSummary(data);
        }
      } catch (e) {
        // Silently catch background poll errors
      }
    };

    fetchAnalysis();
    const interval = setInterval(fetchAnalysis, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [session?.id, turns.length]);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendTextTurn(inputText);
    setInputText("");
  };

  // Map turn ID to TurnAnalysis
  const analysesMap: Record<string, TurnAnalysis> = {};
  if (analysisSummary?.turn_analyses) {
    for (const ta of analysisSummary.turn_analyses) {
      analysesMap[ta.turn_id] = ta;
    }
  }

  const { matchesAction, keybindings } = useSystemKeybindings();

  // Dynamic Keyboard Shortcuts for Speaking Room
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputActive =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.getAttribute("contenteditable") === "true");

      if (isInputActive) return;

      // 1. Mic Speak / Push-to-Talk
      if (matchesAction(e, "speakingMic")) {
        e.preventDefault();
        if (state === "listening" || isManualRecording || isUserSpeaking) {
          if (!autoEndOfSpeech) {
            if (isManualRecording) {
              onStopManualRecording?.();
            } else {
              onStartManualRecording?.();
            }
          } else {
            if (isUserSpeaking || isManualRecording) {
              onStopManualRecording?.();
            } else {
              onStartManualRecording?.();
            }
          }
        }
        return;
      }

      // 2. Replay last AI turn audio
      if (matchesAction(e, "speakingReplay")) {
        e.preventDefault();
        const aiTurns = turns.filter((t) => t.speaker === "assistant");
        const lastAiTurn = aiTurns[aiTurns.length - 1];
        if (lastAiTurn?.transcript) {
          onReplayVoice(lastAiTurn.transcript);
        }
        return;
      }

      // 3. Toggle Mute
      if (matchesAction(e, "speakingMute")) {
        e.preventDefault();
        onToggleVoiceMute?.();
        return;
      }

      // 4. Toggle Speaking Mode (Hands-free / Push-to-Talk)
      if (matchesAction(e, "speakingModeToggle")) {
        e.preventDefault();
        onToggleAutoEndOfSpeech?.();
        return;
      }

      // Escape: Pause / Resume
      if (e.key === "Escape") {
        e.preventDefault();
        if (state === "paused") {
          onResume();
        } else if (state === "listening" || state === "ai_speaking") {
          onPause();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    matchesAction,
    autoEndOfSpeech,
    isManualRecording,
    isUserSpeaking,
    onPause,
    onResume,
    onStartManualRecording,
    onStopManualRecording,
    onToggleAutoEndOfSpeech,
    onToggleVoiceMute,
    onReplayVoice,
    turns,
    state,
  ]);

  // Find latest coaching tip for coaching mode
  const userTurns = turns.filter((t) => t.speaker === "user");
  const lastUserTurn = userTurns[userTurns.length - 1];
  const lastAnalysis = lastUserTurn ? analysesMap[lastUserTurn.id] : null;
  const latestCorrection =
    lastAnalysis && lastAnalysis.corrections.length > 0
      ? lastAnalysis.corrections[0]
      : null;

  const totalCorrectionsCount =
    analysisSummary?.turn_analyses?.reduce(
      (acc, ta) => acc + ta.corrections.length,
      0
    ) || 0;

  const latestAssistantTurn = [...turns].reverse().find((t) => t.speaker === "assistant");
  const activeScaffolding =
    latestAssistantTurn?.scaffolding ??
    (latestAssistantTurn?.metrics as any)?.scaffolding ??
    null;

  return (
    <div className="space-y-3.5 max-w-[1560px] w-full mx-auto animate-in fade-in duration-300">
      {/* Session Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl glass-card border border-white/10 dark:border-white/10 shadow-xl backdrop-blur-2xl">
        {/* Left: Persona & Mode Info */}
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-primary via-aizome-500 to-indigo-600 flex items-center justify-center text-primary-foreground font-extrabold text-base shadow-lg shadow-primary/20 ring-2 ring-primary/20">
            {persona.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-foreground tracking-tight">{persona.name}</h2>
              <Badge variant="jlpt" size="sm" className="rounded-full shadow-2xs">
                {persona.difficulty}
              </Badge>
              <Badge variant="outline" size="sm" className="capitalize text-[10px] rounded-full border-white/15 bg-white/5 backdrop-blur-md">
                {session.mode} Mode
              </Badge>
            </div>
            <p className="text-[11px] text-primary/90 font-medium">
              {persona.role} • {persona.speaking_style}
            </p>
          </div>
        </div>

        {/* Right: Timer & Turn Stats & Intelligence Drawer Trigger */}
        <div className="flex items-center gap-2.5 text-xs font-mono text-muted-foreground self-end sm:self-center">
          <div className="flex items-center gap-1.5 bg-white/5 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-md shadow-2xs">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-foreground font-bold">{formattedElapsed}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-white/5 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-md text-[11px] shadow-2xs">
            <span className="text-muted-foreground">Speaking:</span>
            <span className="text-emerald-400 font-bold">{formattedSpeaking}</span>
          </div>

          {/* Voice Mute / Audio Toggle Button */}
          {onToggleVoiceMute && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleVoiceMute}
              className={`text-xs gap-1.5 rounded-xl backdrop-blur-md transition-all ${
                isVoiceMuted
                  ? "border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                  : "border-white/15 bg-white/5 text-foreground hover:bg-white/10"
              }`}
              title={isVoiceMuted ? "Bật âm thanh đối tác" : "Tắt tiếng đối tác (Tiết kiệm RAM / Nhẹ máy)"}
            >
              {isVoiceMuted ? (
                <>
                  <VolumeX className="h-3.5 w-3.5 text-amber-400" />
                  <span>Tắt tiếng</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-primary" />
                  <span>Bật tiếng</span>
                </>
              )}
            </Button>
          )}

          {/* Live Intelligence Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsReviewOpen(true)}
            className={`text-xs gap-1.5 rounded-xl backdrop-blur-md transition-all ${
              totalCorrectionsCount > 0
                ? "border-kintsugi-500/40 text-kintsugi-400 bg-kintsugi-500/10 hover:bg-kintsugi-500/20 shadow-xs"
                : "border-white/15 bg-white/5 text-foreground hover:bg-white/10"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Analysis ({totalCorrectionsCount})</span>
          </Button>
        </div>
      </div>

      {/* Main Room Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Visualizer & Live Speaking Control Panel */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col justify-between p-5 rounded-3xl glass-card border border-white/10 dark:border-white/10 shadow-2xl backdrop-blur-2xl space-y-4 relative overflow-hidden">
          {/* Subtle Ambient Refraction */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-44 h-44 bg-primary/10 blur-3xl rounded-full pointer-events-none -z-10" />

          {/* Status Indicator Banner */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold backdrop-blur-md ${statusInfo.badgeBg} ${statusInfo.badgeText}`}
            >
              <div className={`h-2 w-2 rounded-full ${statusInfo.dotColor}`} />
              <span>{statusInfo.label}</span>
            </div>

            {session.mode === "coaching" && (
              <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 backdrop-blur-md">
                ⚡ Realtime Coach
              </span>
            )}
          </div>

          {/* Central Pulsing Audio Orb */}
          <div className="py-1 flex flex-col items-center justify-center space-y-3">
            <AudioVisualizer
              state={state}
              volumeLevel={volumeLevel}
              isUserSpeaking={isUserSpeaking || isManualRecording}
            />

            {/* Permission Denied Warning Banner */}
            {hasPermission === false && onRequestPermission && (
              <div className="w-full p-2.5 rounded-2xl bg-destructive/15 border border-destructive/40 text-destructive flex items-center justify-between gap-2 text-xs animate-bounce">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Chưa cấp quyền Micro</span>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onRequestPermission()}
                  className="text-[11px] h-7 px-2 rounded-xl"
                >
                  Bật Micro
                </Button>
              </div>
            )}

            {/* Speaking Mode Selector Tabs */}
            {onToggleAutoEndOfSpeech && (
              <div className="w-full flex items-center p-1 rounded-2xl bg-white/5 dark:bg-white/5 border border-white/10 backdrop-blur-md text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (!autoEndOfSpeech) onToggleAutoEndOfSpeech();
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    autoEndOfSpeech
                      ? "bg-primary text-primary-foreground shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Phím tắt: T"
                >
                  <span>🗣️ Tự động (VAD)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (autoEndOfSpeech) onToggleAutoEndOfSpeech();
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    !autoEndOfSpeech
                      ? "bg-primary text-primary-foreground shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Phím tắt: T"
                >
                  <span>🔴 Bấm nút để nói</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-black/20 font-mono opacity-80">T</span>
                </button>
              </div>
            )}

            {/* Interactive Speaking Controller */}
            <div className="w-full space-y-2">
              {!autoEndOfSpeech ? (
                /* Mode 2: Manual Click-to-Talk */
                !isManualRecording ? (
                  <button
                    type="button"
                    onClick={onStartManualRecording}
                    disabled={state !== "listening"}
                    className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-primary via-primary/95 to-aizome-600 hover:from-primary/90 hover:to-aizome-700 text-primary-foreground font-bold shadow-xl shadow-primary/25 flex items-center justify-between gap-3 transition-all transform active:scale-98 cursor-pointer disabled:opacity-40 ring-1 ring-white/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shadow-xs">
                        <Mic className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-extrabold tracking-wide flex items-center gap-1.5">
                          <span>🎙️ BẤM VÀO ĐÂY ĐỂ NÓI</span>
                        </div>
                        <div className="text-[10px] text-white/80 font-normal">
                          Nói tiếng Nhật xong bấm lại để gửi
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-white/20 font-mono text-[10px] font-black tracking-wider uppercase border border-white/25">
                      Space
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onStopManualRecording}
                    className="w-full py-4 px-4 rounded-2xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold shadow-2xl shadow-destructive/40 flex items-center justify-between gap-3 animate-pulse transition-all transform active:scale-98 cursor-pointer ring-1 ring-white/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-white/25 flex items-center justify-center shadow-xs">
                        <Square className="h-3.5 w-3.5 fill-white text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-extrabold tracking-wide flex items-center gap-1.5">
                          <span>🛑 ĐANG THU ÂM... BẤM ĐỂ GỬI</span>
                        </div>
                        <div className="text-[10px] text-white/80 font-normal">
                          Dừng và chuyển giọng nói thành tiếng Nhật
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded-md bg-black/40 font-mono text-[10px] font-black border border-white/20">
                        Space
                      </span>
                      <span className="font-mono text-xs font-black bg-black/40 px-2 py-1 rounded-md">
                        {Math.floor(manualSeconds / 60)}:
                        {(manualSeconds % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                  </button>
                )
              ) : (
                /* Mode 1: Auto VAD */
                <div
                  className={`w-full p-3.5 rounded-2xl border transition-all backdrop-blur-md flex items-center justify-between ${
                    isUserSpeaking
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-md shadow-emerald-500/10"
                      : state === "listening"
                      ? "bg-white/5 border-white/10 text-foreground"
                      : "bg-white/5 border-white/5 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center shadow-xs ${
                        isUserSpeaking
                          ? "bg-emerald-500/25 text-emerald-400"
                          : "bg-primary/15 text-primary"
                      }`}
                    >
                      <Mic className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">
                        {isUserSpeaking
                          ? "🎙️ Đang nghe giọng bạn nói..."
                          : state === "listening"
                          ? "🟢 Micro đang sẵn sàng lắng nghe"
                          : "Micro đang chờ..."}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {isUserSpeaking
                          ? "Dứt câu hệ thống sẽ tự động gửi đi"
                          : "Hãy nói tiếng Nhật tự nhiên vào micro"}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isUserSpeaking
                        ? "bg-emerald-400 animate-ping"
                        : state === "listening"
                        ? "bg-emerald-400"
                        : "bg-muted-foreground"
                    }`}
                  />
                </div>
              )}

              {/* Live Volume Meter Bar */}
              <div className="flex items-center justify-between px-3.5 py-2 bg-white/5 dark:bg-white/5 rounded-2xl border border-white/10 text-[10px] backdrop-blur-md">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <span>Âm lượng Mic:</span>
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 14 }).map((_, i) => {
                    const isActive = volumeLevel * 14 > i;
                    return (
                      <div
                        key={i}
                        className={`h-2.5 w-1.5 rounded-xs transition-all duration-75 ${
                          isActive
                            ? i > 10
                              ? "bg-destructive shadow-xs shadow-destructive"
                              : i > 7
                              ? "bg-amber-400 shadow-xs shadow-amber-400"
                              : "bg-emerald-400 shadow-xs shadow-emerald-400"
                            : "bg-white/10 dark:bg-white/10"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Faster-Whisper Live Output Card */}
            {(latestUserTranscript || state === "processing_stt" || isUserSpeaking) && (
              <div className="w-full p-3.5 rounded-2xl bg-white/5 dark:bg-white/5 border border-white/10 backdrop-blur-xl shadow-md space-y-2 text-left animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <Mic className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Faster-Whisper Output (Lời bạn vừa nói)</span>
                  </span>
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {latestSttMetrics?.model || session.stt_model_preference || "base"}
                    </span>
                    {latestSttMetrics?.latency_ms && (
                      <span className="text-muted-foreground">{latestSttMetrics.latency_ms}ms</span>
                    )}
                  </div>
                </div>

                {state === "processing_stt" ? (
                  <div className="flex items-center gap-2 text-xs text-amber-400 py-1 font-medium">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                    <span>⚡ Faster-Whisper đang chuyển giọng nói thành tiếng Nhật...</span>
                  </div>
                ) : isUserSpeaking ? (
                  interimTranscript ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>🎙️ Đang nghe giọng bạn (Live Preview):</span>
                      </div>
                      <p className="text-xs font-jp text-foreground bg-emerald-500/10 border border-emerald-500/25 p-2 rounded-xl leading-relaxed animate-pulse">
                        {interimTranscript}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-emerald-400 py-1 font-medium">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>🎙️ Đang nghe... Hãy nói tiếng Nhật tự nhiên</span>
                    </div>
                  )
                ) : (
                  <p className="text-xs font-jp text-foreground bg-white/5 p-2 rounded-xl border border-white/10 leading-relaxed">
                    {latestUserTranscript}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Coaching Mode Live Tip Card */}
          {session.mode === "coaching" && latestCorrection && (
            <CoachingFeedbackCard
              correction={latestCorrection}
              onViewDetails={(c) => setSelectedCorrection(c)}
              onPlayCorrection={onReplayVoice}
            />
          )}

          {/* Footer Controls Bar */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
            {state === "paused" ? (
              <Button
                variant="primary"
                size="sm"
                onClick={onResume}
                className="gap-1 shadow-sm rounded-xl"
              >
                <Play className="h-3.5 w-3.5 mr-1 fill-current" />
                Resume (再開)
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onPause}
                disabled={state === "ai_thinking" || state === "processing_stt"}
                className="rounded-xl border-white/10 hover:bg-white/10"
              >
                <Pause className="h-3.5 w-3.5 mr-1" />
                Pause (一時停止)
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onEndSession}
              className="text-destructive hover:text-destructive/90 hover:border-destructive/50 rounded-xl border-white/10"
            >
              <Square className="h-3.5 w-3.5 mr-1 text-destructive" />
              End Session (終了)
            </Button>
          </div>
        </div>

        {/* Right Column: Live Transcript Stream & Fallback Text Input */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col justify-between rounded-3xl glass-card border border-white/10 dark:border-white/10 shadow-2xl backdrop-blur-2xl overflow-hidden min-h-[480px]">
          {/* Transcript Area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-3.5 px-4 border-b border-white/10 bg-white/5 dark:bg-white/5 flex items-center justify-between text-xs font-semibold text-foreground backdrop-blur-md">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span>Live Dialogue (会話履歴)</span>
              </span>
              <span className="text-[11px] font-normal text-muted-foreground font-mono">
                {turns.length} turns recorded
              </span>
            </div>

            <ConversationTranscript
              turns={turns}
              personaName={persona.name}
              analysesMap={analysesMap}
              state={state}
              isUserSpeaking={isUserSpeaking || isManualRecording}
              interimTranscript={interimTranscript}
              sttModel={session.stt_model_preference || "base"}
              onSelectCorrection={(c) => setSelectedCorrection(c)}
              onReplayVoice={onReplayVoice}
            />
          </div>

          {/* Live Turn Scaffolding (Speech Starters, Angles & Key Vocab) */}
          {latestAssistantTurn && (
            <div className="p-3 border-t border-white/10 bg-white/5 dark:bg-white/5 backdrop-blur-md">
              <LiveTurnScaffolding
                scaffolding={activeScaffolding}
                lastAiText={latestAssistantTurn.transcript}
                personaName={persona.name}
                onSelectSuggestion={(txt) => setInputText(txt)}
                disabled={state === "ai_thinking" || state === "processing_stt"}
              />
            </div>
          )}

          {/* Universal Text Input Bar (Office Mode / Broken Mic) */}
          <div className="p-3 border-t border-white/10 bg-white/5 dark:bg-white/5 backdrop-blur-md">
            <ZenUnifiedInputBar
              value={inputText}
              onChange={setInputText}
              onSubmit={() => {
                if (inputText.trim() && state !== "ai_thinking" && state !== "processing_stt") {
                  onSendTextTurn(inputText);
                  setInputText("");
                }
              }}
              placeholder="Gõ tiếng Nhật đối thoại trực tiếp... (例: 今日は天気がいいですね / Enter để gửi)"
              submitButtonText="Gửi tin"
              isEvaluating={state === "ai_thinking" || state === "processing_stt"}
              hintText="Chế độ văn phòng: Trò chuyện không cần nói to"
            />
          </div>
        </div>
      </div>

      {/* Review Drawer Panel */}
      <ConversationReviewPanel
        isOpen={isReviewOpen}
        summary={analysisSummary}
        onClose={() => setIsReviewOpen(false)}
        onSelectCorrection={(c) => setSelectedCorrection(c)}
        onPlayCorrection={onReplayVoice}
      />

      {/* Selected Correction Detail Modal */}
      <CorrectionDetailModal
        isOpen={selectedCorrection !== null}
        correction={selectedCorrection}
        onClose={() => setSelectedCorrection(null)}
        onPlayCorrection={onReplayVoice}
      />
    </div>
  );
}
