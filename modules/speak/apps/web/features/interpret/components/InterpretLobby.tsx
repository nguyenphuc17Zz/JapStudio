"use client";

import React, { useState, useEffect } from "react";
import { Languages, Play, Clock, Keyboard, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { soundFX } from "@/lib/sound-fx";
import { formatKeyDisplay } from "@/hooks/use-system-keybindings";
import { isVietnameseVoiceAvailable } from "@/features/speaking/services/web-speech";
import type { InterpretRelation, InterpretScaffold, InterpretSubMode } from "../services/interpret-api";

const SUB_MODES: Array<{ id: InterpretSubMode; label: string; ja: string; desc: string }> = [
  { id: "mixed", label: "Mixed", ja: "混合", desc: "Từ + câu + tình huống trộn lẫn" },
  { id: "interpret_word", label: "Từ/cụm", ja: "単語", desc: "Nói ngay JA trong 8s" },
  { id: "interpret_sentence", label: "Dịch câu", ja: "文", desc: "Giữ đủ ý, đúng SOV" },
  { id: "interpret_situation", label: "Tình huống", ja: "通訳", desc: "Phiên dịch + keigo" },
];

const TOPICS: Array<{ id: string; label: string }> = [
  { id: "", label: "Trộn" },
  { id: "workplace", label: "Công sở" },
  { id: "tet_holiday", label: "Tết" },
  { id: "daily_life", label: "Đời sống" },
  { id: "family", label: "Gia đình" },
  { id: "travel", label: "Du lịch" },
];

const DURATIONS = [
  { id: 0, label: "∞ Vô hạn" },
  { id: 3, label: "3m" },
  { id: 5, label: "5m" },
  { id: 10, label: "10m" },
  { id: 20, label: "20m" },
] as const;

export function InterpretLobby({
  subMode,
  setSubMode,
  relation,
  setRelation,
  scaffold,
  setScaffold,
  topic,
  setTopic,
  duration,
  setDuration,
  startTrigger,
  setStartTrigger,
  onStart,
  loading,
  keybindings,
  onOpenHelp,
}: {
  subMode: InterpretSubMode;
  setSubMode: (v: InterpretSubMode) => void;
  relation: InterpretRelation;
  setRelation: (v: InterpretRelation) => void;
  scaffold: InterpretScaffold;
  setScaffold: (v: InterpretScaffold) => void;
  topic: string;
  setTopic: (v: string) => void;
  duration: 0 | 3 | 5 | 10 | 20;
  setDuration: (v: 0 | 3 | 5 | 10 | 20) => void;
  startTrigger?: "manual" | "auto";
  setStartTrigger?: (v: "manual" | "auto") => void;
  onStart: () => void;
  loading: boolean;
  keybindings?: any;
  onOpenHelp?: () => void;
}) {
  const [hasViVoice, setHasViVoice] = useState<boolean | null>(null);
  useEffect(() => {
    const check = () => setHasViVoice(isVietnameseVoiceAvailable());
    check();
    // Voices load async on Chrome
    const t = setTimeout(check, 800);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => check();
    }
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="space-y-4 animate-in fade-in duration-300 max-w-[1600px] w-full mx-auto pb-8 h-full overflow-y-auto pr-1">
      {hasViVoice === false && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-2.5 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <p className="font-bold text-amber-700 dark:text-amber-300">Chưa có giọng Tiếng Việt trên máy — đề sẽ chỉ hiển thị chữ, không phát âm.</p>
            <p className="text-xs text-muted-foreground">Windows: Settings → Time & Language → Language → Add Vietnamese → Tải “Tiếng Việt” + giọng “An”. Chrome cũng cần khởi động lại sau khi cài. Bạn vẫn luyện bình thường bằng cách đọc đề.</p>
          </div>
        </div>
      )}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center text-primary shrink-0">
              <Languages className="h-5 w-5" />
            </span>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Việt-Nhật</h1>
                <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">通訳</span>
              </div>
              <p className="text-xs text-muted-foreground">Cầu nối phiên dịch Việt→Nhật — đích cuối vẫn là nghĩ thẳng Nhật.</p>
            </div>
          </div>
          {onOpenHelp && (
            <Button variant="outline" size="sm" className="gap-1.5 rounded-lg border-border h-8 px-3 text-xs font-medium hover:bg-muted shrink-0" onClick={onOpenHelp}>
              <Keyboard className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Phím tắt ({formatKeyDisplay(keybindings?.interpretToggleHelp || "?")})</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-7 xl:col-span-8 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kiểu luyện</p>
            <span className="text-[11px] text-muted-foreground">{SUB_MODES.length} kiểu</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SUB_MODES.map((m) => {
              const active = subMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    soundFX.playFurin();
                    setSubMode(m.id);
                  }}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all flex flex-col gap-1",
                    active ? "bg-primary/10 border-primary/30 shadow-2xs ring-1 ring-primary/20" : "bg-card border-border hover:bg-muted/50"
                  )}
                >
                  <p className="text-sm font-bold leading-none">
                    {m.label} <span className="font-jp text-muted-foreground font-normal text-xs">{m.ja}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{m.desc}</p>
                </button>
              );
            })}
          </div>
          <div className="rounded-xl border border-border bg-card p-3.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Chủ đề</p>
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/50 border border-border">
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    soundFX.playFurin();
                    setTopic(t.id);
                  }}
                  className={cn(
                    "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all text-center truncate",
                    topic === t.id ? "bg-card text-foreground border border-border shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-4 space-y-3 p-3.5 rounded-xl border border-border bg-card">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quan hệ</p>
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/50 border border-border">
                {(["casual_friend", "business_polite"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      soundFX.playFurin();
                      setRelation(r as any);
                    }}
                    className={cn(
                      "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all text-center",
                      relation === r ? "bg-card text-foreground border border-border shadow-2xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {r === "casual_friend" ? "Bạn bè" : "Công sở"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Scaffold</p>
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/50 border border-border">
                {(["keyword_hint", "sentence_starter", "none"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      soundFX.playFurin();
                      setScaffold(s as any);
                    }}
                    className={cn(
                      "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all text-center truncate",
                      scaffold === s ? "bg-card text-foreground border border-border shadow-2xs" : "text-muted-foreground hover:text-foreground"
                    )}
                    title={s === "none" ? "Blind" : s === "keyword_hint" ? "Gợi ý JA" : "Mở đầu"}
                  >
                    {s === "none" ? "Blind" : s === "keyword_hint" ? "Gợi ý" : "Mở đầu"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-muted-foreground">Thời Lượng Phiên:</span>
              <span className="text-primary font-mono text-[11px]">{duration === 0 ? "∞ Vô hạn" : `${duration} phút`}</span>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/50 border border-border">
              {DURATIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDuration(d.id as any)}
                  className={cn(
                    "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all text-center",
                    duration === d.id ? "bg-card text-foreground border border-border shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Start Trigger Mode */}
          {setStartTrigger && (
            <div className="space-y-1.5 pt-1 border-t border-border/40">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground">Chế độ xuất phát:</span>
                <span className="text-primary text-[11px] font-medium">{startTrigger === "manual" ? "🎯 Chủ động" : "⚡ Tự động"}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playFurin();
                    setStartTrigger("manual");
                  }}
                  className={cn(
                    "py-1 rounded-lg font-bold border transition-all text-center",
                    startTrigger === "manual" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  🎯 Chủ động
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playFurin();
                    setStartTrigger("auto");
                  }}
                  className={cn(
                    "py-1 rounded-lg font-bold border transition-all text-center",
                    startTrigger === "auto" ? "bg-amber-500 text-white border-amber-500" : "bg-card border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  ⚡ Tự động
                </button>
              </div>
            </div>
          )}

          <Button onClick={() => { soundFX.playTaiko(); onStart(); }} disabled={loading} className="w-full font-bold gap-1.5 rounded-xl h-9">
            <Play className="h-4 w-4 fill-current" />
            <span>{loading ? "Đang tạo bài..." : "Bắt đầu phiên dịch"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
