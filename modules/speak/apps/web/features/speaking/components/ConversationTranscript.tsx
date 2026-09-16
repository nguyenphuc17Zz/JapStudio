"use client";

import React, { useEffect, useRef, useState } from "react";
import { ConversationTurn, CorrectionItem, RecordingState, TurnAnalysis } from "../types";
import { Volume2, Sparkles, Clock, CheckCircle2, ChevronRight, ChevronDown, ChevronUp, Mic, Zap, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { speakJapaneseText } from "../services/web-speech";
import { soundFX } from "@/lib/sound-fx";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { generateSayItBetter } from "../services/discourse-engine";

interface ConversationTranscriptProps {
  turns: ConversationTurn[];
  personaName: string;
  analysesMap?: Record<string, TurnAnalysis>;
  state?: RecordingState;
  isUserSpeaking?: boolean;
  interimTranscript?: string;
  sttModel?: string;
  onSelectCorrection?: (correction: CorrectionItem) => void;
  onReplayVoice?: (text: string) => void;
}

export function ConversationTranscript({
  turns,
  personaName,
  analysesMap = {},
  state = "idle",
  isUserSpeaking = false,
  interimTranscript = "",
  sttModel = "base",
  onSelectCorrection,
  onReplayVoice,
}: ConversationTranscriptProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [expandedSayItBetterTurnId, setExpandedSayItBetterTurnId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, state, isUserSpeaking, interimTranscript]);

  return (
    <div className="space-y-3.5 p-4 overflow-y-auto flex-1 scrollbar-thin">
      {turns.length === 0 && !isUserSpeaking && state === "listening" && (
        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-2.5">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl shadow-lg shadow-primary/10 animate-pulse">
            🎙️
          </div>
          <p className="text-xs font-semibold text-foreground">
            Start speaking in Japanese or type a message below.
          </p>
          <p className="text-[11px] text-muted-foreground font-jp">
            音声で話しかけると、AIが自然な日本語で返答します。
          </p>
        </div>
      )}

      {turns.map((turn) => {
        const isUser = turn.speaker === "user";
        const analysis = analysesMap[turn.id];
        const corrections = analysis?.corrections || [];
        const aizuchiEval =
          analysis?.aizuchi ||
          analysis?.context_notes?.find((cn) => cn.aizuchi_evaluation)?.aizuchi_evaluation;

        return (
          <div
            key={turn.id}
            className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1.5 animate-in fade-in duration-200`}
          >
            {/* Header info */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1">
              <span className="font-semibold text-foreground">
                {isUser ? "You (あなた)" : personaName}
              </span>
              {isUser && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[9px]">
                  Faster-Whisper ({turn.stt_model || sttModel}) ✓
                </span>
              )}
              {turn.processing_time_ms && (
                <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {turn.processing_time_ms}ms
                </span>
              )}
              {isUser && analysis && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-sakura-300 font-mono border border-sakura-500/20">
                  Score: {analysis.overall_quality_score}/100
                </span>
              )}
            </div>

            {/* Turn Bubble */}
            <div
              className={`relative max-w-[85%] sm:max-w-[75%] p-4 rounded-3xl text-xs leading-relaxed transition-all ${
                isUser
                  ? "bg-primary/20 text-foreground border border-primary/30 rounded-tr-xs shadow-lg shadow-primary/10 backdrop-blur-md"
                  : "glass-card text-foreground border border-white/10 dark:border-white/10 rounded-tl-xs shadow-xl backdrop-blur-2xl"
              }`}
            >
              <div className="whitespace-pre-wrap font-jp text-xs sm:text-sm leading-[2.2]">
                <UniversalFurigana text={turn.transcript} fontSize="normal" />
              </div>

              {/* Zen Aizuchi & Turn-Taking Interaction Badge */}
              {isUser && aizuchiEval && (aizuchiEval.detected_token || aizuchiEval.category !== "none") && (
                <div className="mt-2 pt-1.5 border-t border-border/70 flex items-center justify-between gap-1.5 flex-wrap text-[10px]">
                  <div
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all cursor-help ${
                      aizuchiEval.is_register_appropriate
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-sm shadow-emerald-950/20 hover:bg-emerald-500/20"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-sm shadow-amber-950/20 hover:bg-amber-500/20"
                    }`}
                    title={aizuchiEval.feedback_vi || undefined}
                  >
                    <span className="font-semibold">
                      {aizuchiEval.category === "continuer" && "🎧 相槌: Tiếp lời"}
                      {aizuchiEval.category === "agreement" && "🤝 相槌: Tán đồng"}
                      {aizuchiEval.category === "emotional_resonance" && "✨ 相槌: Cảm xúc"}
                      {aizuchiEval.category === "understanding" && "💡 相槌: Tiếp nhận"}
                      {aizuchiEval.category === "turn_initial_preface" && "⚡ Mở đầu nhịp nhàng"}
                      {aizuchiEval.category === "none" && "💬 相槌"}
                    </span>
                    {aizuchiEval.detected_token && (
                      <span className="font-jp font-medium px-1 rounded bg-background/50 text-foreground border border-border/40">
                        {aizuchiEval.detected_token}
                      </span>
                    )}
                    {aizuchiEval.clause_boundary_matched && (
                      <span className="text-[9px] text-emerald-400 font-medium" title="Bắt nhịp chuẩn xác điểm kết câu của AI">
                        🎯 Chuẩn nhịp
                      </span>
                    )}
                  </div>
                  {aizuchiEval.naturalness_bonus > 0 && (
                    <span className="text-[9px] font-mono text-emerald-400/90 font-medium">
                      +{aizuchiEval.naturalness_bonus} SLA Flow
                    </span>
                  )}
                </div>
              )}

              {/* User Turn Intelligence Corrections Pill List */}
              {isUser && corrections.length > 0 && onSelectCorrection && (
                <div className="mt-2.5 pt-2 border-t border-border/80 space-y-1.5">
                  <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>Lưu ý chỉnh sửa (Click to view):</span>
                  </span>
                  <div className="flex flex-col gap-1">
                    {corrections.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => onSelectCorrection(c)}
                        className={`text-left p-1.5 rounded-lg text-[11px] font-mono flex items-center justify-between border transition-all ${
                          c.severity === "MUST_FIX"
                            ? "bg-destructive/10 border-destructive/30 hover:bg-destructive/20 text-destructive"
                            : c.severity === "SHOULD_FIX"
                            ? "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-400"
                            : "bg-aizome-500/10 border-aizome-500/30 hover:bg-aizome-500/20 text-aizome-300"
                        }`}
                      >
                        <span className="truncate max-w-[220px]">
                          {c.severity === "MUST_FIX" ? "🔴 " : c.severity === "SHOULD_FIX" ? "🟠 " : "⭐ "}
                          <span className="line-through opacity-80">{c.original}</span> ➔ {c.corrected}
                        </span>
                        <ChevronRight className="h-3 w-3 shrink-0 opacity-70" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Say It Better Expansion Button & Drawer for User Turns */}
              {isUser && (
                <div className="mt-2 pt-1.5 border-t border-border/60">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playTaiko();
                        setExpandedSayItBetterTurnId(
                          expandedSayItBetterTurnId === turn.id ? null : turn.id
                        );
                      }}
                      className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-primary hover:text-primary/80 transition-all cursor-pointer"
                    >
                      <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                      <span>✨ Diễn đạt hay hơn (Say It Better)</span>
                      {expandedSayItBetterTurnId === turn.id ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>

                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                      ✨ AI Realtime
                    </span>
                  </div>

                  {expandedSayItBetterTurnId === turn.id && (
                    <div className="mt-2 space-y-2 p-2.5 rounded-2xl bg-background/80 border border-border/80 backdrop-blur-md animate-in fade-in duration-200">
                      {(() => {
                        const sayItBetter = generateSayItBetter(turn.transcript);
                        const variants = [
                          {
                            key: "casual",
                            badge: "🌿 Thân mật",
                            badgeColor: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
                            ...sayItBetter.casual,
                          },
                          {
                            key: "polite",
                            badge: "💼 Công sở",
                            badgeColor: "bg-blue-500/15 border-blue-500/30 text-blue-400",
                            ...sayItBetter.polite,
                          },
                          {
                            key: "idiomatic",
                            badge: "⚡ Khẩu ngữ bản xứ",
                            badgeColor: "bg-purple-500/15 border-purple-500/30 text-purple-400",
                            ...sayItBetter.idiomatic,
                          },
                        ];

                        return variants.map((v) => (
                          <div
                            key={v.key}
                            className="p-2 rounded-xl bg-card/60 border border-border/60 space-y-1 hover:border-primary/30 transition-all text-left"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full border ${v.badgeColor}`}>
                                {v.badge}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => speakJapaneseText(v.ja, { rate: 0.92 })}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                                  title="Nghe phát âm mẫu"
                                >
                                  <Volume2 className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(v.ja)}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                                  title="Sao chép câu"
                                >
                                  {copiedText === v.ja ? (
                                    <Check className="h-3 w-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </div>

                            <p className="font-jp text-xs font-semibold text-foreground leading-snug">
                              {v.ja}
                            </p>
                            <p className="text-[10px] text-muted-foreground leading-tight">
                              {v.vi}
                            </p>
                            <p className="text-[9.5px] text-primary/80 italic font-mono">
                              💡 {v.nuance}
                            </p>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Coaching Feedback Hint if present in assistant turn */}
              {!isUser && turn.feedback_hint && (
                <div className="mt-2.5 pt-2 border-t border-primary/20 text-[11px] bg-primary/5 p-2 rounded-lg text-primary space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-primary">
                    <Sparkles className="h-3 w-3" />
                    <span>Coaching Tip (アドバイス)</span>
                  </div>
                  <p className="text-foreground leading-snug">{turn.feedback_hint}</p>
                </div>
              )}

              {/* Action Bar for Assistant Turns */}
              {!isUser && (
                <div className="mt-2 pt-1.5 flex items-center justify-between border-t border-border/60 text-[10px] text-muted-foreground flex-wrap gap-1.5">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold inline-flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" />
                      <span>✨ AI Realtime ({turn.ai_model || "gemini"})</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => speakJapaneseText(turn.transcript, { rate: 0.82 })}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors py-0.5 px-1.5 rounded hover:bg-muted"
                      title="Nghe tốc độ chậm (0.82x)"
                    >
                      <span>🐢 0.8x</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playFurin();
                        speakJapaneseText(turn.transcript, { rate: 0.95 });
                      }}
                      className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors py-0.5 px-1.5 rounded hover:bg-primary/10 font-bold"
                      title="Luyện Shadowing nhại giọng theo câu của AI"
                    >
                      <Sparkles className="h-3 w-3 text-primary" />
                      <span>🗣️ Shadowing</span>
                    </button>

                    {onReplayVoice && (
                      <button
                        type="button"
                        onClick={() => onReplayVoice(turn.transcript)}
                        className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors py-0.5 px-1.5 rounded hover:bg-primary/10"
                        title="Nghe lại giọng gốc"
                      >
                        <Volume2 className="h-3 w-3" />
                        <span>Nghe lại</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Live Interim State Bubbles */}
      {isUserSpeaking && (
        <div className="flex flex-col items-end space-y-1.5 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold px-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>You (Đang nói...)</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-foreground rounded-tr-none flex flex-col gap-1.5 shadow-sm max-w-[85%]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-emerald-400 font-medium flex items-center gap-1.5 text-[11px]">
                <Mic className="h-3 w-3 animate-pulse" />
                <span>Đang nghe giọng bạn nói tiếng Nhật...</span>
              </span>
              <span className="flex gap-0.5 items-center">
                <span className="h-1.5 w-1 bg-emerald-400 rounded animate-bounce" />
                <span className="h-2.5 w-1 bg-emerald-400 rounded animate-bounce delay-100" />
                <span className="h-1.5 w-1 bg-emerald-400 rounded animate-bounce delay-200" />
              </span>
            </div>
            {interimTranscript && (
              <p className="font-jp text-foreground bg-emerald-500/15 border border-emerald-500/25 p-2 rounded-xl text-xs font-semibold leading-relaxed">
                {interimTranscript}
              </p>
            )}
          </div>
        </div>
      )}

      {state === "processing_stt" && (
        <div className="flex flex-col items-end space-y-1.5 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold px-1">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span>Faster-Whisper ({sttModel})</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-foreground rounded-tr-none flex items-center gap-2 shadow-sm">
            <Zap className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span className="text-amber-400 font-medium">⚡ Đang chuyển giọng nói thành văn bản tiếng Nhật...</span>
          </div>
        </div>
      )}

      {state === "ai_thinking" && (
        <div className="flex flex-col items-start space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 text-[10px] text-primary font-bold px-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span>{personaName}</span>
            <span className="text-[9px] font-jp text-primary/70 font-mono">(思考中...)</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-card/95 border border-primary/30 text-xs text-foreground rounded-tl-none shadow-md shadow-primary/5 space-y-2 max-w-[85%] sm:max-w-[70%] washi-texture">
            <div className="flex items-center gap-2 text-primary font-medium text-[11px]">
              <Sparkles className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>AI đang phân tích ngữ cảnh & suy nghĩ phản hồi...</span>
              <span className="flex items-center gap-1 ml-auto">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse delay-150" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse delay-300" />
              </span>
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="h-2.5 w-4/5 rounded bg-primary/15 animate-pulse" />
              <div className="h-2.5 w-3/5 rounded bg-primary/10 animate-pulse delay-75" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
