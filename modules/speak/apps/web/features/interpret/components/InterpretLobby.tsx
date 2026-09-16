"use client";

import React, { useState, useEffect } from "react";
import {
  Languages,
  Play,
  Clock,
  Keyboard,
  Sparkles,
  Shuffle,
  FileText,
  MessageSquare,
  Briefcase,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Users,
  AlertTriangle,
  Building2,
  Calendar,
  Coffee,
  Heart,
  Plane,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { soundFX } from "@/lib/sound-fx";
import { formatKeyDisplay } from "@/hooks/use-system-keybindings";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { isVietnameseVoiceAvailable } from "@/features/speaking/services/web-speech";
import type { InterpretRelation, InterpretScaffold, InterpretSubMode } from "../services/interpret-api";

export interface InterpretSubModeConfig {
  id: InterpretSubMode;
  label: string;
  subLabel: string;
  ja: string;
  icon: any;
  timerLimit: string;
  desc: string;
  badgeVariant: "matcha" | "kintsugi" | "fuji" | "sakura";
  iconColor: string;
  highlights: string[];
  example: { promptVi: string; expectedJa: string; referenceJa: string; referenceVi: string };
}

export const INTERPRET_SUB_MODES: InterpretSubModeConfig[] = [
  {
    id: "mixed",
    label: "Tổng Hợp",
    subLabel: "Adaptive",
    ja: "混合",
    icon: Shuffle,
    timerLimit: "8s - 30s",
    desc: "Trộn lẫn giữa từ vựng, dịch câu và dịch tình huống để rèn phản xạ ngôn ngữ toàn diện.",
    badgeVariant: "matcha",
    iconColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    highlights: [
      "Thử thách linh hoạt chuyển đổi giữa câu ngắn và tình huống",
      "Luyện tư duy phản xạ tiếng Nhật trực tiếp, tránh dịch thô",
      "Cân bằng giữa tốc độ bật âm và độ chuẩn xác ngữ pháp",
    ],
    example: {
      promptVi: "Hôm nay tôi phải làm thêm giờ khoảng 2 tiếng.",
      expectedJa: "今日 • 残業 • 2時間",
      referenceJa: "今日は2時間ほど残業しなければなりません。",
      referenceVi: "Hôm nay tôi phải tăng ca khoảng 2 tiếng.",
    },
  },
  {
    id: "interpret_word",
    label: "Từ / Cụm",
    subLabel: "Speed 8s ⚡",
    ja: "単語",
    icon: Sparkles,
    timerLimit: "8s",
    desc: "Bật ngay từ vựng hoặc cụm cố định tương ứng trong tiếng Nhật trong vòng 8 giây.",
    badgeVariant: "kintsugi",
    iconColor: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    highlights: [
      "Tối ưu tốc độ truy xuất từ vựng trong não bộ (< 8s)",
      "Nắm chắc các cụm từ collocations và thành ngữ thông dụng",
      "Xóa bỏ độ trễ 'ngắc ngứ' khi tìm từ trong giao tiếp",
    ],
    example: {
      promptVi: "Đơn phương chấm dứt hợp đồng",
      expectedJa: "一方的 • 契約解除",
      referenceJa: "契約の一方的な解除",
      referenceVi: "Việc đơn phương hủy bỏ hợp đồng.",
    },
  },
  {
    id: "interpret_sentence",
    label: "Dịch Câu",
    subLabel: "Sentence 20s 🎯",
    ja: "文",
    icon: FileText,
    timerLimit: "20s",
    desc: "Dịch trọn vẹn câu tiếng Việt sang tiếng Nhật giữ đủ ý chính, đúng trật tự SOV và tự nhiên.",
    badgeVariant: "fuji",
    iconColor: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
    highlights: [
      "Tập trung giữ đủ ý trọng tâm, không bỏ sót thông tin",
      "Chuẩn hóa cấu trúc SOV và trợ từ tiếng Nhật chính xác",
      "Chuyển ngữ mượt mà theo phong cách bản xứ",
    ],
    example: {
      promptVi: "Nếu có tài liệu nào chưa hiểu, hãy cứ thoải mái hỏi tôi nhé.",
      expectedJa: "資料 • 分からない • 気軽に • 聞く",
      referenceJa: "分からない資料があれば、遠慮なく聞いてくださいね。",
      referenceVi: "Nếu có tài liệu không hiểu, bạn cứ tự nhiên hỏi nhé.",
    },
  },
  {
    id: "interpret_situation",
    label: "Tình Huống",
    subLabel: "Roleplay 30s 💼",
    ja: "通訳",
    icon: MessageSquare,
    timerLimit: "30s",
    desc: "Phiên dịch trong bối cảnh công sở hoặc đời sống, kết hợp kính ngữ Keigo và quy tắc Wakimae.",
    badgeVariant: "sakura",
    iconColor: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
    highlights: [
      "Ứng biến tình huống thực tế tại công sở và đời sống Nhật",
      "Phối hợp nhuần nhuyễn Kính ngữ (Keigo) và Văn hóa ứng xử",
      "Luyện phong thái đĩnh đạc của một phiên dịch viên chuyên nghiệp",
    ],
    example: {
      promptVi: "Giải thích với khách hàng là giám đốc đang bận họp đột xuất nên sẽ đến muộn 15 phút.",
      expectedJa: "急な会議 • 15分 • 遅れる • 申し訳ない",
      referenceJa: "大変申し訳ございません。部長は急な会議が入っておりまして、15分ほど遅れて参ります。",
      referenceVi: "Vô cùng xin lỗi quý khách. Trưởng phòng có cuộc họp đột xuất nên sẽ đến muộn khoảng 15 phút.",
    },
  },
];

export const INTERPRET_TOPICS = [
  { id: "", label: "Trộn", ja: "すべて", icon: Layers, desc: "Trộn đa dạng đề tài" },
  { id: "workplace", label: "Công sở", ja: "職場", icon: Building2, desc: "Họp hành, báo cáo, đàm phán" },
  { id: "tet_holiday", label: "Tết / Lễ", ja: "テト", icon: Calendar, desc: "Chúc tết, phong tục, nghỉ lễ" },
  { id: "daily_life", label: "Đời sống", ja: "生活", icon: Coffee, desc: "Mua sắm, nhà hàng, đi lại" },
  { id: "family", label: "Gia đình", ja: "家族", icon: Heart, desc: "Thăm hỏi, chăm sóc, sinh hoạt" },
  { id: "travel", label: "Du lịch", ja: "旅行", icon: Plane, desc: "Đặt phòng, hỏi đường, tham quan" },
] as const;

export const RELATIONS = [
  {
    id: "casual_friend" as const,
    label: "Bạn Bè",
    subLabel: "タメ口 • Thể thường",
    icon: Users,
    desc: "Giao tiếp thoải mái, từ ngữ gần gũi, câu ngắn tự nhiên.",
  },
  {
    id: "business_polite" as const,
    label: "Công Sở",
    subLabel: "丁寧語 • Kính ngữ",
    icon: Briefcase,
    desc: "Môi trường công việc, lịch sự, đúng mực văn hóa Nhật.",
  },
] as const;

const DURATIONS = [
  { id: 0, label: "∞ Vô hạn" },
  { id: 3, label: "3 phút" },
  { id: 5, label: "5 phút" },
  { id: 10, label: "10 phút" },
  { id: 20, label: "20 phút" },
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
  startTrigger = "manual",
  setStartTrigger,
  onStart,
  loading,
  keybindings,
  onOpenHelp,
  onOpenCheatsheet,
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
  onOpenCheatsheet?: () => void;
}) {
  const [showSample, setShowSample] = useState(false);
  const [hasViVoice, setHasViVoice] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setHasViVoice(isVietnameseVoiceAvailable());
    check();
    const t = setTimeout(check, 800);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => check();
    }
    return () => clearTimeout(t);
  }, []);

  const currentMode = INTERPRET_SUB_MODES.find((m) => m.id === subMode) || INTERPRET_SUB_MODES[0];
  const currentTopic = INTERPRET_TOPICS.find((t) => t.id === topic) || INTERPRET_TOPICS[0];
  const currentRelation = RELATIONS.find((r) => r.id === relation) || RELATIONS[0];
  const currentExample = currentMode.example;

  return (
    <div className="w-full max-w-[1600px] mx-auto h-[calc(100vh-3.5rem)] flex flex-col justify-between p-2 sm:p-3 gap-2 sm:gap-2.5 overflow-hidden select-none animate-in fade-in duration-200">
      {/* ── Top Header Bar ── */}
      <div className="shrink-0 rounded-xl border border-border bg-card/95 washi-texture px-3 py-2 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
              <Languages className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
                  Phản Xạ Dịch Việt - Nhật
                </h1>
                <Badge variant="matcha" size="sm" className="text-[10px] font-mono font-bold px-1.5 py-0">
                  越日通訳
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                Cầu nối phiên dịch Việt→Nhật — giữ trọn ý chính, đúng trật tự SOV, tự nhiên như bản xứ.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
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
                <span>Phím tắt ({formatKeyDisplay(keybindings?.interpretToggleHelp || "?")})</span>
              </Button>
            )}
          </div>
        </div>

        {/* Compact VI Voice Alert if absent */}
        {hasViVoice === false && (
          <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 flex items-center gap-2 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <p className="text-amber-700 dark:text-amber-300 font-medium text-[11px] truncate">
              Máy chưa cài giọng đọc Tiếng Việt (TTS) — đề sẽ hiển thị văn bản trực quan để bạn đọc dịch.
            </p>
          </div>
        )}
      </div>

      {/* ── SubMode Horizontal Segmented Selector Bar (4 Kiểu Luyện) ── */}
      <div className="shrink-0 space-y-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            1. Chọn Kiểu Luyện
          </span>
          <span className="text-[11px] text-primary font-mono font-bold">
            {currentMode.label} • {currentMode.ja} ({currentMode.timerLimit})
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-muted/40 border border-border">
          {INTERPRET_SUB_MODES.map((m) => {
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
                  "relative flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  active
                    ? "bg-card text-foreground shadow-xs border border-border/80 ring-1 ring-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-primary" : "opacity-70")} />
                <span className="truncate">{m.label}</span>
                <span className="text-[10px] font-normal opacity-60 hidden md:inline">({m.timerLimit})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Topic Horizontal Segmented Selector Bar (6 Chủ Đề) ── */}
      <div className="shrink-0 space-y-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            2. Chọn Chủ Đề Phiên Dịch
          </span>
          <span className="text-[11px] text-primary font-mono font-bold">
            {currentTopic.label} • {currentTopic.ja}
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1 rounded-xl bg-muted/40 border border-border">
          {INTERPRET_TOPICS.map((t) => {
            const active = topic === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  soundFX.playFurin();
                  setTopic(t.id);
                }}
                className={cn(
                  "relative flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  active
                    ? "bg-card text-foreground shadow-xs border border-border/80 ring-1 ring-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-primary" : "opacity-70")} />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Relation (Wakimae) Segmented Bar (2 Quan Hệ) ── */}
      <div className="shrink-0 space-y-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            3. Quan Hệ Xã Giao (Wakimae)
          </span>
          <span className="text-[11px] text-primary font-mono font-bold">
            {currentRelation.subLabel}
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
                  "relative flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  active
                    ? "bg-card text-foreground shadow-xs border border-border/80 ring-1 ring-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-primary" : "opacity-70")} />
                <span>{r.label}</span>
                <span className="text-[10px] font-normal opacity-60">({r.subLabel})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Mode Summary & Collapsible Sample Card ── */}
      <div className="shrink-0 rounded-xl border border-border/80 bg-card/90 washi-texture px-3 py-2 transition-all shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant={currentMode.badgeVariant} size="sm" className="font-bold text-[10px] shrink-0">
              {currentMode.subLabel}
            </Badge>
            <p className="text-xs text-foreground/90 font-medium truncate">
              {currentMode.desc}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFX.playFurin();
              setShowSample((prev) => !prev);
            }}
            className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer shrink-0 self-end sm:self-auto"
          >
            <span>{showSample ? "Thu gọn mẫu" : "Xem câu mẫu đối chiếu"}</span>
            {showSample ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Collapsible Sample Box */}
        {showSample && (
          <div className="mt-2 pt-2 border-t border-border/60 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-muted/50 p-2 border border-border/50 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Đề bài Tiếng Việt:
                </span>
                <p className="font-medium text-foreground">
                  「{currentExample.promptVi}」
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Ý chính JA: <span className="font-mono font-bold text-primary">{currentExample.expectedJa}</span>
                </p>
              </div>
              <div className="rounded-lg bg-primary/5 p-2 border border-primary/20 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Bản Dịch Chuẩn Nhật (Model Reference):
                </span>
                <p className="font-bold text-foreground">
                  <UniversalFurigana text={currentExample.referenceJa} forceDisplayMode="kanji_reading" fontSize="sm" />
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Dịch nghĩa: {currentExample.referenceVi}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] font-bold text-muted-foreground">Điểm nhấn:</span>
              {currentMode.highlights.map((h, i) => (
                <span
                  key={i}
                  className="inline-flex items-center text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40"
                >
                  • {h}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Action Bar & Config Strip ── */}
      <div className="shrink-0 rounded-xl border border-border bg-card/95 washi-texture p-2.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Inline Config Selectors */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center sm:justify-start w-full sm:w-auto">
          {/* Scaffold Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Gợi ý:</span>
            <div className="flex items-center p-0.5 rounded-lg bg-muted/50 border border-border">
              {(["keyword_hint", "sentence_starter", "none"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    soundFX.playFurin();
                    setScaffold(s);
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                    scaffold === s
                      ? "bg-card text-foreground shadow-2xs border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title={s === "none" ? "Blind tự lực" : s === "keyword_hint" ? "Gợi ý ý chính JA" : "Gợi ý mở đầu"}
                >
                  {s === "keyword_hint" ? "Gợi ý JA" : s === "sentence_starter" ? "Mở đầu" : "Blind"}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Selector */}
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <div className="flex items-center p-0.5 rounded-lg bg-muted/50 border border-border">
              {DURATIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    soundFX.playFurin();
                    setDuration(d.id as any);
                  }}
                  className={cn(
                    "px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                    duration === d.id
                      ? "bg-card text-foreground shadow-2xs border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {d.id === 0 ? "∞" : `${d.id}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Trigger Selector */}
          {setStartTrigger && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground">Bắt đầu:</span>
              <div className="flex items-center p-0.5 rounded-lg bg-muted/50 border border-border">
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playFurin();
                    setStartTrigger("manual");
                  }}
                  className={cn(
                    "px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                    startTrigger === "manual"
                      ? "bg-card text-foreground shadow-2xs border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  🎯 Space
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playFurin();
                    setStartTrigger("auto");
                  }}
                  className={cn(
                    "px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                    startTrigger === "auto"
                      ? "bg-amber-500 text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  ⚡ Auto
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CTA Launch Button */}
        <Button
          onClick={() => {
            soundFX.playTaiko();
            onStart();
          }}
          disabled={loading}
          className="w-full sm:w-auto h-10 px-5 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-blue-600 via-primary to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md cursor-pointer transition-all duration-150 gap-2 shrink-0 ring-1 ring-primary/30"
        >
          <Play className="h-4 w-4 fill-current" />
          <span>{loading ? "Đang chuẩn bị đề..." : `Bắt Đầu Phiên Dịch (${currentMode.label} · ${currentTopic.label})`}</span>
          <kbd className="hidden md:inline text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/20 text-white font-bold">
            Space
          </kbd>
        </Button>
      </div>
    </div>
  );
}
