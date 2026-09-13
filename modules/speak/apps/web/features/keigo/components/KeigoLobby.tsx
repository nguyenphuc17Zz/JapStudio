"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Crown,
  Play,
  Settings2,
  Keyboard,
  Shuffle,
  Sparkles,
  BookOpen,
  Users,
  Repeat,
  ShieldAlert,
  Compass,
  CheckCircle2,
  Zap,
  Sliders,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { soundFX } from "@/lib/sound-fx";
import type { PressureLevel } from "../services/keigo-api";
import { VocabularyLevelSelect } from "@/components/japanese/VocabularyLevelSelect";

export const BCCWJ_TIERS = [
  { tier: 0, label: "Tất cả (4.2k)" },
  { tier: 1, label: "🔥 Top 1k" },
  { tier: 2, label: "⭐ Top 3k" },
  { tier: 3, label: "💎 Top 5k" },
] as const;

export const BCCWJ_CATEGORIES = [
  { id: "all", label: "Tất cả chủ đề" },
  { id: "workplace_biz", label: "Công sở" },
  { id: "daily_life", label: "Đời sống" },
  { id: "action_verbs", label: "Hành động" },
  { id: "emotions_adj", label: "Cảm xúc" },
] as const;

export interface KeigoSubModeConfig {
  id: string;
  label: string;
  subLabel: string;
  ja: string;
  icon: any;
  desc: string;
  exampleSource: string;
  exampleTarget: string;
  badgeVariant: "sakura" | "kintsugi" | "matcha" | "fuji" | "jlpt" | "torii" | "akane";
  iconColor: string;
}

export const KEIGO_SUB_MODES: KeigoSubModeConfig[] = [
  {
    id: "mixed",
    label: "総合特訓",
    subLabel: "Mixed Adaptive",
    ja: "総合",
    icon: Shuffle,
    desc: "AI tự động đảo bài 8 chuyên đề theo điểm yếu của bạn",
    exampleSource: "Tình huống hỗn hợp",
    exampleTarget: "Phản xạ toàn diện",
    badgeVariant: "kintsugi",
    iconColor: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "keigo_vocab_blitz",
    label: "単語瞬間反射",
    subLabel: "Verb Flash-Blitz ⚡",
    ja: "単語",
    icon: Zap,
    desc: "Luyện phản xạ cơ bắp 1-1 cho 15+ động từ bất quy tắc cốt lõi",
    exampleSource: "言う (Nói) ➔ Khiêm nhường",
    exampleTarget: "申す / 申し上げる",
    badgeVariant: "akane",
    iconColor: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  },
  {
    id: "keigo_sonkeigo",
    label: "尊敬語",
    subLabel: "Sonkeigo ↑",
    ja: "尊敬",
    icon: Crown,
    desc: "Nâng cao hành động và trạng thái của khách hàng, đối tác, cấp trên",
    exampleSource: "食べる (Ăn)",
    exampleTarget: "召し上がる",
    badgeVariant: "sakura",
    iconColor: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  },
  {
    id: "keigo_kenjougo",
    label: "謙譲語",
    subLabel: "Kenjougo ↓",
    ja: "謙譲",
    icon: Users,
    desc: "Hạ thấp hành động của bản thân / nhóm mình khi nói với người ngoài",
    exampleSource: "言う (Nói)",
    exampleTarget: "申す / 申し上げる",
    badgeVariant: "matcha",
    iconColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "keigo_teineigo",
    label: "丁寧語・美化語",
    subLabel: "Teineigo",
    ja: "丁寧",
    icon: Sparkles,
    desc: "Quy chuẩn desu/masu, gozaimasu và thêm tiền tố mỹ từ お/ご",
    exampleSource: "水 / 会社",
    exampleTarget: "お水 / 貴社・御社",
    badgeVariant: "fuji",
    iconColor: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  },
  {
    id: "keigo_transformation",
    label: "言葉遣い変換",
    subLabel: "Register Shift",
    ja: "変換",
    icon: Repeat,
    desc: "Chuyển đổi tức thì giữa Thân mật (Tameguchi) ⇄ Kính ngữ thương mại",
    exampleSource: "明日、社長に会うよ",
    exampleTarget: "明日、社長にお会いします",
    badgeVariant: "kintsugi",
    iconColor: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "keigo_context",
    label: "ウチ・ソト特訓",
    subLabel: "Uchi / Soto",
    ja: "内外",
    icon: Compass,
    desc: "Thử thách chọn đúng hướng Kính ngữ theo quan hệ Trong - Ngoài",
    exampleSource: "Nói về sếp mình với khách",
    exampleTarget: "社長の田中が申しました",
    badgeVariant: "torii",
    iconColor: "text-sky-500 bg-sky-500/10 border-sky-500/20",
  },
  {
    id: "keigo_doctor",
    label: "敬語診断",
    subLabel: "Keigo Doctor",
    ja: "診断",
    icon: ShieldAlert,
    desc: "Phát hiện và sửa lỗi Nhị trùng kính ngữ (Double Keigo) & lộn hướng",
    exampleSource: "おっしゃられる ❌",
    exampleTarget: "おっしゃる ✅",
    badgeVariant: "akane",
    iconColor: "text-rose-600 bg-rose-600/10 border-rose-600/20",
  },
  {
    id: "keigo_naturalness",
    label: "自然度判定",
    subLabel: "Naturalness",
    ja: "自然",
    icon: CheckCircle2,
    desc: "Đo độ tự nhiên: Phân biệt câu chuẩn Nhật vs câu ngượng gạo",
    exampleSource: "ご苦労様です (Sai ngữ cảnh)",
    exampleTarget: "お疲れ様でございます ✅",
    badgeVariant: "jlpt",
    iconColor: "text-teal-500 bg-teal-500/10 border-teal-500/20",
  },
];

export const PRESSURE_LEVELS = [
  { id: "infinite", label: "Vô hạn", icon: "♾️", ms: 0, desc: "∞ Không giới hạn" },
  { id: "relaxed", label: "Dễ", icon: "🐢", ms: 6000, desc: "6.0s" },
  { id: "normal", label: "Tiêu chuẩn", icon: "🚶", ms: 5000, desc: "5.0s" },
  { id: "fast", label: "Nhanh", icon: "🏃", ms: 4000, desc: "4.0s" },
  { id: "reflex", label: "Phản xạ", icon: "⚡", ms: 3000, desc: "3.0s" },
  { id: "extreme", label: "Cực hạn", icon: "🔥", ms: 2000, desc: "2.0s" },
] as const;

export const DURATIONS = [0, 3, 5, 10, 20] as const;

interface Props {
  subMode: string;
  setSubMode: (m: string) => void;
  pressure: PressureLevel;
  setPressure: (p: PressureLevel) => void;
  subtitleMode: "hidden" | "japanese" | "japanese_reading" | "vietnamese";
  setSubtitleMode: (m: "hidden" | "japanese" | "japanese_reading" | "vietnamese") => void;
  duration: 0 | 3 | 5 | 10 | 20;
  setDuration: (d: 0 | 3 | 5 | 10 | 20) => void;
  tier?: number;
  setTier?: (tier: number) => void;
  category?: string;
  setCategory?: (category: string) => void;
  autoNext: boolean;
  setAutoNext: (v: boolean | ((prev: boolean) => boolean)) => void;
  startTrigger: "manual" | "auto";
  setStartTrigger: (t: "manual" | "auto") => void;
  onStartSession: () => void;
  onOpenCheatsheet: () => void;
  onOpenHelp: () => void;
  selectedFormulas?: string[];
  onOpenFormulaFilter?: () => void;
  error?: string | null;
}

export function KeigoLobby({
  subMode,
  setSubMode,
  pressure,
  setPressure,
  subtitleMode,
  setSubtitleMode,
  duration,
  setDuration,
  tier = 0,
  setTier = () => {},
  category = "all",
  setCategory = () => {},
  autoNext,
  setAutoNext,
  startTrigger,
  setStartTrigger,
  onStartSession,
  onOpenCheatsheet,
  onOpenHelp,
  selectedFormulas = [],
  onOpenFormulaFilter,
  error,
}: Props) {
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);

  const selectedMode = KEIGO_SUB_MODES.find((m) => m.id === subMode) || KEIGO_SUB_MODES[0];
  const selectedPressure = PRESSURE_LEVELS.find((p) => p.id === pressure) || PRESSURE_LEVELS[1];

  const mixedMode = KEIGO_SUB_MODES.find((m) => m.id === "mixed") || KEIGO_SUB_MODES[0];
  const coreModes = KEIGO_SUB_MODES.filter((m) =>
    ["keigo_vocab_blitz", "keigo_sonkeigo", "keigo_kenjougo", "keigo_teineigo"].includes(m.id)
  );
  const practicalModes = KEIGO_SUB_MODES.filter((m) =>
    ["keigo_transformation", "keigo_context", "keigo_doctor", "keigo_naturalness"].includes(m.id)
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300 max-w-[1600px] w-full mx-auto pb-8 h-full overflow-y-auto pr-1">
      {/* 1. Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 sm:p-5 washi-texture shadow-2xs">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-enso-gradient opacity-30 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs shrink-0">
                <Crown className="h-4 w-4" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground font-jp flex items-center gap-2">
                  <span>敬語スタジオ</span>
                  <Badge variant="kintsugi" size="sm">Mode 2</Badge>
                </h1>
                <p className="text-[11px] text-muted-foreground">
                  Luyện phản xạ Kính ngữ & Văn phong công sở Nhật Bản
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenCheatsheet}
              className="gap-1 text-xs font-bold border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 h-8 px-2.5 rounded-xl"
            >
              <BookOpen className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Submode Selection (Unified 1-Page Layout) */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>1. Chọn Chuyên Đề Kính Ngữ:</span>
            </h2>
            <span className="text-[11px] text-muted-foreground font-medium">
              9 chuyên đề luyện tập toàn diện
            </span>
          </div>

          {/* Mixed Adaptive Hero Card */}
          {mixedMode && (() => {
            const isActive = subMode === mixedMode.id;
            const IconComp = mixedMode.icon;
            return (
              <button
                type="button"
                onClick={() => {
                  soundFX.playFurin();
                  setSubMode(mixedMode.id);
                }}
                className={cn(
                  "w-full text-left rounded-2xl border p-3 sm:p-3.5 transition-all flex flex-col justify-between space-y-2 washi-texture cursor-pointer relative group",
                  isActive
                    ? "border-amber-500 bg-amber-500/10 shadow-2xs ring-1 ring-amber-500/40"
                    : "border-amber-500/30 hover:border-amber-500/60 bg-gradient-to-r from-amber-500/5 via-card to-card hover:shadow-2xs"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="h-8 w-8 rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                      <IconComp className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-foreground font-jp">{mixedMode.label}</span>
                        <span className="text-[11px] text-muted-foreground font-sans">({mixedMode.subLabel})</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{mixedMode.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant={mixedMode.badgeVariant} size="sm" className="text-[10px] px-2 py-0.5">
                      {mixedMode.ja}
                    </Badge>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-amber-500/20 flex items-center justify-between text-[11px] text-muted-foreground font-jp">
                  <span className="truncate max-w-[45%]">{mixedMode.exampleSource}</span>
                  <span className="text-amber-500 font-bold px-2">➔</span>
                  <span className="font-bold text-foreground truncate max-w-[45%] text-right">{mixedMode.exampleTarget}</span>
                </div>

                {/* Filter Pill on Mixed Hero Card */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    soundFX.playFurin();
                    onOpenFormulaFilter?.();
                  }}
                  className="w-full py-1.5 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center justify-between transition-colors mt-1"
                >
                  <span className="flex items-center gap-1.5">
                    <Sliders className="h-3 w-3" />
                    <span>
                      Công thức: {selectedFormulas.length === 0 || selectedFormulas.includes("__none__") ? "Tất cả 10 công thức (Toàn diện)" : `${selectedFormulas.length} công thức đã chọn`}
                    </span>
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Chọn công thức ›</span>
                </div>
              </button>
            );
          })()}

          {/* Group 1: Kính Ngữ Cốt Lõi (Core Reflex) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <h3 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                <span className="text-rose-500">⚡</span>
                <span>Kính Ngữ Cốt Lõi (Core Reflex)</span>
              </h3>
              <span className="text-[10px] text-muted-foreground">4 chuyên đề</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
              {coreModes.map((m) => {
                const isActive = subMode === m.id;
                const IconComp = m.icon;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      soundFX.playFurin();
                      setSubMode(m.id);
                    }}
                    className={cn(
                      "text-left rounded-2xl border p-2.5 sm:p-3 transition-all flex flex-col justify-between space-y-1.5 washi-texture cursor-pointer relative group",
                      isActive
                        ? "border-primary bg-primary/8 shadow-2xs ring-1 ring-primary/30"
                        : "border-border/80 hover:border-primary/40 bg-card hover:shadow-2xs"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-7 w-7 rounded-lg border flex items-center justify-center shrink-0 text-xs", m.iconColor)}>
                          <IconComp className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <span className="text-xs font-bold text-foreground font-jp">{m.label}</span>
                          <span className="text-[10px] text-muted-foreground ml-1 font-sans">({m.subLabel})</span>
                        </div>
                      </div>
                      <Badge variant={m.badgeVariant} size="sm" className="text-[10px] px-1.5 py-0">{m.ja}</Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1">{m.desc}</p>

                    <div className="pt-1 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground font-jp">
                      <span className="truncate max-w-[45%]">{m.exampleSource}</span>
                      <span className="text-primary font-bold">➔</span>
                      <span className="font-bold text-foreground truncate max-w-[45%] text-right">{m.exampleTarget}</span>
                    </div>

                    {/* Filter Action Pill on Core Cards */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        soundFX.playFurin();
                        onOpenFormulaFilter?.();
                      }}
                      className="w-full py-1 px-2 rounded-lg bg-muted/60 hover:bg-muted border border-border/80 text-[10px] font-bold text-foreground flex items-center justify-between transition-colors mt-0.5"
                    >
                      <span className="flex items-center gap-1 truncate">
                        <Sliders className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                        <span className="truncate">
                          {selectedFormulas.length === 0 || selectedFormulas.includes("__none__") ? "Tất cả 10 công thức" : `${selectedFormulas.length} đã lọc`}
                        </span>
                      </span>
                      <span className="text-primary text-[9px] shrink-0 font-semibold">Lọc ›</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group 2: Ngữ Cảnh & Thực Chiến (Context & Situational) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <h3 className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                <span className="text-sky-500">⚔️</span>
                <span>Ngữ Cảnh & Thực Chiến (Context & Situational)</span>
              </h3>
              <span className="text-[10px] text-muted-foreground">4 chuyên đề</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
              {practicalModes.map((m) => {
                const isActive = subMode === m.id;
                const IconComp = m.icon;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      soundFX.playFurin();
                      setSubMode(m.id);
                    }}
                    className={cn(
                      "text-left rounded-2xl border p-2.5 sm:p-3 transition-all flex flex-col justify-between space-y-1.5 washi-texture cursor-pointer relative group",
                      isActive
                        ? "border-primary bg-primary/8 shadow-2xs ring-1 ring-primary/30"
                        : "border-border/80 hover:border-primary/40 bg-card hover:shadow-2xs"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-7 w-7 rounded-lg border flex items-center justify-center shrink-0 text-xs", m.iconColor)}>
                          <IconComp className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <span className="text-xs font-bold text-foreground font-jp">{m.label}</span>
                          <span className="text-[10px] text-muted-foreground ml-1 font-sans">({m.subLabel})</span>
                        </div>
                      </div>
                      <Badge variant={m.badgeVariant} size="sm" className="text-[10px] px-1.5 py-0">{m.ja}</Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1">{m.desc}</p>

                    <div className="pt-1 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground font-jp">
                      <span className="truncate max-w-[45%]">{m.exampleSource}</span>
                      <span className="text-primary font-bold">➔</span>
                      <span className="font-bold text-foreground truncate max-w-[45%] text-right">{m.exampleTarget}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Fast Settings Cockpit */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-3">
          <Card className="p-3.5 space-y-3.5 border-border/90 bg-card shadow-2xs washi-texture">
            {/* BCCWJ Vocabulary Tier & Topic Dropdown Cockpit */}
            <VocabularyLevelSelect
              tier={tier}
              setTier={setTier}
              category={category}
              setCategory={setCategory}
              variant="default"
            />

            {/* Keigo Formula Selector Cockpit */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground flex items-center gap-1">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                  <span>Công Thức Kính Ngữ:</span>
                </span>
                <span className="text-primary font-mono text-[11px]">
                  {selectedFormulas.length > 0 && !selectedFormulas.includes("__none__")
                    ? `${selectedFormulas.length}/10`
                    : "Tất cả 10"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundFX.playFurin();
                  onOpenFormulaFilter?.();
                }}
                className="w-full py-2 px-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-xs font-bold text-foreground flex items-center justify-between transition-colors shadow-2xs cursor-pointer"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">
                    {selectedFormulas.length > 0 && !selectedFormulas.includes("__none__")
                      ? `${selectedFormulas.length} công thức đã chọn`
                      : "Tất cả 10 công thức (Toàn diện)"}
                  </span>
                </span>
                <span className="text-[10px] text-primary font-semibold shrink-0">Đổi ›</span>
              </button>
            </div>

            {/* Pressure Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground">Áp Lực Thời Gian:</span>
                <span className="text-primary font-mono text-[11px]">
                  {selectedPressure.ms > 0 ? `${selectedPressure.ms / 1000}s / câu` : "∞ Vô hạn"}
                </span>
              </div>
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/50 border border-border">
                {PRESSURE_LEVELS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPressure(p.id as any)}
                    className={cn(
                      "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all text-center",
                      pressure === p.id
                        ? "bg-card text-foreground border border-border shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {p.id === "infinite" ? "∞ Vô hạn" : p.desc}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground">Thời Lượng Phiên:</span>
                <span className="text-primary font-mono text-[11px]">{duration === 0 ? "∞ Vô hạn" : `${duration} phút`}</span>
              </div>
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/50 border border-border">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={cn(
                      "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all text-center",
                      duration === d
                        ? "bg-card text-foreground border border-border shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {d === 0 ? "∞" : `${d}m`}
                  </button>
                ))}
              </div>
            </div>

            {/* Progressive Disclosure: Subtitles & Auto Next */}
            <div className="border border-border/80 rounded-xl bg-muted/20 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsAdvancedOpen((v) => !v)}
                className="w-full px-2.5 py-1.5 flex items-center justify-between text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Phụ đề & Tự chuyển câu</span>
                <span className="text-[10px] text-primary">{isAdvancedOpen ? "▲" : "▼"}</span>
              </button>

              {isAdvancedOpen && (
                <div className="p-2.5 pt-1 space-y-2 border-t border-border/60 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    {[
                      { id: "japanese", label: "Kanji" },
                      { id: "japanese_reading", label: "Kanji + Kana" },
                      { id: "vietnamese", label: "Dịch Việt" },
                      { id: "hidden", label: "Audio-Only 🎧" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSubtitleMode(m.id as any)}
                        className={cn(
                          "py-1 rounded-lg font-bold border transition-all text-center",
                          subtitleMode === m.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border hover:bg-muted text-foreground"
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-muted-foreground">Tự chuyển câu:</span>
                    <button
                      onClick={() => setAutoNext((v) => !v)}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all",
                        autoNext ? "bg-emerald-600 text-white border-emerald-600" : "bg-muted border-border text-muted-foreground"
                      )}
                    >
                      {autoNext ? "BẬT" : "TẮT"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Big CTA Button */}
            <Button
              variant="akane"
              size="lg"
              className="w-full font-bold gap-2 text-xs shadow-md h-10 rounded-xl"
              onClick={onStartSession}
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Bắt Đầu {duration === 0 ? "Vô Hạn" : `${duration}p`} • {selectedMode.ja}</span>
            </Button>

            {error && (
              <div className="text-[11px] text-red-600 border border-red-200 bg-red-50 dark:bg-red-950/20 rounded-xl p-2">
                {error}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
