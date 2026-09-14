"use client";

import React, { useState, useRef, useEffect } from "react";
import { Volume2, CheckCircle2, XCircle, Eye, EyeOff, Mic, Clock, Trophy, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import type { AizuchiResult } from "../services/aizuchi-api";
import type { AizuchiExercise } from "../services/aizuchi-api";

const VARIETY_SLOTS = [
  { key: "surprise", ja: "へー", label: "Ngạc nhiên" },
  { key: "empathy", ja: "確かに", label: "Đồng cảm" },
  { key: "continuer", ja: "うんうん", label: "Giữ mạch" },
  { key: "followup", ja: "それで？", label: "Đẩy chuyện" },
  { key: "polite_interrupt", ja: "すみません", label: "Chen lịch sự" },
];

export function WindowLight({ state, remainingMs, totalMs }: { state: "idle" | "normal" | "warning" | "critical"; remainingMs: number; totalMs: number }) {
  const color =
    state === "idle" ? "bg-muted" : state === "normal" ? "bg-emerald-500" : state === "warning" ? "bg-amber-500" : "bg-red-500";
  const glow =
    state === "normal" ? "shadow-[0_0_24px_rgba(16,185,129,0.7)]" : state === "warning" ? "shadow-[0_0_24px_rgba(245,158,11,0.7)]" : state === "critical" ? "shadow-[0_0_24px_rgba(239,68,68,0.8)] animate-pulse" : "";
  return (
    <div className="flex items-center gap-3">
      <span className={cn("h-5 w-5 rounded-full transition-colors", color, glow)} aria-label={state === "normal" ? "Nói ngay!" : state === "idle" ? "Chờ NPC" : "Sắp hết giờ"} />
      <div className="flex-1">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-[width] duration-75", color)} style={{ width: (totalMs > 0 ? Math.max(0, Math.min(100, (remainingMs / totalMs) * 100)) : 0) + "%" }} />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{state === "idle" ? "Đang nghe NPC..." : state === "normal" ? "Đèn xanh — chêm ngay!" : `${(remainingMs / 1000).toFixed(1)}s còn lại`}</p>
      </div>
    </div>
  );
}

export function VarietyMap({ used }: { used: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {VARIETY_SLOTS.map((s) => {
        const on = used.includes(s.key);
        return (
          <span key={s.key} title={s.label} className={cn("rounded-full border px-2.5 py-1 text-xs font-jp", on ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-border text-muted-foreground opacity-60")}>
            {on ? "✓ " : ""}{s.ja}
          </span>
        );
      })}
    </div>
  );
}

interface AizuchiResultCardProps {
  result: AizuchiResult | null;
  exercise?: AizuchiExercise | null;
  isPending?: boolean;
  liveTranscript?: string;
  onNext: () => void;
  autoNext: boolean;
  onCancelAutoNext?: () => void;
  onRetry?: () => void;
  onSkip?: () => void;
}

export function AizuchiResultCard({ result, exercise, isPending = false, liveTranscript = "", onNext, autoNext, onCancelAutoNext, onRetry, onSkip }: AizuchiResultCardProps) {
  const [replaying, setReplaying] = useState(false);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const handlePlayModelTTSRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setIsRevealed(false);
  }, [exercise?.id]);

  // V/A keyboard parity (like ReflexResultCard)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key.toLowerCase() === "v" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isPending) {
          e.preventDefault();
          soundFX.playFurin();
          setIsRevealed((p) => !p);
        }
      } else if (e.key.toLowerCase() === "a" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        e.stopImmediatePropagation();
        handlePlayModelTTSRef.current?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPending]);

  const isBlurred = isPending && !isRevealed;
  const isPerfect = result?.isPerfect ?? false;
  const isTimeout = result?.timedOut ?? false;
  const isCorrect = result?.success ?? false;

  // Determine current turn samples (sample bản xứ tiếng Nhật)
  const currentTurnIndex = result?.turnIndex ?? 0;
  const currentTurn = exercise?.npcTurns?.[currentTurnIndex] || exercise?.npcTurns?.[0];
  const sampleList: string[] =
    (result?.sampleResponses && result.sampleResponses.length > 0 ? result.sampleResponses : null) ||
    (currentTurn?.sample_responses && currentTurn.sample_responses.length > 0 ? currentTurn.sample_responses : null) ||
    (exercise?.sampleResponses && exercise.sampleResponses.length > 0 ? exercise.sampleResponses : null) ||
    (exercise?.relation === "business_polite"
      ? ["はい、かしこまりました", "さようでございますか", "なるほど"]
      : ["へー、マジで！？", "確かに、そうだね", "それで？"]);

  const canonicalSamples = sampleList.join("  ／  ");
  // Model audio text: ALWAYS play native model sample, NEVER user's transcript!
  const modelTtsText = sampleList[0] || (exercise?.relation === "business_polite" ? "はい、かしこまりました" : "へー、そうなんだ");
  const ttsText = modelTtsText;

  // Auto-play model answer 200ms after result
  useEffect(() => {
    if (isPending || !ttsText || !result) return;
    setIsTTSPlaying(true);
    const timer = setTimeout(() => {
      speakJapaneseText(ttsText, { rate: 0.95, onEnd: () => setIsTTSPlaying(false), onError: () => setIsTTSPlaying(false) });
    }, 200);
    return () => {
      clearTimeout(timer);
      stopWebSpeech();
    };
  }, [ttsText, isPending, result]);

  const handlePlayModelTTS = () => {
    onCancelAutoNext?.();
    if (!ttsText) return;
    if (isTTSPlaying) {
      stopWebSpeech();
      setIsTTSPlaying(false);
      return;
    }
    setIsTTSPlaying(true);
    speakJapaneseText(ttsText, { rate: 0.95, onEnd: () => setIsTTSPlaying(false), onError: () => setIsTTSPlaying(false) });
  };
  handlePlayModelTTSRef.current = handlePlayModelTTS;

  const replayMine = () => {
    if (!result?.transcript) return;
    try {
      if (replaying) {
        stopWebSpeech();
        setReplaying(false);
        return;
      }
      setReplaying(true);
      speakJapaneseText(result.transcript, { rate: 0.95, onEnd: () => setReplaying(false), onError: () => setReplaying(false) });
    } catch {}
  };

  if (!result && !isPending) {
    return (
      <div className="h-full min-h-[280px] flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border/80 bg-card/50 p-6 text-center">
        <p className="font-jp text-2xl text-muted-foreground/60">相づち</p>
        <p className="text-xs text-muted-foreground">Chêm vào khoảng lặng — kết quả sẽ hiện ở đây</p>
      </div>
    );
  }

  const statusConfig = isPending
    ? { label: "ĐÁP ÁN MẪU & CHỈ TIÊU", icon: <Sparkles className="h-4 w-4 text-primary animate-pulse" />, badgeClass: "bg-primary/10 text-primary font-bold border-primary/30", borderClass: "border-border/80 bg-card/90 dark:bg-[#111622]/90", scoreColor: "text-primary" }
    : isTimeout
    ? { label: "HẾT GIỜ", icon: <Clock className="h-4 w-4" />, badgeClass: "bg-muted text-muted-foreground border-border", borderClass: "border-border/80 bg-muted/20", scoreColor: "text-muted-foreground" }
    : isPerfect
    ? { label: "HOÀN HẢO", icon: <Trophy className="h-4 w-4 text-amber-300" />, badgeClass: "bg-amber-500 text-sumi-950 font-black border-amber-400 shadow-md shadow-amber-500/20", borderClass: "border-amber-500/40 bg-amber-500/8", scoreColor: "text-amber-600" }
    : isCorrect
    ? { label: "CHÍNH XÁC", icon: <CheckCircle2 className="h-4 w-4" />, badgeClass: "bg-emerald-600 text-white font-bold border-emerald-500", borderClass: "border-emerald-500/30 bg-emerald-500/8", scoreColor: "text-emerald-600" }
    : { label: "CẦN CỐ GẮNG", icon: <XCircle className="h-4 w-4" />, badgeClass: "bg-rose-600 text-white font-bold border-rose-500", borderClass: "border-rose-500/30 bg-rose-500/8", scoreColor: "text-rose-600" };

  const a = result?.assessment || {};
  const dims = [
    { k: "timing", label: "Timing", v: (a as any).timing },
    { k: "variety", label: "Đa dạng", v: (a as any).variety },
    { k: "appropriateness", label: "Phù hợp", v: (a as any).appropriateness },
    { k: "manner", label: "Thái độ", v: (a as any).manner },
  ];

  return (
    <div className={cn("rounded-3xl border p-3 sm:p-3.5 shadow-lg transition-all animate-in fade-in zoom-in-95 duration-200 washi-texture h-full flex flex-col justify-between overflow-hidden gap-2", statusConfig.borderClass)}>
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 shrink-0 pb-1 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-2xs whitespace-nowrap shrink-0", statusConfig.badgeClass)}>
            {statusConfig.icon}
            <span>{statusConfig.label}</span>
          </span>
          {!isPending && result?.score != null && (
            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-black border shadow-2xs whitespace-nowrap shrink-0", statusConfig.badgeClass)}>
              <span>{result.score.toFixed(0)}</span>
              <span className="text-[10px] font-normal opacity-80">/100</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!isPending && result?.reactionLatencyMs != null ? (
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-muted/60 border border-border/60 shrink-0">
              <Clock className="h-3 w-3 text-amber-500" />
              <span>{Math.round(result.reactionLatencyMs)}ms</span>
            </div>
          ) : isPending ? (
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground px-2 py-0.5 rounded-full bg-muted/40 border border-border/40 shrink-0">
              <Clock className="h-3 w-3 text-primary animate-pulse" />
              <span>Chờ chêm...</span>
            </div>
          ) : null}
          {isPending && (
            <button type="button" onClick={() => setIsRevealed((v) => !v)} className="text-[10px] px-2 py-0.5 rounded-full bg-card/80 border border-primary/30 text-primary font-bold hover:bg-primary/10 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-2xs" title={isRevealed ? "Làm mờ (V)" : "Xem trước (V)"}>
              {isRevealed ? <><EyeOff className="h-3 w-3 shrink-0" /><span>Mờ</span><kbd className="text-[9px] font-mono px-1 rounded bg-primary/10 border border-primary/25 font-bold">V</kbd></> : <><Eye className="h-3 w-3 shrink-0" /><span>Xem</span><kbd className="text-[9px] font-mono px-1 rounded bg-primary/10 border border-primary/25 font-bold">V</kbd></>}
            </button>
          )}
          {ttsText && (
            <button type="button" onClick={handlePlayModelTTS} className="p-1 px-2 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 shrink-0 shadow-2xs transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer whitespace-nowrap" title="Nghe mẫu (A)">
              <Volume2 className={cn("h-3 w-3 shrink-0", isTTSPlaying && "animate-bounce")} />
              <span>{isTTSPlaying ? "Đang đọc..." : "Nghe mẫu"}</span>
              <kbd className="text-[9px] font-mono px-1 rounded bg-primary/15 border border-primary/25 text-primary font-bold ml-0.5">A</kbd>
            </button>
          )}
        </div>
      </div>

      {/* User strip */}
      <div className="px-3 py-2 rounded-2xl bg-card/90 dark:bg-black/30 border border-border/80 shadow-2xs flex items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="p-1 rounded-md bg-primary/10 text-primary"><Mic className="h-3.5 w-3.5" /></span>
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground hidden sm:inline">{isPending ? "Bạn nói" : "Bạn đã nói"}:</span>
        </div>
        <div className="flex-1 min-w-0 px-1 text-left">
          {isPending ? (
            liveTranscript ? <span className="text-sm sm:text-base font-bold font-jp text-foreground block truncate"><UniversalFurigana text={liveTranscript} fontSize="sm" /></span> : <span className="text-xs text-muted-foreground italic font-sans flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary animate-ping shrink-0" />Đang lắng nghe...</span>
          ) : result?.transcript ? <span className="text-sm sm:text-base font-bold font-jp text-foreground block truncate"><UniversalFurigana text={result.transcript} fontSize="sm" /></span> : <span className="text-xs text-muted-foreground italic">{isTimeout ? "Hết giờ" : "Không có âm thanh"}</span>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!isPending && (result as any)?.isWhisperRescued && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30 font-bold shrink-0">Whisper AI</span>}
          {result?.transcript && !isPending && (
            <button onClick={replayMine} className="flex items-center gap-1 shrink-0 text-xs text-primary hover:underline" title="Nghe lại câu mình">
              <Volume2 className={cn("h-3.5 w-3.5", replaying && "animate-pulse")} /> {replaying ? "Dừng" : "Nghe lại"}
            </button>
          )}
        </div>
      </div>

      {/* Model deck */}
      <div className={cn("flex-1 min-h-0 flex flex-col justify-between rounded-2xl bg-primary/[0.02] dark:bg-primary/[0.04] border border-primary/20 p-2.5 sm:p-3 relative overflow-hidden transition-all duration-300", isBlurred && "filter blur-sm select-none pointer-events-none")}>
        <div className="flex flex-col justify-center h-full gap-1.5 text-center">
          <p className="text-[11px] font-black uppercase tracking-wider text-primary flex items-center justify-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-amber-500" /><span>Mẫu aizuchi bản xứ:</span></p>
          <div className="text-base sm:text-lg font-black font-jp text-primary tracking-tight leading-snug"><UniversalFurigana text={canonicalSamples} fontSize="lg" /></div>
          <p className="text-[11px] text-muted-foreground">
            {currentTurn?.expected_types?.length
              ? `Sắc thái phù hợp: ${currentTurn.expected_types.map((t: string) => ({ surprise: "Ngạc nhiên", empathy: "Đồng cảm", continuer: "Giữ mạch", followup: "Hỏi dồn", polite_interrupt: "Chen lịch sự" }[t] || t)).join(", ")}`
              : "Chọn 1 câu phù hợp với lời kể của NPC"}
          </p>
        </div>
        {isBlurred && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/60 backdrop-blur-[2px] rounded-2xl">
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5 font-bold border-primary/30 text-primary" onClick={() => setIsRevealed(true)}>
              <Eye className="h-4 w-4" /> Xem trước đáp án <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 border border-primary/25 font-bold">V</kbd>
            </Button>
          </div>
        )}
      </div>

      {/* Assessment strip */}
      {!isPending && result?.assessment && (
        <div className="flex items-center justify-between gap-1 px-2.5 py-1 rounded-xl bg-card/80 dark:bg-black/30 border border-border/70 shadow-2xs shrink-0">
          {dims.map((d) => (
            <div key={d.k} className="flex-1 flex items-center justify-center gap-1 min-w-0 text-[11px] font-bold">
              <span className="text-[10px] text-muted-foreground font-medium truncate">{d.label}</span>
              <span className="font-mono font-black">{d.v?.score != null ? Math.round(d.v.score) : "—"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {!isPending && result ? (
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          <Button size="md" variant="akane" className="flex-1 font-black text-xs sm:text-sm h-10 rounded-xl gap-1.5 shadow-md bg-gradient-to-r from-blue-600 via-primary to-indigo-600 text-white ring-2 ring-primary/25 whitespace-nowrap shrink-0" onClick={() => { stopWebSpeech(); onNext?.(); }}><span>Turn Tiếp Theo</span><kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20 text-white font-bold">Space / ↵</kbd></Button>
          <Button size="md" variant="outline" className="h-10 px-3 rounded-xl gap-1 font-bold text-xs border-border whitespace-nowrap shrink-0" onClick={() => { stopWebSpeech(); onRetry?.(); }}><RotateCcw className="h-3.5 w-3.5 shrink-0" /><span>Làm lại</span><kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground font-bold ml-0.5">R</kbd></Button>
        </div>
      ) : isPending ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground p-2 rounded-xl bg-muted/30 border border-border/60 shrink-0 gap-2">
          <span className="flex items-center gap-1.5 font-medium text-[11px] whitespace-nowrap overflow-hidden text-ellipsis"><Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" /><span>Nói xong bấm <strong>Nộp</strong> hoặc <strong>Enter</strong></span></span>
        </div>
      ) : null}
      {!isPending && result?.feedback && <p className="text-xs leading-relaxed text-muted-foreground px-1 line-clamp-2">{result.feedback}</p>}
    </div>
  );
}

export function AizuchiSummary({
  results,
  onRestart,
  onToPlan,
}: {
  results: AizuchiResult[];
  onRestart?: () => void;
  onToPlan?: () => void;
}) {
  const total = results.length;
  const ok = results.filter((r) => r.success).length;
  const acc = total ? Math.round((ok / total) * 100) : 0;
  const lats = results.map((r) => r.reactionLatencyMs).filter((v): v is number => v !== null && v !== undefined).sort((x, y) => x - y);
  const p50 = lats.length ? Math.round(lats[Math.floor(lats.length / 2)]) : null;
  const types = Array.from(new Set(results.map((r) => r.bcType).filter(Boolean)));
  if (!total) return null;
  const grade =
    acc >= 90 && (p50 == null || p50 < 450)
      ? { text: "S", label: "Xuất sắc", stamp: "最高", color: "text-amber-500 border-amber-500 bg-amber-500/10" }
      : acc >= 75
      ? { text: "A", label: "Rất tốt", stamp: "上手", color: "text-emerald-600 border-emerald-600 bg-emerald-500/10" }
      : acc >= 50
      ? { text: "B", label: "Đạt yêu cầu", stamp: "合格", color: "text-sky-600 border-sky-600 bg-sky-500/10" }
      : { text: "C", label: "Cần rèn thêm", stamp: "頑張れ", color: "text-rose-600 border-rose-600 bg-rose-500/10" };
  return (
    <div className="p-6 md:p-8 rounded-3xl border border-border bg-card washi-texture shadow-lg space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold">Tổng kết buổi luyện</h2>
          <p className="text-sm text-muted-foreground">{ok}/{total} turn thành công · {grade.label}</p>
        </div>
        <div className={cn("hanko-badge shrink-0 self-start sm:self-center px-4 py-2 rounded-2xl border-2 rotate-[-4deg] text-center shadow-sm", grade.color)}>
          <div className="text-[10px] font-extrabold tracking-widest uppercase">HANKO STAMP</div>
          <div className="text-sm font-black font-jp">{grade.stamp}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl bg-muted/50 px-3 py-2"><p className="text-[11px] text-muted-foreground">Thành công</p><p className="text-sm font-extrabold">{ok}/{total}</p></div>
        <div className="rounded-xl bg-muted/50 px-3 py-2"><p className="text-[11px] text-muted-foreground">p50 latency</p><p className="text-sm font-extrabold">{p50 !== null ? `${p50}ms` : "—"}</p></div>
        <div className="rounded-xl bg-muted/50 px-3 py-2"><p className="text-[11px] text-muted-foreground">Đa dạng</p><p className="text-sm font-extrabold">{types.length} loại</p></div>
        <div className="rounded-xl bg-muted/50 px-3 py-2"><p className="text-[11px] text-muted-foreground">Miss</p><p className="text-sm font-extrabold">{results.filter((r) => r.timedOut).length}</p></div>
      </div>
      <div className="mt-3"><VarietyMap used={types as string[]} /></div>
      <div className="flex gap-2">
        <Button onClick={onRestart} className="flex-1 font-bold">Luyện tiếp</Button>
        <Button onClick={onToPlan} variant="outline" className="flex-1 font-semibold">Về kế hoạch học</Button>
      </div>
    </div>
  );
}
