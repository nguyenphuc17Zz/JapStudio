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
  Briefcase,
  Users,
  AlertTriangle,
  Compass,
  Check,
  Info,
} from "lucide-react";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type { InterpretExercise, InterpretRelation } from "../services/interpret-api";

export interface InterpretCoachPanelProps {
  exercise: InterpretExercise | null;
  onInsertText?: (text: string) => void;
  onPlayAudio?: (text: string) => void;
  className?: string;
}

type TabKey = "all" | "vocab" | "blueprint" | "model";

export function InterpretCoachPanel({
  exercise,
  onInsertText,
  onPlayAudio,
  className,
}: InterpretCoachPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  if (!exercise) return null;

  const subMode = exercise.subMode || "interpret_sentence";
  const relation: InterpretRelation = exercise.relation || "casual_friend";
  const isBusiness = relation === "business_polite";
  const isWord = subMode === "interpret_word";
  const isSituation = subMode === "interpret_situation";

  const keywords = exercise.expectedJaKeywords || [];
  const referenceJa = exercise.referenceJa || "";
  const promptVi = exercise.promptVi || "";

  // Quick Starters based on relationship and context
  const quickStarters: Array<{ ja: string; vi: string }> = isBusiness
    ? [
        { ja: "恐れ入りますが、", vi: "Xin thứ lỗi làm phiền nhưng..." },
        { ja: "実は、", vi: "Thực ra là..." },
        { ja: "〜の件についてですが、", vi: "Về vấn đề... thì..." },
        { ja: "承知いたしました。", vi: "Tôi đã hiểu/tiếp nhận rồi ạ." },
      ]
    : [
        { ja: "あのさ、", vi: "Này cậu ơi..." },
        { ja: "実はね、", vi: "Thực ra là thế này nè..." },
        { ja: "そういえば、", vi: "Nhân tiện thì..." },
        { ja: "やっぱり、", vi: "Quả nhiên là..." },
      ];

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
    if (onInsertText) {
      onInsertText(text);
      toast.success("Đã chèn gợi ý vào ô phát ngôn!");
    } else {
      navigator.clipboard.writeText(text);
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
      {/* ── 1. Header: Sensei AI Trợ Lý Phiên Dịch ── */}
      <div className="p-3.5 sm:p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-foreground">
                Sensei AI • Trợ Lý Phiên Dịch
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                <Zap className="h-2.5 w-2.5" /> Gợi Ý Trực Tiếp
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {isWord
                ? "Dịch từ vựng/cụm từ cốt lõi • Phản xạ nhanh chuẩn Tokyo"
                : isBusiness
                ? "Phiên dịch công sở • Tôn kính/khiêm nhường lịch sự chuẩn mực"
                : "Phiên dịch đàm thoại • Văn phong thân mật tự nhiên (Tameguchi)"}
            </p>
          </div>
        </div>

        <Badge variant={isBusiness ? "default" : "matcha"} size="sm" className="text-[10px] font-bold shrink-0 shadow-2xs gap-1">
          {isBusiness ? <Briefcase className="h-3 w-3" /> : <Users className="h-3 w-3" />}
          <span>{isBusiness ? "Công sở" : "Bạn bè"}</span>
        </Badge>
      </div>

      {/* ── 2. Filter Navigation Pills ── */}
      <div className="px-3.5 py-2 border-b border-border/40 bg-muted/10 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={cn(
            "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0",
            activeTab === "all"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          Tất cả
        </button>
        {keywords.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("vocab")}
            className={cn(
              "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 flex items-center gap-1",
              activeTab === "vocab"
                ? "bg-sky-600 text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <BookOpen className="h-3 w-3" />
            Từ vựng then chốt ({keywords.length})
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab("blueprint")}
          className={cn(
            "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 flex items-center gap-1",
            activeTab === "blueprint"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Layers className="h-3 w-3" />
          Khung dịch & Mở đầu
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("model")}
          className={cn(
            "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 flex items-center gap-1",
            activeTab === "model"
              ? "bg-amber-500 text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Lightbulb className="h-3 w-3" />
          Bản dịch mẫu & Bẫy dịch
        </button>
      </div>

      {/* ── 3. Main Scrollable Body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-3 sm:p-4 space-y-3.5">
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TỪ VỰNG THEN CHỐT TIẾNG NHẬT (KEY JAPANESE VOCABULARY)       */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "vocab") && keywords.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                Từ Vựng Tiếng Nhật Cần Dùng ({keywords.length} từ):
              </span>
              <span className="text-[10px] text-muted-foreground">Loa để nghe, Click + để chèn</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {keywords.map((kw, i) => (
                <div
                  key={i}
                  className="p-2 rounded-xl bg-sky-500/8 border border-sky-500/25 flex items-center justify-between gap-1.5 shadow-2xs"
                >
                  <div className="text-xs font-bold font-jp text-foreground truncate">
                    <UniversalFurigana text={kw} fontSize="sm" />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePlay(kw)}
                      className="h-6 w-6 p-0 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20"
                      title="Nghe phát âm từ"
                    >
                      <Volume2 className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleInsert(kw)}
                      className="h-6 px-1.5 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 text-[10px] font-bold gap-0.5"
                      title="Chèn từ này vào câu"
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
        {/* KHUNG CHUYỂN DỊCH SOV & SẮC THÁI QUAN HỆ (BLUEPRINT)        */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "blueprint") && (
          <div className="p-3.5 rounded-2xl bg-indigo-500/8 border border-indigo-500/25 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-800 dark:text-indigo-200 flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-indigo-500" />
                Chiến Lược Dịch: 「{isBusiness ? "Trang Trọng / Công Sở" : "Thân Mật / Bạn Bè"}」
              </span>
              <Badge variant="outline" size="sm" className="text-[10px] border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
                {isBusiness ? "Keigo / Teineigo" : "Tameguchi"}
              </Badge>
            </div>

            {/* Quy tắc vàng */}
            <div className="p-2.5 rounded-xl bg-card border border-border/80 text-xs font-bold font-jp text-foreground space-y-1">
              <div>💡 <strong>Trật tự câu:</strong> {isBusiness ? "Ẩn chủ ngữ Tôi → Tân ngữ/Bổ ngữ → Động từ khiêm nhường/tôn kính kết câu." : "Ẩn chủ ngữ Tôi → Bổ ngữ ngắn gọn → Động từ thể thông thường + よ/ね."}</div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-snug">
              {isBusiness
                ? "📌 Tránh dùng 「私」「あなた」. Luôn hạ mình khi nói về việc của bản thân (いたす/まいる) và nâng đối phương khi nói về hành động của sếp/khách hàng."
                : "📌 Trong giao tiếp với bạn bè, tuyệt đối tránh dùng です/ます kẻo tạo khoảng cách xa lạ. Kết câu bằng thể từ điển, thể て hoặc trợ từ cảm thán."}
            </p>

            {/* Cụm mở đầu phản xạ nhanh (Quick Jump Starters) */}
            <div className="space-y-1.5 pt-1 border-t border-indigo-500/15">
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
                Cụm câu đệm bật phản xạ nhanh:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickStarters.map((qs, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-card border border-border hover:border-primary/50 text-xs font-bold font-jp text-foreground shadow-2xs group transition-all"
                  >
                    <span>{qs.ja}</span>
                    <span className="text-[9px] font-normal text-muted-foreground font-sans">
                      ({qs.vi})
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePlay(qs.ja)}
                      className="p-0.5 text-muted-foreground hover:text-primary transition-colors ml-0.5"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsert(qs.ja)}
                      className="p-0.5 text-primary hover:text-primary/80 transition-colors"
                      title="Chèn cụm mở đầu này"
                    >
                      <PlusCircle className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* BẢN DỊCH MẪU CHUẨN TOKYO (REFERENCE MODEL TRANSLATION)      */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "model") && referenceJa && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                Bản Dịch Mẫu Chuẩn Tokyo:
              </span>
              <span className="text-[10px] text-muted-foreground">Loa để nghe, Click để chèn</span>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-500/8 border border-emerald-500/25 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                    Cách nói tự nhiên của người Nhật:
                  </span>
                  <div className="text-xs sm:text-sm font-bold font-jp text-foreground leading-relaxed">
                    「<UniversalFurigana text={referenceJa} fontSize="sm" />」
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlay(referenceJa)}
                    className="h-7 w-7 p-0 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                    title="Nghe phát âm chuẩn Tokyo"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleInsert(referenceJa)}
                    className="h-7 px-2 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-bold gap-1"
                    title="Chèn toàn bộ câu dịch vào ô phát ngôn"
                  >
                    <PlusCircle className="h-3 w-3" />
                    <span>Chèn</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CẨM NANG BẪY DỊCH VIETGLISH (PITFALL RADAR)                 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "model") && (
          <div className="p-3 rounded-2xl bg-rose-500/8 border border-rose-500/25 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                Cẩm Nang Tránh Bẫy Dịch Vietglish:
              </span>
              <Badge variant="outline" size="sm" className="text-[10px] border-rose-500/30 text-rose-700 dark:text-rose-300">
                Lưu ý quan trọng
              </Badge>
            </div>

            <div className="space-y-1.5 text-[11px] text-muted-foreground leading-snug">
              <div className="p-2 rounded-xl bg-card border border-border/80 text-foreground">
                ❌ <strong>Không nói 「私は...」 mở đầu:</strong> Người Việt hay có thói quen dịch chữ "Tôi", trong khi người Nhật ngầm hiểu chủ ngữ này qua thể của động từ.
              </div>
              <div className="p-2 rounded-xl bg-card border border-border/80 text-foreground">
                ❌ <strong>Đừng dịch từng chữ "rồi / mà / thì":</strong> Đừng cố tìm từ tương đương cho các từ đệm tiếng Việt, hãy dùng trợ từ liên kết hoặc thể quá khứ `〜た`.
              </div>
              <div className="p-2 rounded-xl bg-card border border-border/80 text-foreground">
                ❌ <strong>Trật tự câu SVO kiểu Việt:</strong> Tiếng Nhật luôn đưa vị ngữ (động từ/tính từ) ra vị trí cuối cùng của câu.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Bottom Footer Hint ── */}
      <div className="p-2.5 sm:p-3 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
        <span className="flex items-center gap-1.5 font-medium truncate">
          <Info className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Dịch trọn vẹn ý nghĩa, máy tự động phát hiện và chấm điểm theo 4 tiêu chí</span>
        </span>
        <span className="text-[10px] font-mono text-muted-foreground shrink-0 hidden sm:inline">
          Bấm <strong>Space / Nộp</strong> khi nói xong
        </span>
      </div>
    </div>
  );
}
