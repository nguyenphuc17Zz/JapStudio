"use client";

import React, { useState, useRef, useEffect } from "react";
import { Volume2, CheckCircle2, XCircle, Eye, EyeOff, Mic, Clock, Trophy, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import type { FidelityItem, InterpretResult, InterpretExercise } from "../services/interpret-api";

export function FidelityMap({ items }: { items: FidelityItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((f, i) => (
        <span key={i} title={f.evidence} className={cn("rounded-lg border px-2 py-1 text-xs", f.hit ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700" : "border-red-500/40 bg-red-500/10 text-red-600")}>
          {f.hit ? "✓ " : "✗ "}{f.idea_vi}
        </span>
      ))}
    </div>
  );
}

const FLAG_LABEL: Record<string, string> = {
  watashi_overuse: "Lạm dụng 私は",
  svo_carryover: "Trật tự SVO kiểu Việt",
  missing_particle: "Thiếu trợ từ",
  desu_overuse_casual: "です/ます thừa với bạn bè",
  literal_roi_ma_thi: "Dịch逐字 rồi/mà/thì",
};

interface InterpretResultCardProps {
  result: InterpretResult | null;
  exercise?: InterpretExercise | null;
  isPending?: boolean;
  liveTranscript?: string;
  onNext: () => void;
  autoNext: boolean;
  onCancelAutoNext?: () => void;
  onRetry?: () => void;
}

export function InterpretResultCard({ result, exercise, isPending = false, liveTranscript = "", onNext, autoNext, onCancelAutoNext, onRetry }: InterpretResultCardProps) {
  const [replaying, setReplaying] = useState(false);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const handlePlayModelTTSRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key.toLowerCase() === "a" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        e.stopImmediatePropagation();
        handlePlayModelTTSRef.current?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isPerfect = result?.isPerfect ?? false;
  const isTimeout = result?.timedOut ?? false;
  const isCorrect = result?.success ?? false;
  const canonicalDisplay =
    result?.referenceJa ||
    exercise?.referenceJa ||
    (exercise as any)?.extra_metadata?.interpret_config?.reference_ja ||
    "";
  // Model audio text: ALWAYS model answer, NEVER user's transcript!
  const ttsText = canonicalDisplay;

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
        <p className="font-jp text-2xl text-muted-foreground/60">通訳</p>
        <p className="text-xs text-muted-foreground">Dịch giữ đủ ý — kết quả và fidelity map sẽ hiện ở đây</p>
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

  const a = (result?.assessment as any) || {};
  const dims = [
    { k: "fidelity", label: "Giữ ý", v: a.fidelity },
    { k: "word_order", label: "Trật tự", v: a.word_order },
    { k: "naturalness", label: "Tự nhiên", v: a.naturalness },
    { k: "fluency", label: "Trôi chảy", v: a.fluency },
  ];

  return (
    <div className={cn("rounded-3xl border p-3 sm:p-3.5 shadow-lg transition-all animate-in fade-in zoom-in-95 duration-200 washi-texture h-full flex flex-col justify-between overflow-hidden gap-2", statusConfig.borderClass)}>
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
          {ttsText && (
            <button type="button" onClick={handlePlayModelTTS} className="p-1 px-2 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 shrink-0 shadow-2xs transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer whitespace-nowrap" title="Nghe mẫu (A)">
              <Volume2 className={cn("h-3 w-3 shrink-0", isTTSPlaying && "animate-bounce")} />
              <span>{isTTSPlaying ? "Đang đọc..." : "Nghe mẫu"}</span>
              <kbd className="text-[9px] font-mono px-1 rounded bg-primary/15 border border-primary/25 text-primary font-bold ml-0.5">A</kbd>
            </button>
          )}
        </div>
      </div>

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
            <button onClick={replayMine} className="flex items-center gap-1 shrink-0 text-xs text-primary hover:underline cursor-pointer" title="Nghe lại câu mình">
              <Volume2 className={cn("h-3.5 w-3.5", replaying && "animate-pulse")} /> {replaying ? "Dừng" : "Nghe lại"}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col justify-between rounded-2xl bg-primary/[0.02] dark:bg-primary/[0.04] border border-primary/20 p-2.5 sm:p-3 relative overflow-hidden transition-all duration-300">
        <div className="flex flex-col justify-center h-full gap-1.5 text-center">
          <p className="text-[11px] font-black uppercase tracking-wider text-primary flex items-center justify-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-amber-500" /><span>Đáp án mẫu bản xứ:</span></p>
          <div className="text-base sm:text-lg font-black font-jp text-primary tracking-tight leading-snug"><UniversalFurigana text={canonicalDisplay} fontSize="lg" /></div>
          <div className="mt-1 flex justify-center"><FidelityMap items={isPending ? ((exercise as any)?.expectedJaKeywords?.map((k: string) => ({ idea_vi: k, hit: false, evidence: "" })) || []) : result?.fidelityMap || []} /></div>
        </div>
      </div>

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

      {!isPending && result ? (
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          <Button size="md" variant="akane" className="flex-1 font-black text-xs sm:text-sm h-10 rounded-xl gap-1.5 shadow-md bg-gradient-to-r from-blue-600 via-primary to-indigo-600 text-white ring-2 ring-primary/25 whitespace-nowrap shrink-0" onClick={() => { stopWebSpeech(); onNext?.(); }}><span>Câu Tiếp Theo</span><kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20 text-white font-bold">Space / ↵</kbd></Button>
          <Button size="md" variant="outline" className="h-10 px-3 rounded-xl gap-1 font-bold text-xs border-border whitespace-nowrap shrink-0" onClick={() => { stopWebSpeech(); onRetry?.(); }}><RotateCcw className="h-3.5 w-3.5 shrink-0" /><span>Làm lại</span><kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground font-bold ml-0.5">R</kbd></Button>
        </div>
      ) : isPending ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground p-2 rounded-xl bg-muted/30 border border-border/60 shrink-0 gap-2">
          <span className="flex items-center gap-1.5 font-medium text-[11px] whitespace-nowrap overflow-hidden text-ellipsis"><Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" /><span>Nói xong bấm <strong>Nộp</strong> hoặc <strong>Enter</strong></span></span>
        </div>
      ) : null}
      {!isPending && result?.feedback && <p className="text-xs leading-relaxed text-muted-foreground px-1 line-clamp-2">{result.feedback}</p>}
      {result?.vietglishFlags && result.vietglishFlags.length > 0 && !isPending && (
        <div className="flex flex-wrap gap-1.5">
          {result.vietglishFlags.map((f: string) => (
            <span key={f} className="rounded-full bg-red-500/10 border border-red-500/30 px-2.5 py-0.5 text-xs text-red-600">⚠ {FLAG_LABEL[f] || f}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export function InterpretSummary({ results, onRestart, onToPlan }: { results: InterpretResult[]; onRestart?: () => void; onToPlan?: () => void }) {
  const total = results.length;
  const ok = results.filter((r) => r.success).length;
  const acc = total ? Math.round((ok / total) * 100) : 0;
  const vglish = results.filter((r) => r.vietglishFlags && r.vietglishFlags.length > 0).length;
  if (!total) return null;
  const grade =
    acc >= 90
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
          <h2 className="text-lg font-extrabold">Tổng kết buổi phiên dịch</h2>
          <p className="text-sm text-muted-foreground">{ok}/{total} câu thành công · {grade.label}</p>
        </div>
        <div className={cn("hanko-badge shrink-0 self-start sm:self-center px-4 py-2 rounded-2xl border-2 rotate-[-4deg] text-center shadow-sm", grade.color)}>
          <div className="text-[10px] font-extrabold tracking-widest uppercase">HANKO STAMP</div>
          <div className="text-sm font-black font-jp">{grade.stamp}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-muted/50 px-3 py-2"><p className="text-[11px] text-muted-foreground">Thành công</p><p className="text-sm font-extrabold">{ok}/{total}</p></div>
        <div className="rounded-xl bg-muted/50 px-3 py-2"><p className="text-[11px] text-muted-foreground">Vietglish</p><p className="text-sm font-extrabold">{vglish} lượt</p></div>
        <div className="rounded-xl bg-muted/50 px-3 py-2"><p className="text-[11px] text-muted-foreground">Perfect</p><p className="text-sm font-extrabold">{results.filter((r) => r.isPerfect).length}</p></div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onRestart} className="flex-1 font-bold">Dịch tiếp</Button>
        <Button onClick={onToPlan} variant="outline" className="flex-1 font-semibold">Về kế hoạch học</Button>
      </div>
    </div>
  );
}
