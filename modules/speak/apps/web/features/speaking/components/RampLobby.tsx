"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Play,
  Keyboard,
  Shuffle,
  BookOpen,
  Zap,
  Target,
  Clock,
  CheckCircle2,
  Flame,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SakuraPetals } from "@/components/ui/sakura-petals";
import { soundFX } from "@/lib/sound-fx";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";

export interface RampGoalConfig {
  id: string;
  label: string;
  subLabel: string;
  ja: string;
  stageBadge: string;
  stageRange: string;
  icon: any;
  desc: string;
  badgeVariant: "sakura" | "kintsugi" | "matcha" | "fuji" | "jlpt" | "torii" | "akane";
  iconColor: string;
  highlights: string[];
  examplePrompt: string;
  examplePromptVi: string;
  exampleTarget: string;
  exampleTargetVi: string;
  scaffoldDesc: string;
}

export const RAMP_GOALS: RampGoalConfig[] = [
  {
    id: "general",
    label: "Toàn diện",
    subLabel: "Adaptive",
    ja: "総合",
    stageBadge: "St. 1-10",
    stageRange: "Stage 1 → 10 (Lộ trình phát ngôn 11 nấc thang thích ứng)",
    icon: Shuffle,
    desc: "Tăng dần từ 1 câu ngắn → 60s độc lập theo phản xạ thích ứng AI.",
    badgeVariant: "matcha",
    iconColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    highlights: [
      "Thích ứng linh hoạt theo phản xạ",
      "Chuyển hóa ngữ pháp thành câu nói",
      "Đầy đủ 11 nấc thang từ nhại câu đến tự do",
    ],
    examplePrompt: "今日、何をしましたか？",
    examplePromptVi: "Hôm nay bạn đã làm những gì?",
    exampleTarget: "「友達とカフェへ行って、日本語を勉強しました。」",
    exampleTargetVi: "Tôi đã đi cà phê với bạn và học tiếng Nhật.",
    scaffoldDesc: "Giàn giáo thông minh 4 cấp (Âm mẫu ➔ Câu mồi ➔ Từ khóa ➔ Tự do)",
  },
  {
    id: "fluency",
    label: "Phản xạ nhanh",
    subLabel: "Fluency ⚡",
    ja: "瞬発",
    stageBadge: "St. 1-3",
    stageRange: "Stage 1 → 3 (Echo, Thay thế & Hoàn thành chớp nhoáng)",
    icon: Zap,
    desc: "Bật câu tiếng Nhật dưới 2.0s, xóa bỏ ngập ngừng ngắt quãng.",
    badgeVariant: "kintsugi",
    iconColor: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    highlights: [
      "Bật câu tức thì dưới 2.0s không đắn đo",
      "Ép cơ hàm quen phản xạ câu chuẩn",
      "Đổi tân ngữ, tính từ tức thì theo từ mồi",
    ],
    examplePrompt: "「コーヒーを飲みます」 ➔ Thay tân ngữ: [お茶]",
    examplePromptVi: "Mẫu: Tôi uống cà phê ➔ Thay thế bằng: Trà",
    exampleTarget: "「お茶を飲みます！」 (Bật ngay trong 2s)",
    exampleTargetVi: "Tôi uống trà xanh!",
    scaffoldDesc: "Đếm ngược phản xạ tức thì, rút thời gian ngẫm để tạo phản xạ tự nhiên",
  },
  {
    id: "elaboration",
    label: "Mở rộng ý",
    subLabel: "Elaboration",
    ja: "拡張",
    stageBadge: "St. 4-6",
    stageRange: "Stage 4 → 6 (Nối câu, Thêm lý do & Đưa ví dụ)",
    icon: Target,
    desc: "Rèn thói quen nói xong luôn thêm lý do (から) hoặc ví dụ thực tế.",
    badgeVariant: "matcha",
    iconColor: "text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20",
    highlights: [
      "Xóa bỏ hoàn toàn thói quen nói câu cụt",
      "Tự động nối tiếp bằng から, ので, 例えば",
      "Kéo dài độ dài câu nói lên 15-25 giây tự nhiên",
    ],
    examplePrompt: "Câu hạt giống:「日本料理が好きです」 (Tôi thích món Nhật)",
    examplePromptVi: "Yêu cầu: Thêm lý do tại sao và đưa ra ví dụ món bạn thích nhất",
    exampleTarget: "「日本料理が好きです。ヘルシーだからです。例えば寿司が一番好きです。」",
    exampleTargetVi: "Tôi thích món Nhật vì rất thanh lành. Ví dụ tôi thích nhất là món sushi.",
    scaffoldDesc: "Mồi liên từ nối câu, câu hỏi định hướng (Tại sao? Với ai?)",
  },
  {
    id: "independence",
    label: "Tự lập",
    subLabel: "Blind",
    ja: "自立",
    stageBadge: "St. 7-10",
    stageRange: "Stage 7 → 10 (Rút giàn giáo & Phát ngôn độc lập 30-60s)",
    icon: Flame,
    desc: "Rút toàn bộ giàn giáo để nói tự nhiên hoàn toàn không gợi ý.",
    badgeVariant: "fuji",
    iconColor: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
    highlights: [
      "Chỉ nhìn 2-3 từ khóa hoặc hoàn toàn nghe chay",
      "Tự tổ chức ý và phát biểu 30-60s trôi chảy",
      "Thử thách đối đáp câu hỏi đào sâu từ AI Coach",
    ],
    examplePrompt: "Chủ đề:「週末の過ごし方」 • Từ khóa: 友達 / 旅行 / 楽しかった",
    examplePromptVi: "Chủ đề: Cuối tuần của bạn • Từ khóa: Bạn bè / Du lịch / Vui vẻ",
    exampleTarget: "「先週末は友達と京都へ旅行に行きました。古いお寺を見学して、とても楽しかったです...」",
    exampleTargetVi: "Tự do phát ngôn bài nói trọn vẹn 30-60s không cần văn bản gợi ý",
    scaffoldDesc: "Rút sạch câu mẫu, chỉ để lại từ khóa mồi ý tưởng để phát huy tự lập",
  },
];

export const RAMP_DURATIONS = [0, 5, 10, 15, 20, 30];

interface RampLobbyProps {
  selectedGoal: string;
  onGoalChange: (goal: string) => void;
  duration: number;
  onDurationChange: (dur: number) => void;
  onStartSession: () => void;
  onOpenCheatsheet: () => void;
  onOpenKeybindings: () => void;
  isLoading?: boolean;
}

export function RampLobby({
  selectedGoal,
  onGoalChange,
  duration,
  onDurationChange,
  onStartSession,
  onOpenCheatsheet,
  onOpenKeybindings,
  isLoading = false,
}: RampLobbyProps) {
  const [showExample, setShowExample] = useState(false);
  const currentGoal = RAMP_GOALS.find((g) => g.id === selectedGoal) || RAMP_GOALS[0];

  const handleSelectGoal = (id: string) => {
    soundFX.playKatana();
    onGoalChange(id);
  };

  const handleSelectDuration = (d: number) => {
    soundFX.playFurin();
    onDurationChange(d);
  };

  const getDurationBadgeText = (d: number) => {
    if (d === 0) return "Vô hạn • Tự do luyện";
    if (d === 15) return "15 phút • Tiêu chuẩn vàng";
    return `${d} phút`;
  };

  return (
    <div className="space-y-2.5 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* 1. Sub-heading guidance bar */}
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span className="font-bold flex items-center gap-1.5 text-foreground">
          <Target className="h-3.5 w-3.5 text-primary" />
          Chọn Chuyên Đề Phục Hồi Phát Ngôn:
        </span>
        <span className="text-[11px] font-mono">STAGE 0 → 10 (Adaptive)</span>
      </div>

      {/* 2. Quick Segmented 4-Goal Selector Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {RAMP_GOALS.map((goal) => {
          const Icon = goal.icon;
          const isSelected = selectedGoal === goal.id;
          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => handleSelectGoal(goal.id)}
              className={cn(
                "p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 washi-texture cursor-pointer shadow-2xs group relative",
                isSelected
                  ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40"
                  : "bg-card/70 border-border/80 hover:border-primary/40 hover:bg-card"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "h-6 w-6 rounded-md border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                    goal.iconColor
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-foreground truncate block">
                    {goal.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground block font-mono">
                    {goal.stageBadge}
                  </span>
                </div>
              </div>
              <Badge variant={goal.badgeVariant} size="sm" className="text-[9px] font-bold px-1.5 py-0 shrink-0">
                {goal.ja}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* 3. Thẻ Chi Tiết Zen Hub (Gọn gàng trong 1 khung bo thanh mảnh) */}
      <div className="p-3 sm:p-3.5 rounded-2xl border border-primary/30 bg-card washi-texture shadow-2xs space-y-2 relative overflow-hidden">
        <SakuraPetals count={1} />

        {/* Tiêu đề & Mô tả ngắn của Chuyên đề */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-extrabold text-foreground">
                {currentGoal.label} ({currentGoal.subLabel})
              </span>
              <span className="text-[11px] font-semibold text-primary">
                • {currentGoal.stageRange}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-tight line-clamp-1">
              {currentGoal.desc}
            </p>
          </div>

          {/* Toggle xem mẫu minh họa */}
          <button
            type="button"
            onClick={() => setShowExample(!showExample)}
            className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <span>{showExample ? "Thu gọn mẫu" : "💡 Xem mẫu minh họa"}</span>
            {showExample ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* 3 Highlights dạng inline pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-0.5">
          {currentGoal.highlights.map((point, idx) => (
            <div
              key={idx}
              className="px-2 py-1 rounded-lg bg-muted/40 border border-border/70 text-[11px] text-foreground flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate">{point}</span>
            </div>
          ))}
        </div>

        {/* Collapsible Example Prompt */}
        {showExample && (
          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/70 space-y-1.5 text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-muted-foreground flex items-center gap-1">
                <BookOpen className="h-3 w-3 text-primary" /> Mẫu bài tập minh họa ({currentGoal.scaffoldDesc}):
              </span>
            </div>
            <div className="space-y-0.5">
              <div className="font-jp font-bold text-foreground text-xs sm:text-sm">
                <UniversalFurigana text={currentGoal.examplePrompt} />
              </div>
              <div className="text-[11px] text-muted-foreground">
                {currentGoal.examplePromptVi}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 space-y-0.5">
              <div className="font-jp font-bold text-primary text-xs">
                <UniversalFurigana text={currentGoal.exampleTarget} />
              </div>
              <div className="text-[10px] text-primary/80">
                {currentGoal.exampleTargetVi}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Zen Control Deck: Thời Lượng & Trợ Năng Gọn Gàng */}
      <div className="p-3 sm:p-3.5 rounded-2xl border border-border/80 bg-card washi-texture space-y-2.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" /> Thiết lập thời lượng:
            </span>
            <Badge variant="matcha" size="sm" className="text-[10px] font-mono font-bold px-2 py-0.5">
              {getDurationBadgeText(duration)}
            </Badge>
          </div>

          {/* Quick Helper Actions */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenCheatsheet}
              className="h-6.5 px-2 rounded-lg text-[11px] font-medium border-border hover:border-primary/40 hover:bg-muted text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
            >
              <BookOpen className="h-3 w-3 text-primary" />
              <span>Cẩm nang (C)</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenKeybindings}
              className="h-6.5 px-2 rounded-lg text-[11px] font-medium border-border hover:border-primary/40 hover:bg-muted text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
            >
              <Keyboard className="h-3 w-3 text-muted-foreground" />
              <span>Phím tắt (?)</span>
            </Button>
          </div>
        </div>

        {/* Duration Selection Chips */}
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {RAMP_DURATIONS.map((d) => {
            const isSelected = duration === d;
            return (
              <Button
                key={d}
                type="button"
                variant={isSelected ? "primary" : "outline"}
                size="sm"
                onClick={() => handleSelectDuration(d)}
                className={cn(
                  "h-8 rounded-xl text-xs font-bold transition-all px-0 cursor-pointer shadow-2xs",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/40"
                    : "border-border/80 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-primary/30"
                )}
              >
                {d === 0 ? "∞ Vô hạn" : `${d}m`}
              </Button>
            );
          })}
        </div>
      </div>

      {/* 5. Nút Bắt Đầu Phiên (Hero CTA Button) */}
      <Button
        id="ramp-start-session-btn"
        size="lg"
        variant="primary"
        onClick={() => {
          soundFX.playTaiko();
          onStartSession();
        }}
        isLoading={isLoading}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary via-primary/95 to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-extrabold text-sm sm:text-base shadow-sm transition-all flex items-center justify-center gap-2.5 group cursor-pointer ring-1 ring-primary/30 hover:shadow-md"
      >
        <Play className="h-4 w-4 fill-current transition-transform group-hover:scale-110" />
        <span>
          Bắt Đầu Luyện: {currentGoal.label} ({duration === 0 ? "Vô hạn" : `${duration} phút`})
        </span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Button>
    </div>
  );
}
