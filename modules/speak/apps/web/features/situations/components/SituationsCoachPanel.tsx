"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Volume2,
  BookOpen,
  PlusCircle,
  Lightbulb,
  Layers,
  ArrowRight,
  Zap,
  CheckCircle2,
  MessageSquare,
  Flame,
  Check,
  Info,
  ShieldAlert,
  Compass,
  Award,
} from "lucide-react";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type {
  SituationsExercise,
  SituationsHints,
  SituationsKeyword,
} from "../services/situations-api";

export interface SituationsCoachPanelProps {
  exercise: SituationsExercise | null;
  onInsertText?: (text: string) => void;
  onPlayAudio?: (text: string) => void;
  className?: string;
}

type TabKey = "all" | "starters" | "vocab" | "culture";

export function SituationsCoachPanel({
  exercise,
  onInsertText,
  onPlayAudio,
  className,
}: SituationsCoachPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  if (!exercise) return null;

  const sc = exercise.extra_metadata?.situational_config || {};
  const sData = exercise.situationalData || sc.situational_data || {};

  const location = sData.location || exercise.scenario || "Tại địa điểm";
  const userRole = sData.user_role || "Khách hàng";
  const npcName = sData.npc_name || "Nhân viên đối thoại";
  const npcPersonality = sData.npc_personality || "Lịch sự";
  const goals = sData.goals || [];
  const event = sData.unexpected_event;
  const hints: SituationsHints | undefined = sData.hints || sc.hints || exercise.hints;
  const culturalTip =
    exercise.culturalTip || sc.cultural_tip || sData.cultural_tip || "";
  const canonical = sc.canonical || exercise.canonical || "";
  const canonicalVi = sc.canonical_vi || exercise.translation || "";

  const quickStarters: string[] =
    sData.quick_starters ||
    sc.quick_starters ||
    exercise.quickStarters || [
      "すみません、...",
      "〜をお願いできますか？",
      "確認したいのですが...",
      "恐れ入りますが...",
    ];

  // Fallback vocab hints
  const vocabList: SituationsKeyword[] =
    hints?.tier1_keywords && hints.tier1_keywords.length > 0
      ? hints.tier1_keywords
      : sData.vocabulary_hints
      ? Object.entries(sData.vocabulary_hints).map(([word, meaning]) => ({
          word,
          meaning: String(meaning),
        }))
      : [];

  const handlePlay = (text: string) => {
    stopWebSpeech();
    soundFX.playFurin();
    if (onPlayAudio) {
      onPlayAudio(text);
    } else {
      speakJapaneseText(text, { rate: 0.95 });
    }
  };

  const handleInsert = (text: string) => {
    soundFX.playTaiko();
    const cleanText = text.replace(/\.{2,}/g, "").replace(/〜/g, "").trim();
    if (onInsertText) {
      onInsertText(cleanText);
      toast.success("Đã chèn gợi ý vào ô phát ngôn!");
    } else {
      navigator.clipboard.writeText(cleanText);
      toast.success("Đã sao chép vào bộ nhớ tạm!");
    }
  };

  return (
    <div
      className={cn(
        "h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl shadow-lg relative overflow-hidden",
        className
      )}
    >
      {/* ── 1. Header: Sensei AI Trợ Lý Tình Huống ── */}
      <div className="p-3.5 sm:p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-2xs">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-foreground">
                Sensei AI • Trợ Lý Tình Huống Thực Chiến
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                <Zap className="h-2.5 w-2.5" /> Gợi Ý Trực Tiếp
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {location} • Vai trò: <span className="font-bold text-foreground">{userRole}</span> vs {npcName} ({npcPersonality})
            </p>
          </div>
        </div>

        <Badge variant="fuji" size="sm" className="text-[10px] font-bold shrink-0 shadow-2xs">
          Roleplay
        </Badge>
      </div>

      {/* ── 2. Filter Navigation Pills ── */}
      <div className="px-3.5 py-2 border-b border-border/40 bg-muted/10 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={cn(
            "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 cursor-pointer",
            activeTab === "all"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          Tất cả
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("starters")}
          className={cn(
            "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 flex items-center gap-1 cursor-pointer",
            activeTab === "starters"
              ? "bg-emerald-600 text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Flame className="h-3 w-3" />
          Câu mồi & Mục tiêu
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("vocab")}
          className={cn(
            "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 flex items-center gap-1 cursor-pointer",
            activeTab === "vocab"
              ? "bg-sky-600 text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <BookOpen className="h-3 w-3" />
          Từ vựng & Mẫu câu
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("culture")}
          className={cn(
            "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 flex items-center gap-1 cursor-pointer",
            activeTab === "culture"
              ? "bg-amber-500 text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Compass className="h-3 w-3" />
          Văn hóa & Phép lịch sự
        </button>
      </div>

      {/* ── 3. Main Scrollable Body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-3 sm:p-4 space-y-3">
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CÂU MỒI LẤY ĐÀ (QUICK RESPONSE STARTERS)                   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "starters") && quickStarters.length > 0 && (
          <div className="p-3 rounded-2xl bg-emerald-500/8 border border-emerald-500/25 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-emerald-500" />
                Câu Mồi Bắt Nhịp Phản Xạ (1-Chạm nghe & chèn):
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">Quick Starters</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {quickStarters.map((starter, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-card border border-emerald-500/30 text-xs font-bold font-jp text-foreground shadow-2xs hover:border-emerald-500 transition-all"
                >
                  <span>
                    <UniversalFurigana text={starter} fontSize="sm" />
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePlay(starter.replace(/\.{2,}/g, "").replace(/〜/g, ""))}
                    className="p-0.5 text-muted-foreground hover:text-emerald-600 transition-colors ml-1 cursor-pointer"
                    title="Nghe phát âm câu mồi"
                  >
                    <Volume2 className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsert(starter)}
                    className="p-0.5 text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                    title="Chèn câu mồi này vào ô nói"
                  >
                    <PlusCircle className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* MỤC TIÊU GIAO TIẾP VAI DIỄN (GOALS CHECKLIST)              */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "starters") && goals.length > 0 && (
          <div className="p-3 rounded-2xl bg-card border border-border/80 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Mục Tiêu Cần Đạt Trong Vai Diễn ({goals.length} mục tiêu):
              </span>
              <span className="text-[10px] text-muted-foreground">Goals</span>
            </div>

            <div className="space-y-1.5">
              {goals.map((g: any, idx: number) => (
                <div
                  key={g.id || idx}
                  className="p-2 rounded-xl bg-muted/30 border border-border/60 flex items-start gap-2 text-xs"
                >
                  <span className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 text-[10px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-foreground leading-snug">
                    <UniversalFurigana text={g.task || g.description} fontSize="sm" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SỰ CỐ BẤT NGỜ / TWIST                                       */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "starters") && event && event !== "Tình huống diễn ra bình thường" && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-xs shadow-2xs">
            <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold text-amber-900 dark:text-amber-100">
                Sự Cố Bất Ngờ Cần Ứng Biến (Unexpected Twist):
              </div>
              <div className="text-muted-foreground leading-snug">{event}</div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TỪ VỰNG & CỤM TỪ NGỮ CẢNH (VOCABULARY & COLLOCATIONS)      */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "vocab") && vocabList.length > 0 && (
          <div className="p-3 rounded-2xl bg-sky-500/8 border border-sky-500/25 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-sky-500" />
                Từ Vựng & Cụm Từ Hữu Dụng Theo Bối Cảnh ({vocabList.length} từ):
              </span>
              <span className="text-[10px] text-muted-foreground">Click + để chèn</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {vocabList.map((kw, i) => (
                <div
                  key={i}
                  className="p-2 rounded-xl bg-card border border-border/80 flex items-center justify-between gap-1.5 shadow-2xs"
                >
                  <div className="min-w-0 flex-1 truncate">
                    <div className="text-xs font-bold font-jp text-foreground truncate">
                      <UniversalFurigana text={kw.word} fontSize="sm" />
                    </div>
                    {kw.meaning && (
                      <div className="text-[10px] text-muted-foreground truncate">
                        {kw.meaning}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePlay(kw.word)}
                      className="h-6 w-6 p-0 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleInsert(kw.word)}
                      className="h-6 px-1.5 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 text-[10px] font-bold gap-0.5"
                      title="Chèn từ này"
                    >
                      <PlusCircle className="h-3 w-3" />
                      <span>Chèn</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* KHUNG CÂU & CÂU ĐỐI ĐÁP MẪU CHUẨN (MODEL DIALOGUE)         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "vocab") && (
          <div className="p-3.5 rounded-2xl bg-indigo-500/8 border border-indigo-500/25 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-500" />
                Khung Câu & Mẫu Đối Đáp Chuẩn Tokyo:
              </span>
              <Badge variant="outline" size="sm" className="text-[10px] border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
                Model Response
              </Badge>
            </div>

            {/* Khung câu gợi ý (Tier 2 Frame nếu có) */}
            {hints?.tier2_frame && (
              <div className="p-2 rounded-xl bg-card border border-border/80 text-xs font-bold font-jp text-foreground flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-[10px] text-muted-foreground uppercase shrink-0">Khung sườn:</span>
                  <span className="truncate">
                    <UniversalFurigana text={hints.tier2_frame} fontSize="sm" />
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleInsert(hints.tier2_frame!)}
                  className="h-6 px-1.5 text-indigo-600 hover:bg-indigo-500/10 text-[10px] font-bold gap-0.5 shrink-0"
                  title="Chèn khung sườn"
                >
                  <PlusCircle className="h-3 w-3" />
                  <span>Chèn</span>
                </Button>
              </div>
            )}

            {/* Câu mẫu hoàn chỉnh (Canonical) */}
            {canonical && (
              <div className="p-3 rounded-xl bg-card border border-border/80 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                    Câu đối đáp bản xứ tự nhiên:
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePlay(canonical)}
                      className="h-6 w-6 p-0 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                      title="Nghe phát âm chuẩn Tokyo"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleInsert(canonical)}
                      className="h-6 px-2 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-[10px] font-bold gap-1"
                      title="Chèn toàn bộ câu mẫu"
                    >
                      <PlusCircle className="h-3 w-3" />
                      <span>Chèn câu</span>
                    </Button>
                  </div>
                </div>

                <div className="text-xs sm:text-sm font-bold font-jp text-foreground leading-relaxed">
                  「<UniversalFurigana text={canonical} fontSize="sm" />」
                </div>

                {canonicalVi && (
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    👉 {canonicalVi}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* VĂN HÓA & PHÉP LỊCH SỰ THỰC TẾ (CULTURAL PRAGMATICS)         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "culture") && culturalTip && (
          <div className="p-3.5 rounded-2xl bg-amber-500/8 border border-amber-500/25 space-y-1.5 shadow-2xs">
            <span className="text-xs font-black text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-amber-500" />
              Mẹo Văn Hóa & Ứng Xử Thực Tế Của Người Nhật:
            </span>
            <div className="p-2.5 rounded-xl bg-card border border-border/80 text-xs text-foreground leading-relaxed">
              💡 {culturalTip}
            </div>
            <p className="text-[10px] text-muted-foreground italic pl-1">
              Chú ý điều chỉnh âm sắc và dùng kính ngữ (Keigo/Teineigo) phù hợp với vị thế đối tác.
            </p>
          </div>
        )}
      </div>

      {/* ── 4. Bottom Footer Hint ── */}
      <div className="p-2.5 sm:p-3 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
        <span className="flex items-center gap-1.5 font-medium truncate">
          <Info className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Tự do phản xạ tự nhiên theo vai diễn, AI chấm theo 4 tiêu chí</span>
        </span>
        <span className="text-[10px] font-mono text-muted-foreground shrink-0 hidden sm:inline">
          Bấm <strong>Space / Nộp</strong> khi nói xong
        </span>
      </div>
    </div>
  );
}
