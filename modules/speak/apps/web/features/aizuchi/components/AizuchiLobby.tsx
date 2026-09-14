"use client";

import React from "react";
import { Ear, Briefcase, Users, Play, Gauge, Clock, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { soundFX } from "@/lib/sound-fx";
import { formatKeyDisplay } from "@/hooks/use-system-keybindings";
import { WINDOW_LEVELS } from "../services/aizuchi-api";
import type { AizuchiRelation, AizuchiSubMode, WindowProfile } from "../services/aizuchi-api";

const SUB_MODES: Array<{ id: AizuchiSubMode; label: string; ja: string; desc: string }> = [
  { id: "mixed", label: "Mixed", ja: "混合", desc: "Trộn chêm + chen ngang" },
  { id: "aizuchi_reaction", label: "Nghe-chêm", ja: "相づち", desc: "Chêm 1-2 từ vào khoảng lặng" },
  { id: "warikomi_interrupt", label: "Chen ngang", ja: "割り込み", desc: "Chen lịch sự khi NPC nói dài" },
];

const RELATIONS: Array<{ id: AizuchiRelation; label: string; ja: string; icon: any }> = [
  { id: "casual_friend", label: "Bạn bè", ja: "タメ口", icon: Users },
  { id: "business_polite", label: "Công sở", ja: "丁寧語", icon: Briefcase },
];

const DURATIONS = [
  { id: 0, label: "∞ Vô hạn" },
  { id: 3, label: "3m" },
  { id: 5, label: "5m" },
  { id: 10, label: "10m" },
  { id: 20, label: "20m" },
] as const;

export function AizuchiLobby({
  subMode,
  setSubMode,
  relation,
  setRelation,
  windowProfile,
  setWindowProfile,
  duration,
  setDuration,
  startTrigger,
  setStartTrigger,
  onStart,
  loading,
  keybindings,
  onOpenHelp,
}: {
  subMode: AizuchiSubMode;
  setSubMode: (v: AizuchiSubMode) => void;
  relation: AizuchiRelation;
  setRelation: (v: AizuchiRelation) => void;
  windowProfile: WindowProfile;
  setWindowProfile: (v: WindowProfile) => void;
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
      {/* Hero Header */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center text-primary shrink-0">
              <Ear className="h-5 w-5" />
            </span>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Phản hồi</h1>
                <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">相づち</span>
              </div>
              <p className="text-xs text-muted-foreground">Nghe như bản xứ trước khi nói như bản xứ — chêm đúng lúc, chen đúng chỗ.</p>
            </div>
          </div>
          {onOpenHelp && (
            <Button variant="outline" size="sm" className="gap-1.5 rounded-lg border-border h-8 px-3 text-xs font-medium hover:bg-muted shrink-0" onClick={onOpenHelp}>
              <Keyboard className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Phím tắt ({formatKeyDisplay(keybindings?.aizuchiToggleHelp || "?")})</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2-Col Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Mode Selection */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chế độ luyện</p>
            <span className="text-[11px] text-muted-foreground">{SUB_MODES.length} kiểu</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
                    "rounded-xl border p-3 text-left transition-all flex flex-col gap-1.5 h-full",
                    active ? "bg-primary/10 border-primary/30 shadow-2xs ring-1 ring-primary/20" : "bg-card border-border hover:bg-muted/50 hover:border-border"
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
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quan hệ</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {RELATIONS.map((r) => {
                const Icon = r.icon;
                const active = relation === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      soundFX.playFurin();
                      setRelation(r.id);
                    }}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all flex items-center gap-2.5",
                      active ? "bg-primary/10 border-primary/30 shadow-2xs" : "bg-card border-border hover:bg-muted/50"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                    <div>
                      <p className="text-sm font-bold leading-none">{r.label}</p>
                      <p className="text-[11px] font-jp text-muted-foreground">{r.ja}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
              Mẹo: bạn bè dùng <span className="font-jp">うん・へー・マジで？</span> · công sở dùng <span className="font-jp">はい・なるほど・確かに</span>
            </p>
          </div>
        </div>

        {/* Right: Session Cockpit */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3 p-3.5 rounded-xl border border-border bg-card">
          {/* Window pressure */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <label className="text-muted-foreground flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5 text-primary" />
                <span>Cửa sổ pause:</span>
              </label>
              <span className="text-primary font-mono text-[11px] font-bold">
                {WINDOW_LEVELS.find((w) => w.id === windowProfile)?.label} {WINDOW_LEVELS.find((w) => w.id === windowProfile)?.ms ? `${(WINDOW_LEVELS.find((w) => w.id === windowProfile)!.ms / 1000).toFixed(2)}s` : "∞"}
              </span>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/50 border border-border">
              {WINDOW_LEVELS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    soundFX.playFurin();
                    setWindowProfile(w.id);
                  }}
                  className={cn(
                    "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all text-center",
                    windowProfile === w.id ? "bg-card text-foreground border border-border shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  )}
                  title={w.label}
                >
                  {w.ms > 0 ? `${(w.ms / 1000).toFixed(2)}s` : "∞"}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
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

          {/* CTA */}
          <Button onClick={() => { soundFX.playTaiko(); onStart(); }} disabled={loading} className="w-full font-bold gap-1.5 rounded-xl h-9">
            <Play className="h-4 w-4 fill-current" />
            <span>{loading ? "Đang tạo bài..." : "Bắt đầu luyện"}</span>
          </Button>
          <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
            Với bạn bè tránh <span className="font-jp">はい</span> (xa cách) · với công sở tránh <span className="font-jp">マジで</span> (thất lễ)
          </p>
        </div>
      </div>
    </div>
  );
}
