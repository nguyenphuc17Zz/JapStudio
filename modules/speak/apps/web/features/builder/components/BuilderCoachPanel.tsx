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
  Split,
  GitBranch,
  Wand2,
  Check,
  Cpu,
  Info,
} from "lucide-react";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type { BuilderExercise, BuilderSkill } from "../services/builder-api";

export interface BuilderCoachPanelProps {
  exercise: BuilderExercise | null;
  onInsertText?: (text: string) => void;
  onPlayAudio?: (text: string) => void;
  className?: string;
}

type TabKey = "all" | "blueprint" | "keywords" | "model";

interface SkillGuide {
  title: string;
  formula: string;
  explanation: string;
  connectors: Array<{ ja: string; vi: string }>;
  example: { ja: string; vi: string };
}

const SKILL_GUIDES: Record<BuilderSkill, SkillGuide> = {
  te_chain: {
    title: "Nối Thể て (て形接続)",
    formula: "V1て + V2 (chuỗi hành động) | A-くて | Na-で | N-で",
    explanation: "Dùng để nối các hành động diễn ra theo trình tự thời gian hoặc liên kết các đặc tính trạng thái mà không cần ngắt câu.",
    connectors: [
      { ja: "それに", vi: "hơn nữa, vả lại" },
      { ja: "そして", vi: "và rồi" },
      { ja: "〜てから", vi: "sau khi làm V thì..." },
      { ja: "〜ながら", vi: "vừa làm... vừa..." },
    ],
    example: {
      ja: "朝起きて、シャワーを浴びてから朝ご飯を食べた。",
      vi: "Sáng thức dậy, tắm xong rồi mới ăn sáng.",
    },
  },
  relative_clause: {
    title: "Mệnh Đề Bổ Nghĩa Danh Từ (関係節)",
    formula: "[V (thể ngắn: ru/ta/nai) + Danh từ] hoặc [A-i / Na-na + N]",
    explanation: "Đưa cả cụm hành động đứng ngay trước danh từ để miêu tả đặc điểm danh từ đó. Chủ ngữ trong mệnh đề phụ dùng が thay vì は.",
    connectors: [
      { ja: "〜という", vi: "người/vật mà được gọi là..." },
      { ja: "〜に関する", vi: "liên quan đến..." },
      { ja: "〜ための", vi: "dành cho mục đích..." },
      { ja: "〜とき", vi: "khi mà..." },
    ],
    example: {
      ja: "昨日駅前の店で買った本は、とても面白かった。",
      vi: "Quyển sách tôi mua ở cửa hàng trước ga hôm qua rất là thú vị.",
    },
  },
  conditional: {
    title: "Mẫu Câu Điều Kiện (条件表現: たら・ば・なら・と)",
    formula: "V-たら (xong thì) | V-ば (nếu) | N-なら (nếu là) | V-ru + と (hễ là)",
    explanation: "Lựa chọn hình thái điều kiện chuẩn xác theo tính chất: たら (tương lai/hành động), ば (logic giả định), なら (tiếp nhận ý kiến đối phương).",
    connectors: [
      { ja: "もし〜たら", vi: "giả sử nếu như..." },
      { ja: "〜場合は", vi: "trong trường hợp..." },
      { ja: "〜ないと", vi: "nếu không làm thì..." },
      { ja: "〜ても", vi: "cho dù có... đi nữa" },
    ],
    example: {
      ja: "時間があれば、ぜひ一度京都に行ってみたいです。",
      vi: "Nếu có thời gian, tôi rất muốn một lần đi Kyoto thử.",
    },
  },
  nominalization: {
    title: "Danh Từ Hóa & Phân Tích Lý Do (名詞化: わけ・はず・ので)",
    formula: "V/A (thể thường) + の / こと / わけ / はず / ので",
    explanation: "Biến một hành động thành chủ ngữ hoặc bổ ngữ trong câu, đồng thời giải thích bản chất nguyên nhân một cách khéo léo.",
    connectors: [
      { ja: "〜というわけだ", vi: "thảo nào là vậy, nghĩa là..." },
      { ja: "〜はずだ", vi: "chắc chắn là (theo logic)..." },
      { ja: "〜だからこそ", vi: "chính vì thế nên mới..." },
      { ja: "〜のが普通だ", vi: "việc ... là bình thường" },
    ],
    example: {
      ja: "彼が毎日遅くまで残業しているのは、プロジェクトを成功させるためだ。",
      vi: "Việc anh ấy mỗi ngày tăng ca tới muộn là để giúp dự án thành công.",
    },
  },
  contraction: {
    title: "Văn Nói Tắt Tự Nhiên (縮約表現)",
    formula: "〜てる (ている) | 〜ちゃう (てしまう) | 〜とく (ておく) | 〜じゃん (じゃないか)",
    explanation: "Lược âm tự nhiên trong văn nói đời thường của người Nhật giúp câu nói mượt mà, thân mật và không bị cảm giác máy móc như sách giáo khoa.",
    connectors: [
      { ja: "やっぱり", vi: "quả nhiên là, đúng như dự đoán" },
      { ja: "とりあえず", vi: "trước mắt thì, tạm thời" },
      { ja: "実は", vi: "thực ra là..." },
      { ja: "〜ちゃう", vi: "lỡ làm / làm mất rồi" },
    ],
    example: {
      ja: "資料を先に読んどいたから、会議がスムーズに進んだじゃん。",
      vi: "Đọc trước tài liệu rồi nên buổi họp tiến triển trơn tru chẳng phải sao.",
    },
  },
};

export function BuilderCoachPanel({
  exercise,
  onInsertText,
  onPlayAudio,
  className,
}: BuilderCoachPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  if (!exercise) return null;

  const subMode = exercise.subMode || "sentence_assemble";
  const focusSkill = (exercise.focusSkill || "te_chain") as BuilderSkill;
  const guide = SKILL_GUIDES[focusSkill] || SKILL_GUIDES.te_chain;

  const isAssemble = subMode === "sentence_assemble";
  const isExpand = subMode === "sentence_expand";
  const isRepair = subMode === "sentence_repair";

  const keywords = exercise.keywords || [];
  const starter = exercise.starter;
  const sourceSentence = exercise.sourceSentence;
  const situationVi = exercise.situationVi;
  const expandRequirement = exercise.expandRequirement;
  const fixHint = (exercise as any)?.fix_hint || (exercise as any)?.fixHint;

  const canonicalSentence =
    exercise.canonical ||
    (exercise as any)?.extra_metadata?.builder_config?.canonical ||
    "";
  const canonicalVi =
    exercise.canonicalVi ||
    (exercise as any)?.extra_metadata?.builder_config?.canonical_vi ||
    "";

  // Connectors from exercise or skill guide
  const activeConnectors: Array<{ ja: string; vi: string }> =
    exercise.connectors && exercise.connectors.length > 0
      ? exercise.connectors.map((c) => ({ ja: c, vi: "từ nối câu" }))
      : guide.connectors;

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
      {/* ── 1. Header: Sensei AI Trợ Lý Xây Câu ── */}
      <div className="p-3.5 sm:p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-foreground">
                Sensei AI • Trợ Lý Xây Câu
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                <Zap className="h-2.5 w-2.5" /> Gợi Ý Trực Tiếp
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {isAssemble
                ? "Nối từ khóa thành câu dài • Thứ tự SOV chuẩn Tokyo"
                : isExpand
                ? "Mở rộng câu hạt giống • Thêm chiều kích thông tin"
                : "Sửa câu lủng củng • Tự nhiên hóa lối diễn đạt bản xứ"}
            </p>
          </div>
        </div>

        <Badge variant="matcha" size="sm" className="text-[10px] font-bold shrink-0 shadow-2xs">
          {isAssemble ? "Nối từ" : isExpand ? "Mở rộng" : isRepair ? "Sửa câu" : "Tổng hợp"}
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
          Khung nối & Từ liên kết
        </button>
        {isAssemble && keywords.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("keywords")}
            className={cn(
              "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 flex items-center gap-1",
              activeTab === "keywords"
                ? "bg-sky-600 text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <BookOpen className="h-3 w-3" />
            Từ khóa & Mở đầu
          </button>
        )}
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
          Câu mẫu & Mẹo
        </button>
      </div>

      {/* ── 3. Main Scrollable Body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-3 sm:p-4 space-y-3.5">
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* KHUNG NỐI CÂU & CÔNG THỨC VÀNG (SKILL BLUEPRINT)            */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "blueprint") && (
          <div className="p-3.5 rounded-2xl bg-indigo-500/8 border border-indigo-500/25 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-800 dark:text-indigo-200 flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-indigo-500" />
                Cấu Trúc Cốt Lõi: 「{guide.title}」
              </span>
              <Badge variant="outline" size="sm" className="text-[10px] border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
                Focus Skill
              </Badge>
            </div>

            {/* Công thức */}
            <div className="p-2.5 rounded-xl bg-card border border-border/80 text-xs font-bold font-jp text-foreground">
              💡 {guide.formula}
            </div>

            <p className="text-[11px] text-muted-foreground leading-snug">
              👉 {guide.explanation}
            </p>

            {/* Từ nối đề xuất (Connectors Hub) */}
            <div className="space-y-1.5 pt-1 border-t border-indigo-500/15">
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
                Từ nối đắc lực (Click để chèn):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeConnectors.map((c, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-card border border-border hover:border-primary/50 text-xs font-bold font-jp text-foreground shadow-2xs group transition-all"
                  >
                    <span>{c.ja}</span>
                    <span className="text-[9px] font-normal text-muted-foreground font-sans">
                      ({c.vi})
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePlay(c.ja)}
                      className="p-0.5 text-muted-foreground hover:text-primary transition-colors ml-0.5"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsert(c.ja)}
                      className="p-0.5 text-primary hover:text-primary/80 transition-colors"
                      title="Chèn từ nối này vào câu"
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
        {/* TỪ KHÓA & GỢI Ý MỞ ĐẦU (KEYWORDS & STARTER)                */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "keywords") && isAssemble && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                Bộ Từ Khóa Cần Ghép ({keywords.length} từ):
              </span>
              <span className="text-[10px] text-muted-foreground">Click + để chèn</span>
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
                      title="Chèn từ này"
                    >
                      <PlusCircle className="h-3 w-3" />
                      <span>Chèn</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {starter && (
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between gap-2 shadow-2xs">
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-black uppercase text-muted-foreground block">
                    Gợi ý mở đầu câu:
                  </span>
                  <div className="text-xs font-bold font-jp text-foreground">
                    「<UniversalFurigana text={starter} fontSize="sm" />」
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlay(starter)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    title="Nghe"
                  >
                    <Volume2 className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleInsert(starter)}
                    className="h-6 px-1.5 text-primary hover:bg-primary/10 text-[10px] font-bold gap-0.5"
                    title="Chèn mở đầu câu"
                  >
                    <PlusCircle className="h-3 w-3" />
                    <span>Chèn</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CHIẾN LƯỢC ĐẶC THÙ: EXPAND / REPAIR                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "blueprint") && isExpand && expandRequirement && (
          <div className="p-3 rounded-2xl bg-amber-500/8 border border-amber-500/25 space-y-1.5 shadow-2xs">
            <span className="text-xs font-black text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
              <Split className="h-3.5 w-3.5 text-amber-500" />
              Yêu Cầu Mở Rộng Thêm:
            </span>
            <div className="p-2 rounded-xl bg-card border border-border/80 text-xs font-bold text-foreground">
              ➕ {expandRequirement}
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              💡 Hãy lồng ghép thông tin mới này vào vị trí trước động từ chính hoặc dùng từ nối để tạo vế nguyên nhân/thời gian.
            </p>
          </div>
        )}

        {(activeTab === "all" || activeTab === "blueprint") && isRepair && fixHint && (
          <div className="p-3 rounded-2xl bg-rose-500/8 border border-rose-500/25 space-y-1.5 shadow-2xs">
            <span className="text-xs font-black text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
              <Wand2 className="h-3.5 w-3.5 text-rose-500" />
              Mẹo Sửa Câu Lủng Củng:
            </span>
            <div className="p-2 rounded-xl bg-card border border-border/80 text-xs font-bold text-foreground">
              🛠️ {fixHint}
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              💡 Chú ý tránh lặp từ, dùng trợ từ tự nhiên và chia đúng thể kết câu theo văn cảnh.
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CÂU MẪU CHUẨN TOKYO & DỊCH NGHĨA (MODEL SENTENCE)          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "model") && canonicalSentence && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                Câu Mẫu Chuẩn Bản Xứ Tham Khảo:
              </span>
              <span className="text-[10px] text-muted-foreground">Loa để nghe, Click để chèn</span>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-500/8 border border-emerald-500/25 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                    Bản diễn đạt chuẩn Tokyo:
                  </span>
                  <div className="text-xs sm:text-sm font-bold font-jp text-foreground leading-relaxed">
                    「<UniversalFurigana text={canonicalSentence} fontSize="sm" />」
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlay(canonicalSentence)}
                    className="h-7 w-7 p-0 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                    title="Nghe phát âm chuẩn Tokyo"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleInsert(canonicalSentence)}
                    className="h-7 px-2 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-bold gap-1"
                    title="Chèn toàn bộ câu mẫu vào ô phát ngôn"
                  >
                    <PlusCircle className="h-3 w-3" />
                    <span>Chèn</span>
                  </Button>
                </div>
              </div>

              {canonicalVi && (
                <p className="text-[11px] text-muted-foreground leading-snug">
                  👉 {canonicalVi}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* VÍ DỤ ỨNG DỤNG MINH HỌA THEO SKILL                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "model") && (
          <div className="p-3 rounded-2xl bg-card border border-border/80 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Ví dụ tương tự cho kỹ năng 「{guide.title}」:
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handlePlay(guide.example.ja)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                title="Nghe ví dụ"
              >
                <Volume2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="text-xs font-bold font-jp text-foreground leading-relaxed">
              「<UniversalFurigana text={guide.example.ja} fontSize="sm" />」
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {guide.example.vi}
            </p>
          </div>
        )}
      </div>

      {/* ── 4. Bottom Footer Hint ── */}
      <div className="p-2.5 sm:p-3 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
        <span className="flex items-center gap-1.5 font-medium truncate">
          <Info className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Tự do ghép từ theo ý bạn, máy chấm linh hoạt theo 4 tiêu chí</span>
        </span>
        <span className="text-[10px] font-mono text-muted-foreground shrink-0 hidden sm:inline">
          Bấm <strong>Space / Nộp</strong> khi nói xong
        </span>
      </div>
    </div>
  );
}
