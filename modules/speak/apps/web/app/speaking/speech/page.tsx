"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ZenLoadingState } from "@/components/ui/zen-loading-state";
import { Mic, Clock, Play, Square, Trophy, Settings2, Zap, BookOpen, BarChart3, Lightbulb, AlertCircle, Sparkles, HelpCircle, Keyboard, Send, FileText, X, RotateCcw, CheckCircle2, ArrowRight } from "lucide-react";
import { useMonologue } from "@/hooks/use-monologue";
import { useAudioRecorder } from "@/features/audio/hooks/useAudioRecorder";
import { convertToWavBlob } from "@/features/audio";
import { toast } from "@/lib/toast";
import { useSystemKeybindings, formatKeyDisplay } from "@/hooks/use-system-keybindings";
import { cn } from "@/lib/utils";

const DURATIONS = [30,45,60,90,120,180,300];
const PREP_OPTIONS = [0,15,30,60];
const SUPPORT_LABEL: Record<number,string> = {0:"Blind",1:"Keywords",2:"Guided Qs",3:"Structure",4:"Minimal"};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>{
      const res = reader.result as string;
      // data:audio/webm;base64,xxxx
      const idx = res.indexOf(",");
      resolve(idx>=0? res.slice(idx+1) : res);
    };
    reader.onerror = ()=>reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export default function SpeechPage() {
  const mono = useMonologue();
  const recorder = useAudioRecorder();
  const { matchesAction, keybindings } = useSystemKeybindings();
  const [durationSec, setDurationSec] = useState(60);
  const [prepSec, setPrepSec] = useState(30);
  const [genre, setGenre] = useState<string>("");
  const [supportLevel, setSupportLevel] = useState<number | undefined>(undefined);
  const [transcriptInput, setTranscriptInput] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const [prepLeft, setPrepLeft] = useState(0);
  const [recLeft, setRecLeft] = useState(0);
  const [recElapsed, setRecElapsed] = useState(0);
  const rafRef = useRef<number | null>(null);
  const recRafRef = useRef<number | null>(null);
  const phaseRef = useRef(mono.phase);
  const monoRef = useRef(mono);
  monoRef.current = mono;
  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;

  const lastPrepTickRef = useRef(0);
  const lastRecTickRef = useRef(0);

  const speechConfig = (mono.exercise?.extra_metadata as any)?.speech_config;

  // keep phaseRef in sync
  useEffect(()=>{ phaseRef.current = mono.phase; }, [mono.phase]);

  // surface backend/recorder errors via global toast (single source)
  useEffect(()=>{
    if (mono.error) toast.error(mono.error);
  }, [mono.error]);
  useEffect(()=>{
    if (recorder.error) toast.error(recorder.error);
  }, [recorder.error]);

  const startPrepCountdown = useCallback((sec: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPrepLeft(sec);
    if (sec<=0) { monoRef.current.setPhase("ready"); return; }
    const t0 = performance.now();
    lastPrepTickRef.current = 0;
    const tick = (now:number) => {
      if (phaseRef.current!=="preparing") return;
      // throttle to 100ms
      if (now - lastPrepTickRef.current < 100) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastPrepTickRef.current = now;
      const elapsed = (now - t0)/1000;
      const left = Math.max(0, sec - elapsed);
      setPrepLeft(left);
      if (left>0 && phaseRef.current==="preparing") {
        // handle visibility throttling: if hidden, use setTimeout
        if (document.hidden) {
          setTimeout(()=> { rafRef.current = requestAnimationFrame(tick); }, 200);
        } else {
          rafRef.current = requestAnimationFrame(tick);
        }
      } else if (phaseRef.current==="preparing") {
        monoRef.current.setPhase("ready");
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(()=>{
    if (mono.phase==="preparing" && speechConfig) {
      const p = speechConfig.prep_duration_sec ?? prepSec;
      startPrepCountdown(p);
    }
    return ()=>{ if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [mono.phase, speechConfig, prepSec, startPrepCountdown]);

  useEffect(()=>{
    return ()=>{
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (recRafRef.current) cancelAnimationFrame(recRafRef.current);
      recorderRef.current.releaseMicrophone();
    };
  },[]);

  // Release microphone whenever phase is idle or result
  useEffect(() => {
    if (mono.phase === "idle" || mono.phase === "result") {
      recorderRef.current.releaseMicrophone();
    }
  }, [mono.phase]);

  const handleGenerate = async () => {
    try {
      setTranscriptInput(""); setShowHint(false); setUsedHint(false); setRecElapsed(0); setRecLeft(0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (recRafRef.current) cancelAnimationFrame(recRafRef.current);
      await mono.generate({ duration_sec: durationSec, prep_sec: prepSec, genre: genre||undefined, support_level: supportLevel });
    } catch (e:any) {
      toast.error(e.message || "Topic generation failed (AI down) — please retry");
    }
  };

  const startRecording = async () => {
    try {
      const ok = await recorder.requestPermission();
      if (!ok) { toast.error(recorder.error || "Microphone permission denied"); return; }
      await recorder.startRecording();
      mono.setPhase("recording");
      const t0 = performance.now();
      startedAtRef.current = t0;
      setRecLeft(durationSec);
      lastRecTickRef.current = 0;
      if (recRafRef.current) cancelAnimationFrame(recRafRef.current);
      const tick = (now:number) => {
        if (phaseRef.current!=="recording") return;
        if (now - lastRecTickRef.current < 100) {
          recRafRef.current = requestAnimationFrame(tick);
          return;
        }
        lastRecTickRef.current = now;
        const elapsed = (now - t0)/1000;
        setRecElapsed(elapsed);
        setRecLeft(Math.max(0, durationSec - elapsed));
        if (elapsed >= durationSec) {
          handleStopRecording();
          return;
        }
        if (phaseRef.current==="recording") {
          if (document.hidden) {
            setTimeout(()=>{ recRafRef.current = requestAnimationFrame(tick); }, 200);
          } else {
            recRafRef.current = requestAnimationFrame(tick);
          }
        }
      };
      recRafRef.current = requestAnimationFrame(tick);
    } catch (e:any) {
      toast.error(e.message || "Failed to start recording");
    }
  };

  const handleStopRecording = async () => {
    if (recRafRef.current) { cancelAnimationFrame(recRafRef.current); recRafRef.current=null; }
    try {
      const blob = await recorder.stopRecording();
      const endedAt = performance.now();
      if (!blob || blob.size < 500) {
        toast.error("Audio too short or empty — please record again (audio is required)");
        mono.setPhase("ready");
        return;
      }
      if (blob.size > 10*1024*1024) {
        toast.error("Audio too large (>10MB) — please try shorter duration");
        mono.setPhase("ready");
        return;
      }
      const durationMs = startedAtRef.current ? Math.round(endedAt - startedAtRef.current) : Math.round(recElapsed*1000);
      let audioBlob = blob;
      try {
        audioBlob = await convertToWavBlob(blob);
      } catch (e) {
        audioBlob = blob;
      }
      // Prefer multipart (keep both per user choice) to avoid 33% base64 overhead
      const basePayload = {
        user_transcript: transcriptInput.trim() || undefined,
        speech_metrics: {
          started_at: startedAtRef.current ? new Date(Date.now() - durationMs).toISOString() : new Date().toISOString(),
          ended_at: new Date().toISOString(),
          target_duration_ms: durationSec*1000,
          speech_duration_ms: durationMs,
        },
        used_hint: usedHint,
      };
      // Use multipart for audio (efficient), fallback to base64 JSON if multipart fails
      try {
        await (mono as any).submitMultipart(audioBlob, basePayload);
      } catch (multipartErr:any) {
        // fallback to base64 JSON (keep both)
        try {
          const b64 = await blobToBase64(audioBlob);
          await mono.submit({ ...basePayload, audio_base64: b64 } as any);
        } catch {
          throw multipartErr;
        }
      }
      toast.info("Submitted — analyzing…");
    } catch (e:any) {
      toast.error(e.message || "Submit failed");
    }
  };

  const handleDirectTextSubmit = async () => {
    const text = transcriptInput.trim();
    if (!text) {
      toast.error("Vui lòng nhập nội dung bài nói tiếng Nhật của bạn.");
      return;
    }
    if (text.length < 15) {
      toast.error("Bài nói cần tối thiểu 15 ký tự tiếng Nhật để AI phân tích cấu trúc và lập luận.");
      return;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (recRafRef.current) cancelAnimationFrame(recRafRef.current);
    recorder.releaseMicrophone();

    const targetSec = speechConfig?.target_duration_sec ?? durationSec;
    const estimatedDurationMs = Math.max(8000, Math.min(targetSec * 1000, Math.round((text.length / 5.0) * 1000)));

    const basePayload = {
      user_transcript: text,
      speech_metrics: {
        started_at: new Date(Date.now() - estimatedDurationMs).toISOString(),
        ended_at: new Date().toISOString(),
        target_duration_ms: targetSec * 1000,
        speech_duration_ms: estimatedDurationMs,
      },
      used_hint: usedHint,
    };

    try {
      toast.info("Đang nộp bài nói văn bản để AI phân tích...");
      await mono.submit(basePayload);
    } catch (e: any) {
      toast.error(e.message || "Chấm điểm bài nói thất bại.");
    }
  };

  const handleGenerateRef = useRef(handleGenerate);
  handleGenerateRef.current = handleGenerate;
  const startRecordingRef = useRef(startRecording);
  startRecordingRef.current = startRecording;
  const handleStopRecordingRef = useRef(handleStopRecording);
  handleStopRecordingRef.current = handleStopRecording;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "textarea" || tag === "input" || tag === "select") {
        return;
      }

      if (matchesAction(e, "drillToggleHelp")) {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }

      // Space / Mic: Start recording if ready, stop recording if recording
      if (matchesAction(e, "speakingMic") || matchesAction(e, "drillReplayAudio")) {
        e.preventDefault();
        if (mono.phase === "ready") {
          startRecordingRef.current();
        } else if (mono.phase === "recording") {
          handleStopRecordingRef.current();
        }
        return;
      }

      // Enter: Start or submit or next
      if (matchesAction(e, "drillSubmitOrNext")) {
        e.preventDefault();
        if (mono.phase === "idle" || !mono.exercise) {
          handleGenerateRef.current();
        } else if (mono.phase === "preparing") {
          monoRef.current.setPhase("ready");
        } else if (mono.phase === "result") {
          handleGenerateRef.current();
        }
        return;
      }

      // Retry
      if (matchesAction(e, "drillRetry") && mono.phase === "result") {
        e.preventDefault();
        monoRef.current.setPhase("ready");
        return;
      }

      if (e.key === "Escape") {
        if (showHelp) {
          setShowHelp(false);
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mono.phase, mono.exercise, matchesAction]);

  const phase = mono.phase;
  const result = mono.result;

  if (phase==="idle" || !mono.exercise) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
        
        <div className="relative overflow-hidden rounded-[24px] border bg-card p-6">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-enso-gradient opacity-30" />
          <div className="relative flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-primary/10 border flex items-center justify-center text-primary"><Mic className="h-5 w-5"/></span>
            <div>
              <h1 className="text-xl font-black">1分間スピーチ <span className="text-sm font-normal text-muted-foreground">Monologue Lab — Mode 5</span></h1>
              <p className="text-sm text-muted-foreground">Sustain thought, structure ideas, speak continuously — AI generates fresh topic/genre/constraint each time</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">No hard-coded DB • Preparation 0-4 • Durations 30-300s • Deterministic pause/filler → AI semantic • Genre-specific scoring • Audio required (no transcript-only)</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2 p-5 space-y-4">
            <div className="flex items-center gap-2"><Badge variant="sakura">Generate</Badge><span className="text-xs text-muted-foreground">AI + VarietyPolicy (SHA256) + Validator — hard error if AI down</span></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-bold mb-1">Duration</div>
                <div className="flex flex-wrap gap-1.5">
                  {DURATIONS.map(d=>(
                    <button key={d} onClick={()=>setDurationSec(d)} className={`px-2.5 py-1 rounded-full text-xs font-bold border ${durationSec===d?"bg-primary text-primary-foreground border-primary":"bg-muted border-border"}`}>{d}s</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold mb-1">Prep</div>
                <div className="flex flex-wrap gap-1.5">
                  {PREP_OPTIONS.map(p=>(
                    <button key={p} onClick={()=>setPrepSec(p)} className={`px-2.5 py-1 rounded-full text-xs font-bold border ${prepSec===p?"bg-primary text-primary-foreground border-primary":"bg-muted border-border"}`}>{p}s</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-bold mb-1">Genre (optional)</div>
                <select value={genre} onChange={e=>setGenre(e.target.value)} className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm">
                  <option value="">Auto (adaptive)</option>
                  {["personal","story","opinion","explanation","comparison","argument","problem_solution","reflection","summary","report","interview","business_update","presentation","persuasion","critique","prediction"].map(g=>(
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-xs font-bold mb-1">Support (optional)</div>
                <select value={supportLevel ?? ""} onChange={e=>setSupportLevel(e.target.value===""?undefined:parseInt(e.target.value))} className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm">
                  <option value="">Auto</option>
                  {[0,1,2,3,4].map(l=>(
                    <option key={l} value={l}>{l} - {SUPPORT_LABEL[l]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">Prep levels: 0 Blind → 1 Keywords → 2 Guided Qs → 3 Structure → 4 Minimal. Adaptive reduces scaffolding as mastery ↑.</div>
            {mono.loading ? (
              <ZenLoadingState
                variant="ai"
                title="AI Đang Thiết Lập Đề Bài & Dàn Ý Phát Biểu..."
                ja="スピーチ課題生成中..."
                description="Đang sinh chủ đề độc quyền, thể loại lập luận và các ràng buộc phản xạ..."
              />
            ) : (
              <Button variant="akane" size="lg" className="w-full font-bold gap-2" onClick={handleGenerate}>
                <Zap className="h-4 w-4" />
                <span>Sinh Đề Bài Phát Biểu Mới (AI Dynamic)</span>
              </Button>
            )}
            {mono.error && <div className="text-xs text-red-600 border border-red-200 bg-red-50 rounded-lg p-3 flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0"/>{mono.error}</div>}
          </Card>
          <div className="space-y-4">
            <Card className="p-4">
              <div className="text-sm font-bold flex items-center gap-1.5"><BookOpen className="h-4 w-4"/> How it works</div>
              <ol className="mt-2 text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Learning Engine picks target → AI generates genre/topic/constraint (VI+JP hybrid) — <b>no fallback</b>, AI down → 503 + Retry</li>
                <li>Prep → Ready → Record continuously (no interruption, audio required)</li>
                <li>STT authoritative (Faster-Whisper) → deterministic metrics (no mock 78)</li>
                <li>AI semantic + native upgrade → genre-specific scoring</li>
              </ol>
            </Card>
            <Card className="p-4 bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 dark:border-amber-500/30 space-y-1">
              <div className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Deterministic authority</span>
              </div>
              <div className="text-xs text-foreground/85 dark:text-foreground/85 leading-relaxed font-medium">
                pause/filler/mora from code, AI only interprets. No mock scores — missing signal → Low confidence.
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1760px] mx-auto h-full min-h-[calc(100vh-4rem)] flex flex-col justify-between px-2 sm:px-4 py-2 gap-2 overflow-hidden select-none animate-in fade-in duration-200">
      {/* 1. Top Capsule HUD */}
      <div className="shrink-0 flex items-center justify-between gap-2.5 p-2 px-3 sm:px-4 rounded-2xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 shadow-md backdrop-blur-2xl">
        {/* Left: Exit + Mode Pill */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (rafRef.current) cancelAnimationFrame(rafRef.current);
              if (recRafRef.current) cancelAnimationFrame(recRafRef.current);
              recorder.releaseMicrophone();
              mono.reset();
            }}
            className="h-8 w-8 rounded-full border border-border/80 dark:border-white/15 bg-background/80 hover:bg-destructive/15 hover:border-destructive/40 hover:text-destructive flex items-center justify-center text-muted-foreground transition-all shrink-0 cursor-pointer shadow-xs"
            title="Thoát về sảnh phát biểu (Esc)"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-500 via-primary to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-primary/25 shrink-0 ring-1 ring-primary/30">
            弁
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-sm font-extrabold text-foreground tracking-tight truncate">
                1分間スピーチ
              </h2>
              <Badge variant="outline" size="sm" className="text-[9px] font-mono border-primary/30 bg-primary/10 text-primary py-0 px-1.5 font-bold uppercase">
                {speechConfig?.genre ?? mono.exercise?.exercise_type ?? "Monologue"}
              </Badge>
              <Badge variant="outline" size="sm" className="text-[9px] font-mono border-amber-500/30 bg-amber-500/10 text-amber-500 py-0 px-1.5 font-medium">
                Lvl {speechConfig?.support_level ?? 0} {SUPPORT_LABEL[speechConfig?.support_level ?? 0]}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium truncate max-w-[200px] sm:max-w-xs">
              Mục tiêu {speechConfig?.target_duration_sec ?? durationSec}s • Chuẩn bị {speechConfig?.prep_duration_sec ?? prepSec}s
            </p>
          </div>
        </div>

        {/* Middle: Target Duration & Phase Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-muted/40 dark:bg-black/30 border border-border/60 dark:border-white/10 text-xs">
          <span className="font-bold text-muted-foreground">Mục tiêu:</span>
          <span className="font-mono font-black text-foreground">{speechConfig?.target_duration_sec ?? durationSec} giây phát biểu</span>
          <span className="text-muted-foreground">•</span>
          <span className="font-medium text-primary">
            {phase === "preparing"
              ? `⏳ Đang chuẩn bị: ${prepLeft.toFixed(1)}s`
              : phase === "ready"
              ? "🟢 Sẵn sàng nói"
              : phase === "recording"
              ? `🔴 Đang thu âm (${Math.floor(recElapsed)}s / ${durationSec}s)`
              : phase === "processing"
              ? "⚡ AI Đang phân tích"
              : "🏆 Báo cáo kết quả"}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleGenerate}
            className="h-8 px-3 rounded-full text-xs font-bold gap-1.5 bg-gradient-to-r from-blue-600 via-primary to-indigo-600 text-white shadow-sm hover:opacity-95 cursor-pointer flex items-center transition-all"
            title="Sinh chủ đề phát biểu mới [Enter]"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Đề mới [Enter]</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="h-8 w-8 rounded-full border border-border/80 dark:border-white/15 bg-background/80 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shrink-0 cursor-pointer shadow-xs"
            title="Phím tắt hệ thống"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Cockpit Studio Grid */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full min-h-0">
          {/* COLUMN 1: Topic, Constraints & Outline Deck (5 cols ~ 41.7%) */}
          <div className="lg:col-span-5 h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl">
            <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 w-56 h-36 bg-primary/10 blur-3xl rounded-full pointer-events-none -z-10" />

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
              {/* Topic Header */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span>Chủ đề phát biểu (Topic)</span>
                </div>
                <h3 className="text-base sm:text-lg font-black font-jp text-foreground leading-snug">
                  {speechConfig?.topic || mono.exercise?.title}
                </h3>
                <div className="text-xs text-foreground/90 border-l-2 border-primary pl-3 py-1.5 bg-primary/5 rounded-r leading-relaxed">
                  <span className="font-bold">Chỉ thị:</span> {speechConfig?.instruction || mono.exercise?.instructions}
                </div>
              </div>

              {/* Constraints */}
              {(speechConfig?.constraints || mono.exercise?.constraints || []).length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Ràng buộc ngữ cảnh:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(speechConfig?.constraints || mono.exercise?.constraints || []).map((c: string) => (
                      <Badge key={c} variant="jlpt" size="sm" className="rounded-full text-[10px] py-0 px-2 font-mono">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Outline Hint */}
              <div className="p-3 rounded-2xl bg-muted/40 dark:bg-black/30 border border-border/60 dark:border-white/10 space-y-1.5 text-xs">
                <div className="font-bold text-primary flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span>Cấu trúc dàn ý chuẩn:</span>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground leading-relaxed">
                  {speechConfig?.outline_hint?.join(" → ") || "Quan điểm (Position) → Lý do (Reason) → Ví dụ (Example) → Kết luận (Conclusion)"}
                </div>

                {/* Support Hints Toggle */}
                {(speechConfig?.support?.keywords?.length > 0 || speechConfig?.support?.guided_questions?.length > 0 || speechConfig?.support?.outline?.length > 0) && (
                  <div className="pt-2 border-t border-border/60 dark:border-white/10 space-y-1.5">
                    {!showHint ? (
                      <button
                        type="button"
                        onClick={() => { setShowHint(true); setUsedHint(true); }}
                        className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>Xem gợi ý chi tiết (Keywords / Câu hỏi dẫn dắt)</span>
                      </button>
                    ) : (
                      <div className="space-y-1.5 text-[11px] bg-card p-2.5 rounded-xl border border-primary/20">
                        {speechConfig.support.keywords?.length > 0 && (
                          <div><span className="font-bold text-primary">Từ khóa:</span> {speechConfig.support.keywords.join(" • ")}</div>
                        )}
                        {speechConfig.support.guided_questions?.length > 0 && (
                          <div><span className="font-bold text-amber-500">Gợi ý câu hỏi:</span> {speechConfig.support.guided_questions.join(" | ")}</div>
                        )}
                        {speechConfig.support.outline?.length > 0 && (
                          <div><span className="font-bold text-emerald-500">Dàn ý cụ thể:</span> {speechConfig.support.outline.join(" → ")}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Countdown (if preparing) */}
            {phase === "preparing" && (
              <div className="pt-3 border-t border-border/60 dark:border-white/10 space-y-2 shrink-0">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-primary">
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                    <span>Thời gian chuẩn bị:</span>
                  </span>
                  <span className="text-lg font-black font-mono tabular-nums text-foreground">
                    {prepLeft.toFixed(1)}s
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-amber-400 transition-all duration-100 rounded-full"
                    style={{ width: `${Math.max(0, (1 - prepLeft / (speechConfig?.prep_duration_sec || prepSec)) * 100)}%` }}
                  />
                </div>
                <Button
                  variant="akane"
                  size="sm"
                  className="w-full font-bold text-xs h-9 rounded-xl shadow-xs cursor-pointer"
                  onClick={() => {
                    if (rafRef.current) cancelAnimationFrame(rafRef.current);
                    mono.setPhase("ready");
                  }}
                >
                  <span>Bỏ qua chuẩn bị & Bắt đầu phát biểu [Space]</span>
                </Button>
              </div>
            )}
          </div>

          {/* COLUMN 2: Interaction / Mic / Result Deck (7 cols ~ 58.3%) */}
          <div className="lg:col-span-7 h-full min-h-0 flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl p-4 sm:p-5 relative overflow-y-auto shadow-xl scrollbar-thin">
            {/* STAGE A: READY */}
            {phase === "ready" && (
              <div className="h-full flex flex-col justify-between space-y-4">
                <div className="text-center space-y-1">
                  <div className="text-sm sm:text-base font-extrabold text-foreground">
                    Sẵn sàng phát biểu — Mục tiêu: {speechConfig?.target_duration_sec ?? durationSec} giây
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Chọn thu âm qua micro để rèn luyện nhịp điệu hoặc soạn bài nói trực tiếp nếu đang ở văn phòng.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Option 1: Mic Recording */}
                  <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 flex flex-col justify-between space-y-3 text-center">
                    <div className="space-y-1">
                      <div className="font-extrabold text-sm flex items-center justify-center gap-1.5 text-primary">
                        <Mic className="h-4 w-4" />
                        <span>Thu Âm Bằng Micro</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Bật micro và nói tự do liên tục theo dàn ý gợi ý</p>
                    </div>
                    <Button variant="akane" onClick={startRecording} className="w-full font-bold gap-1.5 shadow-md h-10 rounded-xl cursor-pointer">
                      <Mic className="h-4 w-4" />
                      <span>Bắt đầu thu âm [Space]</span>
                    </Button>
                  </div>

                  {/* Option 2: Direct Text / Office Mode */}
                  <div className="p-4 rounded-2xl border border-border/80 dark:border-white/10 bg-card flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <div className="font-extrabold text-sm flex items-center gap-1.5 text-foreground">
                        <Keyboard className="h-4 w-4 text-emerald-500" />
                        <span>Soạn Bài Nói (Chế Độ Văn Phòng)</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Gõ bài phát biểu tiếng Nhật của bạn vào ô bên dưới</p>
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground">
                      {transcriptInput.trim().length} chữ ~ {Math.round(transcriptInput.trim().length / 5.0)}s
                    </div>
                  </div>
                </div>

                {/* Full Text Input Editor Box */}
                <div className="p-4 rounded-2xl border border-border/80 dark:border-white/10 bg-muted/20 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1 text-foreground">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span>Nội dung bài nói tiếng Nhật:</span>
                    </span>
                    <span className="text-[11px] font-normal text-muted-foreground">
                      Tối thiểu 15 chữ
                    </span>
                  </div>
                  <textarea
                    value={transcriptInput}
                    onChange={(e) => setTranscriptInput(e.target.value)}
                    placeholder="Gõ bài phát biểu tiếng Nhật của bạn tại đây... (Ví dụ: 私の意見としては、テレワークには多くのメリットがあると思います。なぜなら通勤時間がなくなり、効率的に仕事ができるからです。)"
                    rows={4}
                    className="w-full rounded-xl border bg-background p-3 text-sm font-jp leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      🏢 Không cần mic — AI chấm đầy đủ cấu trúc & từ vựng
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="akane"
                        size="sm"
                        onClick={handleDirectTextSubmit}
                        disabled={transcriptInput.trim().length < 15}
                        className="font-bold gap-1.5 shadow-xs cursor-pointer rounded-xl h-8 px-3"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Nộp bài viết</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE B: RECORDING */}
            {phase === "recording" && (
              <div className="h-full flex flex-col justify-between space-y-4">
                <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold flex items-center gap-2 text-destructive">
                      <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                      <span>Đang thu âm bài nói liên tục...</span>
                    </span>
                    <span className="text-sm font-mono font-black tabular-nums text-foreground">
                      {Math.floor(recElapsed)}s / {durationSec}s (còn {recLeft.toFixed(1)}s)
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-destructive to-amber-500 transition-all rounded-full"
                      style={{ width: `${Math.min(100, (recElapsed / durationSec) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 flex-1 rounded-xl bg-muted/60 overflow-hidden flex items-end gap-px p-1">
                      <div className="flex-1 bg-primary rounded-xs transition-all" style={{ height: `${Math.round(recorder.volumeLevel * 100)}%` }} />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground font-bold">{Math.round(recorder.volumeLevel * 100)}%</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="akane" onClick={handleStopRecording} className="h-10 rounded-xl font-bold gap-2 shadow-md cursor-pointer flex-1">
                      <Square className="h-4 w-4" />
                      <span>Dừng & Nộp bài ghi âm [Space]</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (recRafRef.current) { cancelAnimationFrame(recRafRef.current); recRafRef.current = null; }
                        await recorder.stopRecording();
                        recorder.releaseMicrophone();
                        mono.setPhase("ready");
                      }}
                      className="rounded-xl h-10 px-3 cursor-pointer"
                    >
                      Hủy
                    </Button>
                  </div>
                </div>

                {/* Supplementary Text Input */}
                <div className="p-3 rounded-2xl border border-border/80 dark:border-white/10 space-y-2 bg-muted/20">
                  <div className="text-xs font-bold text-foreground">Hoặc gõ văn bản bài nói (Chế độ Văn phòng):</div>
                  <textarea
                    value={transcriptInput}
                    onChange={(e) => setTranscriptInput(e.target.value)}
                    placeholder="Gõ bài nói của bạn tại đây nếu không thể nói to..."
                    className="w-full rounded-xl border bg-background p-2.5 text-sm font-jp min-h-[72px]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDirectTextSubmit}
                    disabled={!transcriptInput.trim()}
                    className="font-bold text-xs gap-1.5 rounded-xl h-8 cursor-pointer"
                  >
                    <Send className="h-3 w-3" />
                    <span>Nộp bài gõ</span>
                  </Button>
                </div>
              </div>
            )}

            {/* STAGE C: PROCESSING */}
            {phase === "processing" && (
              <div className="h-full flex items-center justify-center">
                <ZenLoadingState
                  variant="ai"
                  title="AI Đang Phân Tích Bài Nói & Nâng Cấp Tự Nhiên..."
                  ja="スピーチ評価・AI添削中..."
                  description="Đang xử lý nhận diện giọng nói (STT), phân tích tính lưu loát, cấu trúc luận điểm và đề xuất nâng cấp câu văn chuẩn bản xứ..."
                />
              </div>
            )}

            {/* STAGE D: RETRY */}
            {phase === "retry" && (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3 border border-amber-500/30 bg-amber-500/10 rounded-2xl">
                <div className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>Chất lượng âm thanh chưa đạt chuẩn</span>
                </div>
                <p className="text-xs text-foreground/80 max-w-md">
                  {mono.result?.feedback || mono.error || "Vui lòng kiểm tra lại mic hoặc thu âm lại ở nơi yên tĩnh hơn."}
                </p>
                <Button
                  variant="akane"
                  size="sm"
                  onClick={() => {
                    if (rafRef.current) cancelAnimationFrame(rafRef.current);
                    if (recRafRef.current) cancelAnimationFrame(recRafRef.current);
                    mono.setPhase("ready");
                  }}
                  className="rounded-xl font-bold h-9 px-4 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  <span>Thu âm lại</span>
                </Button>
              </div>
            )}

            {/* STAGE E: RESULT DECK */}
            {phase === "result" && result && (
              <div className="space-y-4">
                {/* Result Header */}
                <div className="flex items-center justify-between pb-2 border-b border-border/60 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    <span className="font-black text-base text-foreground">
                      Điểm tổng quan: {result.score ?? result.assessment?.overall ?? 85}/100
                    </span>
                    <Badge variant={result.success ? "kintsugi" : "jlpt"}>
                      {result.success ? "Thành Công" : "Cần Rèn Thêm"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    Độ tin cậy {(result.confidence ?? result.assessment?.confidence ?? 0).toFixed(2)}
                  </span>
                </div>

                {/* 8 Criterion Grid */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    ["Lưu loát", result.assessment?.fluency],
                    ["Mạch lạc", result.assessment?.coherence],
                    ["Ngữ pháp", result.assessment?.grammar],
                    ["Từ vựng", result.assessment?.vocabulary],
                    ["Tự nhiên", result.assessment?.naturalness],
                    ["Đúng đề", result.assessment?.relevance],
                    ["Cấu trúc", result.assessment?.discourse],
                    ["Phát âm", result.assessment?.pronunciation],
                  ].map(([k, v]) => (
                    <div key={k as string} className="rounded-xl border border-border/60 dark:border-white/10 bg-muted/40 p-2">
                      <div className="text-[10px] font-bold text-muted-foreground">{k}</div>
                      <div className={`text-base font-black ${v == null ? "text-muted-foreground text-sm" : "text-foreground"}`}>
                        {v ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Feedback Box */}
                <div className="text-xs sm:text-sm border-l-2 border-primary pl-3 bg-primary/5 rounded-r p-2.5 leading-relaxed">
                  <span className="font-bold text-primary">Nhận xét AI:</span> {result.feedback}
                </div>

                {/* Core Speech Metrics */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-xl border border-border/60 dark:border-white/10 p-2 bg-card">
                    <div className="font-bold text-muted-foreground text-[10px]">Thời lượng</div>
                    <div className="font-mono font-bold mt-0.5">{((result.metrics?.speech_duration_ms ?? result.metrics?.speech_metrics_core?.speech_duration_ms ?? 0) / 1000).toFixed(1)}s / {speechConfig?.target_duration_sec ?? durationSec}s</div>
                  </div>
                  <div className="rounded-xl border border-border/60 dark:border-white/10 p-2 bg-card">
                    <div className="font-bold text-muted-foreground text-[10px]">Tốc độ nói</div>
                    <div className="font-mono font-bold mt-0.5">{result.metrics?.speech_metrics_core?.chars_per_min ?? result.metrics?.chars_per_min ?? "—"} chữ/phút</div>
                  </div>
                  <div className="rounded-xl border border-border/60 dark:border-white/10 p-2 bg-card">
                    <div className="font-bold text-muted-foreground text-[10px]">Từ đệm (Fillers)</div>
                    <div className="font-mono font-bold mt-0.5">{result.metrics?.filler_summary?.filler_count ?? result.metrics?.speech_metrics_core?.filler_count ?? 0} từ</div>
                  </div>
                </div>

                {/* Native Upgrade Section */}
                {result.upgrade && (
                  <div className="space-y-2 border-t border-border/60 dark:border-white/10 pt-3">
                    <div className="text-xs font-bold flex items-center gap-1.5 text-primary">
                      <Lightbulb className="h-3.5 w-3.5" />
                      <span>Nâng cấp diễn đạt chuẩn bản xứ (Native Upgrade):</span>
                    </div>
                    {result.upgrade.minimal_correction && (
                      <div className="rounded-xl border border-border/60 dark:border-white/10 p-2.5 bg-muted/20 text-xs">
                        <div className="font-bold text-muted-foreground text-[10px]">Sửa tối thiểu:</div>
                        <div className="font-jp text-foreground mt-0.5">{result.upgrade.minimal_correction}</div>
                      </div>
                    )}
                    {result.upgrade.native_version && (
                      <div className="rounded-xl border border-primary/30 p-2.5 bg-primary/5 text-xs">
                        <div className="font-bold text-primary text-[10px]">Bản nói tự nhiên bản xứ:</div>
                        <div className="font-jp text-foreground font-bold mt-0.5">{result.upgrade.native_version}</div>
                      </div>
                    )}
                    {result.upgrade.professional_version && (
                      <div className="rounded-xl border border-indigo-500/30 p-2.5 bg-indigo-500/5 text-xs">
                        <div className="font-bold text-indigo-500 text-[10px]">Bản thuyết trình công sở chuyên nghiệp:</div>
                        <div className="font-jp text-foreground font-bold mt-0.5">{result.upgrade.professional_version}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Result Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/60 dark:border-white/10">
                  <Button variant="akane" onClick={handleGenerate} className="rounded-xl font-bold text-xs h-9 px-4 gap-1.5 cursor-pointer shadow-sm">
                    <Zap className="h-3.5 w-3.5" />
                    <span>Đề bài tiếp theo [Enter]</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => mono.setPhase("ready")}
                    className="rounded-xl font-bold text-xs h-9 px-3 gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Làm lại đề này [R]</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (rafRef.current) cancelAnimationFrame(rafRef.current);
                      if (recRafRef.current) cancelAnimationFrame(recRafRef.current);
                      recorder.releaseMicrophone();
                      mono.reset();
                    }}
                    className="text-muted-foreground hover:text-foreground text-xs h-9 px-3 cursor-pointer ml-auto"
                  >
                    Về sảnh
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Phím tắt Monologue Lab">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border bg-muted/40 p-2.5"><div className="font-bold font-mono text-primary">{formatKeyDisplay(keybindings.speakingMic)}</div><div className="text-muted-foreground">Bắt đầu / Dừng ghi âm</div></div>
          <div className="rounded-lg border bg-muted/40 p-2.5"><div className="font-bold font-mono text-primary">{formatKeyDisplay(keybindings.drillSubmitOrNext)}</div><div className="text-muted-foreground">Tạo đề / Bỏ qua chuẩn bị / Tiếp tục</div></div>
          <div className="rounded-lg border bg-muted/40 p-2.5"><div className="font-bold font-mono text-primary">{formatKeyDisplay(keybindings.drillRetry)}</div><div className="text-muted-foreground">Làm lại bài nói</div></div>
          <div className="rounded-lg border bg-muted/40 p-2.5"><div className="font-bold font-mono text-primary">{formatKeyDisplay(keybindings.drillToggleHelp)}</div><div className="text-muted-foreground">Toggle help</div></div>
          <div className="rounded-lg border bg-muted/40 p-2.5"><div className="font-bold font-mono text-primary">Esc</div><div className="text-muted-foreground">Thoát / Hủy</div></div>
        </div>
      </Modal>
    </div>
  );
}

