"use client";

import React, { useState } from "react";
import {
  Ear,
  Briefcase,
  Users,
  Play,
  Gauge,
  Clock,
  Keyboard,
  Shuffle,
  MessageSquare,
  Hand,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Volume2,
  BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { soundFX } from "@/lib/sound-fx";
import { formatKeyDisplay } from "@/hooks/use-system-keybindings";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { WINDOW_LEVELS } from "../services/aizuchi-api";
import type { AizuchiRelation, AizuchiSubMode, WindowProfile } from "../services/aizuchi-api";

export interface AizuchiSubModeConfig {
  id: AizuchiSubMode;
  label: string;
  subLabel: string;
  ja: string;
  icon: any;
  desc: string;
  badgeVariant: "matcha" | "kintsugi" | "fuji" | "sakura";
  iconColor: string;
  highlights: string[];
  exampleCasual: { npc: string; npcVi: string; aizuchi: string; type: string };
  exampleBusiness: { npc: string; npcVi: string; aizuchi: string; type: string };
}

export const SUB_MODES: AizuchiSubModeConfig[] = [
  {
    id: "mixed",
    label: "Tổng Hợp",
    subLabel: "Adaptive",
    ja: "混合",
    icon: Shuffle,
    desc: "Trộn lẫn ngẫu nhiên giữa nghe-chêm tự nhiên và chen ngang lịch sự theo nhịp điệu của NPC.",
    badgeVariant: "matcha",
    iconColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    highlights: [
      "Luyện phản xạ toàn diện cả chêm đệm và ngắt lời",
      "Thích ứng linh hoạt với bài nói ngắn lẫn độc thoại dài",
      "Cân bằng giữa lắng nghe chủ động và đối thoại tương tác",
    ],
    exampleCasual: {
      npc: "昨日、新しいラーメン屋に行ってみたんだけど...",
      npcVi: "Hôm qua tao có ghé thử quán mì ramen mới mở ấy...",
      aizuchi: "「へー！どうだった？ (Ngạc nhiên & Hỏi dồn)」",
      type: "Đồng cảm + Tiếp nối",
    },
    exampleBusiness: {
      npc: "先方の担当者から納期の変更について連絡がありまして...",
      npcVi: "Bên đối tác vừa liên hệ về việc thay đổi thời hạn bàn giao...",
      aizuchi: "「はい、さようでございますか (Lắng nghe & Xác nhận)」",
      type: "Kính ngữ trang trọng",
    },
  },
  {
    id: "aizuchi_reaction",
    label: "Nghe-Chêm",
    subLabel: "Reaction ⚡",
    ja: "相づち",
    icon: MessageSquare,
    desc: "Bắt đúng khoảng lặng (pause window) cuối câu để chêm 1-2 từ biểu cảm tự nhiên.",
    badgeVariant: "kintsugi",
    iconColor: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    highlights: [
      "Chêm đúng cửa sổ vàng 0.3s - 0.9s không đè lời NPC",
      "Rèn 5 sắc thái: ngạc nhiên, đồng cảm, giữ mạch, hỏi dồn",
      "Tập thói quen gật đầu kèm ngữ điệu tự nhiên của người Nhật",
    ],
    exampleCasual: {
      npc: "最近、仕事がめちゃくちゃ忙しくてさ...",
      npcVi: "Dạo này công việc bận rộn dã man mày ạ...",
      aizuchi: "「大変だね... (Đồng cảm chia sẻ)」",
      type: "Empathy / Đồng cảm",
    },
    exampleBusiness: {
      npc: "こちらの企画書、ご査収のほどよろしくお願いいたします。",
      npcVi: "Kính gửi quý khách bản kế hoạch này, xin vui lòng kiểm tra giúp.",
      aizuchi: "「かしこまりました。拝見いたします。(Tiếp nhận)」",
      type: "Business Continuer",
    },
  },
  {
    id: "warikomi_interrupt",
    label: "Chen Ngang",
    subLabel: "Interruption 🛑",
    ja: "割り込み",
    icon: Hand,
    desc: "Học cách ngắt lời lịch sự khi đối phương nói quá dài hoặc cần xin phép xen ngang.",
    badgeVariant: "fuji",
    iconColor: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
    highlights: [
      "Chen lời đúng chuẩn văn hóa Wakimae không thô lỗ",
      "Mở đầu bằng cụm mồi: すみません, ちょっとよろしいですか",
      "Rèn bản lĩnh tự tin khi họp hành và giao tiếp thực tế",
    ],
    exampleCasual: {
      npc: "それでね、あの人がまた勝手なこと言い出して、もう本当に...",
      npcVi: "Rồi thì cái người đó lại tự ý nói mấy câu vô lý, thật sự là...",
      aizuchi: "「ちょっと待って、それ本当？ (Cắt ngang tò mò)」",
      type: "Thân mật lịch thiệp",
    },
    exampleBusiness: {
      npc: "今期の売上見込みに関しましては、各部門での集計データによりますと...",
      npcVi: "Về dự báo doanh thu kỳ này, theo số liệu tổng hợp từ các phòng ban...",
      aizuchi: "「恐れ入ります、1点確認させていただきたいのですが... (Xen ngang lịch sự)」",
      type: "Kính ngữ chuyên nghiệp",
    },
  },
];

export const RELATIONS: Array<{ id: AizuchiRelation; label: string; ja: string; icon: any; hint: string }> = [
  { id: "casual_friend", label: "Bạn Bè", ja: "タメ口", icon: Users, hint: "へー・うんうん・確かに・マジで？" },
  { id: "business_polite", label: "Công Sở", ja: "丁寧語", icon: Briefcase, hint: "はい・なるほど・承知いたしました・さようでございますか" },
];

export const DURATIONS = [
  { id: 0, label: "∞ Vô hạn" },
  { id: 3, label: "3 phút" },
  { id: 5, label: "5 phút" },
  { id: 10, label: "10 phút" },
  { id: 20, label: "20 phút" },
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
  startTrigger = "manual",
  setStartTrigger,
  onStart,
  loading,
  keybindings,
  onOpenHelp,
  onOpenCheatsheet,
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
  onOpenCheatsheet?: () => void;
}) {
  const [showSample, setShowSample] = useState(false);

  const currentMode = SUB_MODES.find((m) => m.id === subMode) || SUB_MODES[0];
  const currentRelation = RELATIONS.find((r) => r.id === relation) || RELATIONS[0];
  const currentExample = relation === "casual_friend" ? currentMode.exampleCasual : currentMode.exampleBusiness;
  const currentWindow = WINDOW_LEVELS.find((w) => w.id === windowProfile) || WINDOW_LEVELS[2];

  return (
    <div className="w-full max-w-[1600px] mx-auto h-[calc(100vh-3.5rem)] flex flex-col justify-between p-2 sm:p-3 gap-2 sm:gap-2.5 overflow-hidden select-none animate-in fade-in duration-200">
      {/* ── Top Header Bar ── */}
      <div className="shrink-0 rounded-xl border border-border bg-card/95 washi-texture px-3 py-2 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
              <Ear className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
                  Phản Hồi Tức Thì
                </h1>
                <Badge variant="matcha" size="sm" className="text-[10px] font-mono font-bold px-1.5 py-0">
                  相づち • MODE 7
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                Nghe như bản xứ trước khi nói như bản xứ — chêm đúng lúc, chen đúng chỗ trong khoảng lặng vàng.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            {onOpenCheatsheet && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 rounded-lg border-border h-7 px-2.5 text-xs font-semibold hover:bg-muted cursor-pointer"
                onClick={onOpenCheatsheet}
              >
                <BookOpen className="h-3 w-3 text-primary" />
                <span>Cẩm nang (C)</span>
              </Button>
            )}
            {onOpenHelp && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 rounded-lg border-border h-7 px-2.5 text-xs font-semibold hover:bg-muted cursor-pointer"
                onClick={onOpenHelp}
              >
                <Keyboard className="h-3 w-3 text-muted-foreground" />
                <span>Phím tắt ({formatKeyDisplay(keybindings?.aizuchiToggleHelp || "?")})</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── SubMode Horizontal Segmented Selector Bar ── */}
      <div className="shrink-0 space-y-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            1. Chọn Chuyên Đề Phản Hồi
          </span>
          <span className="text-[11px] text-primary font-mono font-bold">
            {currentMode.label} • {currentMode.ja}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-muted/40 border border-border">
          {SUB_MODES.map((m) => {
            const active = subMode === m.id;
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  soundFX.playFurin();
                  setSubMode(m.id);
                }}
                className={cn(
                  "relative flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  active
                    ? "bg-card text-foreground border border-border shadow-xs ring-1 ring-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                <span className="truncate">{m.label}</span>
                <span className="font-jp text-[11px] font-normal text-muted-foreground hidden sm:inline">
                  {m.ja}
                </span>
                {active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0 hidden md:inline-block" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Relation Segmented Selector Bar ── */}
      <div className="shrink-0 space-y-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            2. Quan Hệ Xã Giao (Wakimae)
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">
            {currentRelation.label} • {currentRelation.ja}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-muted/40 border border-border">
          {RELATIONS.map((r) => {
            const active = relation === r.id;
            const Icon = r.icon;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  soundFX.playFurin();
                  setRelation(r.id);
                }}
                className={cn(
                  "flex items-center justify-between py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  active
                    ? "bg-card text-foreground border border-border shadow-xs ring-1 ring-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                  <span className="truncate">{r.label}</span>
                  <span className="font-jp text-[11px] font-normal text-muted-foreground">{r.ja}</span>
                </div>
                <span className="text-[10px] font-jp text-muted-foreground hidden md:inline truncate max-w-[200px]">
                  {r.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Zen Summary & Highlights Card (Flexible Middle Container) ── */}
      <div className="flex-1 min-h-0 rounded-xl border border-border bg-card/90 washi-texture p-3 sm:p-4 flex flex-col justify-between overflow-hidden shadow-2xs">
        <div className="space-y-2 overflow-y-auto pr-1">
          {/* Objective row */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn("h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-xs", currentMode.iconColor)}>
                <Sparkles className="h-3 w-3" />
              </span>
              <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                {currentMode.desc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSample((v) => !v)}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>{showSample ? "Ẩn ví dụ" : "Xem câu mẫu"}</span>
              {showSample ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {/* 3 Pedagogical Highlights Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {currentMode.highlights.map((h, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/70 text-[11px] text-muted-foreground"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span className="truncate font-medium">{h}</span>
              </div>
            ))}
          </div>

          {/* Collapsible Example Box */}
          {showSample && (
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-extrabold text-foreground flex items-center gap-1.5">
                  <Volume2 className="h-3 w-3 text-primary" />
                  <span>Lời NPC:</span>
                </span>
                <Badge variant="outline" size="sm" className="text-[9px] font-mono">
                  {currentExample.type}
                </Badge>
              </div>
              <div className="text-xs text-foreground font-jp">
                <UniversalFurigana text={currentExample.npc} fontSize="sm" />
              </div>
              <p className="text-[11px] text-muted-foreground italic">
                {currentExample.npcVi}
              </p>
              <div className="pt-1 flex items-center gap-1.5 text-xs font-bold text-primary font-jp">
                <span>Câu chêm mẫu:</span>
                <span>{currentExample.aizuchi}</span>
              </div>
            </div>
          )}
        </div>

        {/* Pro-Tip footer */}
        <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
          <span className="truncate">
            💡 Mẹo: Bạn bè tránh dùng <span className="font-jp text-foreground font-bold">はい</span> (quá xa cách) · Công sở tránh <span className="font-jp text-foreground font-bold">マジで</span> (thất lễ).
          </span>
          <span className="font-mono text-[10px] text-primary shrink-0 font-bold hidden sm:inline">
            Cửa sổ: {currentWindow.label} ({currentWindow.ms > 0 ? `${(currentWindow.ms / 1000).toFixed(2)}s` : "∞"})
          </span>
        </div>
      </div>

      {/* ── Inline Config Strip (Pause Window, Duration, Trigger) ── */}
      <div className="shrink-0 grid grid-cols-1 md:grid-cols-12 gap-2 p-2 rounded-xl border border-border bg-card/95 washi-texture">
        {/* Pause window (5 cols) */}
        <div className="md:col-span-5 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-extrabold">
            <span className="text-muted-foreground flex items-center gap-1">
              <Gauge className="h-3 w-3 text-primary" />
              <span>Cửa sổ Pause:</span>
            </span>
            <span className="text-primary font-mono text-[10px] font-bold">
              {currentWindow.label} {currentWindow.ms > 0 ? `(${(currentWindow.ms / 1000).toFixed(2)}s)` : ""}
            </span>
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/40 border border-border">
            {WINDOW_LEVELS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  soundFX.playFurin();
                  setWindowProfile(w.id);
                }}
                className={cn(
                  "flex-1 py-1 rounded-md text-[10px] font-bold transition-all text-center cursor-pointer",
                  windowProfile === w.id
                    ? "bg-card text-foreground border border-border shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={w.label}
              >
                {w.ms > 0 ? `${(w.ms / 1000).toFixed(2)}s` : "∞"}
              </button>
            ))}
          </div>
        </div>

        {/* Session duration (4 cols) */}
        <div className="md:col-span-4 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-extrabold">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 text-primary" />
              <span>Thời lượng:</span>
            </span>
            <span className="text-primary font-mono text-[10px] font-bold">
              {duration === 0 ? "∞ Vô hạn" : `${duration}m`}
            </span>
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/40 border border-border">
            {DURATIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  soundFX.playFurin();
                  setDuration(d.id as any);
                }}
                className={cn(
                  "flex-1 py-1 rounded-md text-[10px] font-bold transition-all text-center cursor-pointer",
                  duration === d.id
                    ? "bg-card text-foreground border border-border shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {d.id === 0 ? "∞" : `${d.id}m`}
              </button>
            ))}
          </div>
        </div>

        {/* Start trigger (3 cols) */}
        <div className="md:col-span-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-extrabold">
            <span className="text-muted-foreground">Xuất phát:</span>
            <span className="text-primary text-[10px] font-bold">
              {startTrigger === "manual" ? "🎯 Chủ động" : "⚡ Tự động"}
            </span>
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/40 border border-border text-[10px]">
            <button
              type="button"
              onClick={() => {
                soundFX.playFurin();
                setStartTrigger?.("manual");
              }}
              className={cn(
                "flex-1 py-1 rounded-md font-bold transition-all text-center cursor-pointer",
                startTrigger === "manual"
                  ? "bg-card text-foreground border border-border shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              🎯 Space
            </button>
            <button
              type="button"
              onClick={() => {
                soundFX.playFurin();
                setStartTrigger?.("auto");
              }}
              className={cn(
                "flex-1 py-1 rounded-md font-bold transition-all text-center cursor-pointer",
                startTrigger === "auto"
                  ? "bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              ⚡ Auto
            </button>
          </div>
        </div>
      </div>

      {/* ── Prominent CTA Launch Button ── */}
      <div className="shrink-0">
        <Button
          onClick={() => {
            soundFX.playTaiko();
            onStart();
          }}
          disabled={loading}
          className="w-full h-10 sm:h-11 rounded-xl font-extrabold text-xs sm:text-sm shadow-md bg-gradient-to-r from-blue-600 via-primary to-indigo-600 hover:opacity-95 text-white gap-2 cursor-pointer transition-all active:scale-[0.99]"
        >
          <Play className="h-4 w-4 fill-current shrink-0" />
          <span>
            {loading ? "Đang tạo bài tập AI..." : `Bắt Đầu Luyện ${currentMode.label} • ${currentRelation.label} (${duration === 0 ? "Vô hạn" : `${duration} phút`})`}
          </span>
        </Button>
      </div>
    </div>
  );
}
