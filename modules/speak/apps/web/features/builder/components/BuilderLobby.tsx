"use client";

import React, { useState } from "react";
import {
  Blocks,
  Play,
  Clock,
  Keyboard,
  Sparkles,
  Shuffle,
  Puzzle,
  Maximize2,
  Wrench,
  ChevronDown,
  ChevronUp,
  Volume2,
  BookOpen,
  Layers,
  Users,
  Briefcase,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { soundFX } from "@/lib/sound-fx";
import { formatKeyDisplay } from "@/hooks/use-system-keybindings";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { BUILDER_SKILLS, SCAFFOLDS } from "../services/builder-api";
import type { BuilderRelation, BuilderScaffold, BuilderSkill, BuilderSubMode } from "../services/builder-api";

export interface BuilderSubModeConfig {
  id: BuilderSubMode;
  label: string;
  subLabel: string;
  ja: string;
  icon: any;
  desc: string;
  badgeVariant: "matcha" | "kintsugi" | "fuji" | "sakura";
  iconColor: string;
  highlights: string[];
  exampleAssemble: { prompt: string; promptVi: string; target: string; targetVi: string };
  exampleExpand: { prompt: string; promptVi: string; target: string; targetVi: string };
  exampleRepair: { prompt: string; promptVi: string; target: string; targetVi: string };
}

export const BUILDER_SUB_MODES: BuilderSubModeConfig[] = [
  {
    id: "mixed",
    label: "Tổng Hợp",
    subLabel: "Adaptive",
    ja: "混合",
    icon: Shuffle,
    desc: "Trộn lẫn giữa nối từ, mở rộng câu cụt và sửa câu lủng củng để rèn phản xạ ngữ pháp toàn diện.",
    badgeVariant: "matcha",
    iconColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    highlights: [
      "Thử thách linh hoạt đa dạng hình thức câu",
      "Khai phóng tư duy lắp ráp câu phức tự nhiên",
      "Cân bằng giữa tốc độ ghép từ và độ chuẩn xác",
    ],
    exampleAssemble: {
      prompt: "Từ khóa: [ 図書館 / 本 / 借りる / 読む ]",
      promptVi: "Từ khóa: Thư viện / Sách / Mượn / Đọc",
      target: "「図書館で本を借りて、家でゆっくり読みました。」",
      targetVi: "Tôi mượn sách ở thư viện rồi về nhà thong thả đọc.",
    },
    exampleExpand: {
      prompt: "Câu gốc:「日本語を勉強しています。」 (Tôi đang học tiếng Nhật)",
      promptVi: "Yêu cầu: Nối thêm lý do (tương lai muốn sang Nhật làm việc)",
      target: "「将来日本で働きたいので、毎日一生懸命日本語を勉強しています。」",
      targetVi: "Vì tương lai muốn làm việc tại Nhật nên hàng ngày tôi đều chăm chỉ học.",
    },
    exampleRepair: {
      prompt: "Câu lỗi:「雨が降った、だから傘を買いました。」",
      promptVi: "Câu bị cứng/dịch từ tiếng Việt sang: Trời mưa, vì thế tôi mua ô.",
      target: "「雨が降ってきたので、コンビニで傘を買いました。」",
      targetVi: "Trời đổ mưa nên tôi đã ghé cửa hàng tiện lợi mua ô.",
    },
  },
  {
    id: "sentence_assemble",
    label: "Nối Từ",
    subLabel: "Assemble 🧩",
    ja: "文立て",
    icon: Puzzle,
    desc: "Từ 3-4 từ khóa mồi, lắp ghép trợ từ và liên từ để tạo thành 1 câu dài trọn vẹn ý nghĩa.",
    badgeVariant: "kintsugi",
    iconColor: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    highlights: [
      "Luyện dùng chính xác trợ từ は/が/を/に/で/と",
      "Ghép nối các hành động liên tiếp mượt mà",
      "Tập phản xạ tư duy trật tự câu tiếng Nhật SOV",
    ],
    exampleAssemble: {
      prompt: "Từ khóa: [ 週末 / 友達 / 映画 / 見る ]",
      promptVi: "Từ khóa: Cuối tuần / Bạn bè / Phim / Xem",
      target: "「先週末、友達と一緒に映画を見に行きました。」",
      targetVi: "Cuối tuần trước tôi đã cùng bạn đi xem phim.",
    },
    exampleExpand: {
      prompt: "Câu mồi: [ 会議 / 資料 / 作成 ]",
      promptVi: "Từ khóa: Cuộc họp / Tài liệu / Soạn thảo",
      target: "「明日の会議で使う資料を急いで作成しています。」",
      targetVi: "Tôi đang khẩn trương soạn tài liệu dùng cho cuộc họp ngày mai.",
    },
    exampleRepair: {
      prompt: "Câu mồi: [ 荷物 / 送る / 届く ]",
      promptVi: "Từ khóa: Hành lý / Gửi / Đến nơi",
      target: "「昨日送った荷物が、先ほど無事に届いたそうです。」",
      targetVi: "Nghe nói kiện hàng gửi hôm qua vừa mới tới nơi an toàn.",
    },
  },
  {
    id: "sentence_expand",
    label: "Mở Rộng",
    subLabel: "Expand 🚀",
    ja: "文拡大",
    icon: Maximize2,
    desc: "Biến 1 câu ngắn cụt thành câu dài bằng cách thêm mệnh đề nguyên nhân, điều kiện hoặc ví dụ.",
    badgeVariant: "fuji",
    iconColor: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
    highlights: [
      "Xóa bỏ dứt điểm tật nói câu cụt lủn",
      "Kéo dài độ dài câu nói lên 10-20 giây tự nhiên",
      "Sử dụng thuần thục các liên từ から/ので/たら/ば",
    ],
    exampleAssemble: {
      prompt: "Câu ngắn:「車を買いました。」 (Tôi đã mua ô tô)",
      promptVi: "Yêu cầu: Thêm lý do đi làm xa và đi lại tiện lợi",
      target: "「通勤に便利なので、先月思い切って車を買いました。」",
      targetVi: "Vì đi làm cho tiện nên tháng trước tôi đã quyết định mua xe ô tô.",
    },
    exampleExpand: {
      prompt: "Câu ngắn:「旅行が好きです。」 (Tôi thích du lịch)",
      promptVi: "Yêu cầu: Thêm trải nghiệm văn hóa và ẩm thực địa phương",
      target: "「各地の美味しい料理を食べたり文化に触れたりできるので、旅行が大好きです。」",
      targetVi: "Vì có thể thưởng thức món ngon và trải nghiệm văn hóa khắp nơi nên tôi rất thích du lịch.",
    },
    exampleRepair: {
      prompt: "Câu ngắn:「忙しいです。」 (Tôi bận)",
      promptVi: "Yêu cầu: Thêm nguyên nhân dự án mới vào giai đoạn nước rút",
      target: "「新しいプロジェクトの納期が迫っているため、今週は非常に忙しいです。」",
      targetVi: "Vì thời hạn dự án mới đang cận kề nên tuần này tôi vô cùng bận rộn.",
    },
  },
  {
    id: "sentence_repair",
    label: "Sửa Câu",
    subLabel: "Repair 🔧",
    ja: "文修理",
    icon: Wrench,
    desc: "Phát hiện câu lủng củng, diễn đạt gượng gạo do dịch từ tiếng Việt và sửa lại chuẩn giọng bản xứ.",
    badgeVariant: "sakura",
    iconColor: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
    highlights: [
      "Loại bỏ lối tư duy dịch từng từ (Word-by-word)",
      "Làm quen với các cách diễn đạt tự nhiên của người Nhật",
      "Nâng cấp phong cách nói từ nghiệp dư lên chuyên nghiệp",
    ],
    exampleAssemble: {
      prompt: "Câu gượng:「日本語が上手になりたい、だから毎日練習する。」",
      promptVi: "Câu vụng: Muốn giỏi tiếng Nhật, vì thế ngày nào cũng luyện.",
      target: "「日本語が上達するように、毎日欠かさず練習しています。」",
      targetVi: "Để tiếng Nhật tiến bộ, ngày nào tôi cũng luyện tập không sót ngày nào.",
    },
    exampleExpand: {
      prompt: "Câu gượng:「彼の言ったことは正しいと思う。」",
      promptVi: "Câu vụng: Tôi nghĩ điều anh ấy nói là đúng.",
      target: "「おっしゃる通り、彼の意見には一理あると思います。」",
      targetVi: "Đúng như đã nói, tôi nghĩ ý kiến của anh ấy rất có lý.",
    },
    exampleRepair: {
      prompt: "Câu gượng:「時間がありませんでした、宿題を忘れました。」",
      promptVi: "Câu vụng: Không có thời gian, quên bài tập.",
      target: "「昨日は時間が取れず、うっかり宿題をやるのを忘れてしまいました。」",
      targetVi: "Hôm qua không thu xếp được thời gian nên tôi lỡ quên mất việc làm bài tập.",
    },
  },
];

export const RELATIONS: Array<{ id: BuilderRelation; label: string; ja: string; icon: any; hint: string }> = [
  { id: "casual_friend", label: "Bạn Bè", ja: "タメ口", icon: Users, hint: "てる・じゃん・〜からさ" },
  { id: "business_polite", label: "Công Sở", ja: "丁寧語", icon: Briefcase, hint: "〜ておりまして・〜のでございます" },
];

export const DURATIONS = [
  { id: 0, label: "∞ Vô hạn" },
  { id: 3, label: "3 phút" },
  { id: 5, label: "5 phút" },
  { id: 10, label: "10 phút" },
  { id: 20, label: "20 phút" },
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
  startTrigger = "manual",
  setStartTrigger,
  onStart,
  loading,
  keybindings,
  onOpenHelp,
  onOpenCheatsheet,
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
  onOpenCheatsheet?: () => void;
}) {
  const [showSample, setShowSample] = useState(false);

  const currentMode = BUILDER_SUB_MODES.find((m) => m.id === subMode) || BUILDER_SUB_MODES[0];
  const currentSkill = BUILDER_SKILLS.find((s) => s.id === focusSkill) || BUILDER_SKILLS[0];
  const currentRelation = RELATIONS.find((r) => r.id === relation) || RELATIONS[0];

  const currentExample =
    subMode === "sentence_expand"
      ? currentMode.exampleExpand
      : subMode === "sentence_repair"
      ? currentMode.exampleRepair
      : currentMode.exampleAssemble;

  return (
    <div className="w-full max-w-[1600px] mx-auto h-[calc(100vh-3.5rem)] flex flex-col justify-between p-2 sm:p-3 gap-2 sm:gap-2.5 overflow-hidden select-none animate-in fade-in duration-200">
      {/* ── Top Header Bar ── */}
      <div className="shrink-0 rounded-xl border border-border bg-card/95 washi-texture px-3 py-2 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
              <Blocks className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
                  Xây Câu Nối Mệnh Đề
                </h1>
                <Badge variant="matcha" size="sm" className="text-[10px] font-mono font-bold px-1.5 py-0">
                  文立て
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                Từ vựng N1 đầy đầu → nối thành câu dài như bản xứ. Mỗi ván rèn 1 kỹ năng nối câu chuẩn tự nhiên.
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
                <span>Phím tắt ({formatKeyDisplay(keybindings?.builderToggleHelp || "?")})</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── SubMode Horizontal Segmented Selector Bar (4 Kiểu Luyện) ── */}
      <div className="shrink-0 space-y-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            1. Chọn Kiểu Luyện
          </span>
          <span className="text-[11px] text-primary font-mono font-bold">
            {currentMode.label} • {currentMode.ja}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-muted/40 border border-border">
          {BUILDER_SUB_MODES.map((m) => {
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

      {/* ── Focus Clause Skill Horizontal Pills (5 Kỹ Năng Nối) ── */}
      <div className="shrink-0 space-y-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            2. Trọng Tâm Kỹ Năng Nối (Focus Clause Skill)
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">
            {currentSkill.label} • {currentSkill.desc}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 p-1 rounded-xl bg-muted/40 border border-border">
          {BUILDER_SKILLS.map((s) => {
            const active = focusSkill === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  soundFX.playFurin();
                  setFocusSkill(s.id);
                }}
                className={cn(
                  "flex flex-col items-center justify-center py-1 px-1.5 rounded-lg text-center transition-all cursor-pointer",
                  active
                    ? "bg-card text-foreground border border-border shadow-xs ring-1 ring-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                )}
                title={s.desc}
              >
                <span className="text-xs font-bold leading-tight truncate">{s.label}</span>
                <span className="text-[10px] font-jp font-normal text-muted-foreground truncate">
                  {s.ja}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Relation Segmented Selector Bar ── */}
      <div className="shrink-0 space-y-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            3. Quan Hệ Xã Giao (Wakimae)
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
                <span className="text-[10px] font-jp text-muted-foreground hidden md:inline truncate max-w-[220px]">
                  {r.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Zen Summary & Highlights Card (Middle Container) ── */}
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
                  <span>Thử thách đề bài:</span>
                </span>
                <Badge variant="outline" size="sm" className="text-[9px] font-mono">
                  {currentSkill.ja}
                </Badge>
              </div>
              <div className="text-xs text-foreground font-jp">
                <UniversalFurigana text={currentExample.prompt} fontSize="sm" />
              </div>
              <p className="text-[11px] text-muted-foreground italic">
                {currentExample.promptVi}
              </p>
              <div className="pt-1 flex items-center gap-1.5 text-xs font-bold text-primary font-jp">
                <span>Câu hoàn chỉnh mẫu:</span>
                <span>{currentExample.target}</span>
              </div>
            </div>
          )}
        </div>

        {/* Pro-Tip footer */}
        <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
          <span className="truncate">
            💡 Mẹo: Rèn thói quen chuyển hóa ngữ pháp thành câu nói trôi chảy thay vì học vẹt công thức.
          </span>
          <span className="font-mono text-[10px] text-primary shrink-0 font-bold hidden sm:inline">
            Trọng tâm: {currentSkill.label} ({currentSkill.desc})
          </span>
        </div>
      </div>

      {/* ── Inline Config Strip (Scaffold, Duration, Trigger) ── */}
      <div className="shrink-0 grid grid-cols-1 md:grid-cols-12 gap-2 p-2 rounded-xl border border-border bg-card/95 washi-texture">
        {/* Scaffold level (5 cols) */}
        <div className="md:col-span-5 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-extrabold">
            <span className="text-muted-foreground flex items-center gap-1">
              <Layers className="h-3 w-3 text-primary" />
              <span>Giàn giáo hỗ trợ:</span>
            </span>
            <span className="text-primary font-mono text-[10px] font-bold">
              {SCAFFOLDS.find((s) => s.id === scaffold)?.label}
            </span>
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/40 border border-border">
            {SCAFFOLDS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  soundFX.playFurin();
                  setScaffold(s.id);
                }}
                className={cn(
                  "flex-1 py-1 rounded-md text-[10px] font-bold transition-all text-center cursor-pointer",
                  scaffold === s.id
                    ? "bg-card text-foreground border border-border shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={s.ja}
              >
                {s.label}
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
            {loading ? "Đang tạo bài tập AI..." : `Bắt Đầu Luyện ${currentMode.label} • ${currentSkill.label} (${duration === 0 ? "Vô hạn" : `${duration} phút`})`}
          </span>
        </Button>
      </div>
    </div>
  );
}
