"use client";

import React from "react";
import { Blocks, Play, Clock, Keyboard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { soundFX } from "@/lib/sound-fx";
import { formatKeyDisplay } from "@/hooks/use-system-keybindings";
import { BUILDER_SKILLS, SCAFFOLDS } from "../services/builder-api";
import type { BuilderRelation, BuilderScaffold, BuilderSkill, BuilderSubMode } from "../services/builder-api";

const SUB_MODES: Array<{ id: BuilderSubMode; label: string; ja: string; desc: string }> = [
  { id: "mixed", label: "Mixed", ja: "混合", desc: "Nối + mở rộng + sửa trộn lẫn" },
  { id: "sentence_assemble", label: "Nối từ", ja: "文立て", desc: "Từ rời → 1 câu dài" },
  { id: "sentence_expand", label: "Mở rộng", ja: "文拡大", desc: "Câu cụt → câu dài" },
  { id: "sentence_repair", label: "Sửa câu", ja: "文修理", desc: "Lủng củng → bản xứ" },
];

const DURATIONS = [
  { id: 0, label: "∞ Vô hạn" },
  { id: 3, label: "3m" },
  { id: 5, label: "5m" },
  { id: 10, label: "10m" },
  { id: 20, label: "20m" },
] as const;

export function BuilderLobby({
  subMode,
  setSubMode,
  focusSkill,
  setFocusSkill,
  relation,
  setRelation,
  scaffold,
  setScaffold,
  duration,
  setDuration,
  startTrigger,
  setStartTrigger,
  onStart,
  loading,
  keybindings,
  onOpenHelp,
}: {
  subMode: BuilderSubMode;
  setSubMode: (v: BuilderSubMode) => void;
  focusSkill: BuilderSkill;
  setFocusSkill: (v: BuilderSkill) => void;
  relation: BuilderRelation;
  setRelation: (v: BuilderRelation) => void;
  scaffold: BuilderScaffold;
  setScaffold: (v: BuilderScaffold) => void;
  duration: 0 | 3 | 5 | 10 | 20;
  setDuration: (v: 0 | 3 | 5 | 10 | 20) => void;
  startTrigger?: "manual" | "auto";
  setStartTrigger?: (v: "manual" | "auto") => void;
  onStart: () => void;
  loading: boolean;
  keybindings?: any;
  onOpenHelp?: () => void;
}) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300 max-w-[1600px] w-full mx-auto pb-8 h-full overflow-y-auto pr-1">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center text-primary shrink-0">
              <Blocks className="h-5 w-5" />
            </span>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Xây câu</h1>
                <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">文立て</span>
              </div>
              <p className="text-xs text-muted-foreground">Từ vựng N1 đầy đầu → nối thành câu dài như bản xứ. Mỗi ván 1 kỹ năng nối.</p>
            </div>
          </div>
          {onOpenHelp && (
            <Button variant="outline" size="sm" className="gap-1.5 rounded-lg border-border h-8 px-3 text-xs font-medium hover:bg-muted shrink-0" onClick={onOpenHelp}>
              <Keyboard className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Phím tắt ({formatKeyDisplay(keybindings?.builderToggleHelp || "?")})</span>
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
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kỹ năng nối (1 ván 1 focus)</p>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/50 border border-border">
              {BUILDER_SKILLS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    soundFX.playFurin();
                    setFocusSkill(s.id);
                  }}
                  title={s.desc}
                  className={cn(
                    "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all text-center",
                    focusSkill === s.id ? "bg-card text-foreground border border-border shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-border bg-card p-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Quan hệ</p>
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/50 border border-border">
                {(["casual_friend", "business_polite"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      soundFX.playFurin();
                      setRelation(r);
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
            <div className="rounded-xl border border-border bg-card p-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Scaffold</p>
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/50 border border-border">
                {SCAFFOLDS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      soundFX.playFurin();
                      setScaffold(s.id);
                    }}
                    className={cn(
                      "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all text-center truncate",
                      scaffold === s.id ? "bg-card text-foreground border border-border shadow-2xs" : "text-muted-foreground hover:text-foreground"
                    )}
                    title={s.label}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-4 space-y-3 p-3.5 rounded-xl border border-border bg-card">
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
            <span>{loading ? "Đang tạo bài..." : "Bắt đầu xây câu"}</span>
          </Button>
          <p className="text-[11px] text-muted-foreground leading-relaxed px-1">Mỗi ván 1 focus skill — nối て-chain, quan hệ, điều kiện, danh từ hóa hoặc contraction.</p>
        </div>
      </div>
    </div>
  );
}
