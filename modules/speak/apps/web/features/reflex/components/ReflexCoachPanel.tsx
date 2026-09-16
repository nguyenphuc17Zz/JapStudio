"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Volume2,
  BookOpen,
  Copy,
  Check,
  PlusCircle,
  Lightbulb,
  Compass,
  Repeat,
  Layers,
  MessageSquare,
  Briefcase,
  Users,
  Coffee,
  HelpCircle,
  ArrowRight,
  Database,
  Zap,
  Activity,
  Award,
  Cpu,
} from "lucide-react";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type { ReflexExercise } from "../services/reflex-api";
import { CONJUGATION_FORM_DETAILS } from "./ReflexPromptCard";

export interface ReflexCoachPanelProps {
  exercise: ReflexExercise | null;
  subMode?: string;
  onInsertText?: (text: string) => void;
  onPlayAudio?: (text: string) => void;
  className?: string;
}

type TabKey = "all" | "answers" | "vocab" | "rules";

export function ReflexCoachPanel({
  exercise,
  subMode = "reflex_qna",
  onInsertText,
  onPlayAudio,
  className,
}: ReflexCoachPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!exercise) return null;

  const rc = exercise.extra_metadata?.reflex_config || {};
  const currentSubMode = exercise.exercise_type || rc.sub_mode || subMode;

  const isQna = currentSubMode === "reflex_qna";
  const isTransformation = currentSubMode === "reflex_transformation";
  const isContext = currentSubMode === "reflex_context";
  const isConjugation = currentSubMode === "reflex_conjugation";
  const isVocab = currentSubMode === "reflex_vocabulary";
  const isKeigoVocab = currentSubMode === "reflex_keigo_vocab";
  const isDeterministic = isConjugation || isVocab || isKeigoVocab;

  const handlePlay = (text: string) => {
    stopWebSpeech();
    soundFX.playFurin();
    if (onPlayAudio) {
      onPlayAudio(text);
    } else {
      speakJapaneseText(text, { rate: 0.95 });
    }
  };

  const handleCopy = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    toast.success("Đã sao chép vào bộ nhớ tạm!");
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleInsert = (text: string) => {
    soundFX.playTaiko();
    if (onInsertText) {
      onInsertText(text);
      toast.success("Đã chèn gợi ý vào ô phát ngôn!");
    } else {
      handleCopy(text, "quick");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. DATA EXTRACTION FOR SPEED Q&A
  // ─────────────────────────────────────────────────────────────
  const rawMultiAnswers =
    exercise.multiAnswers ||
    rc.multi_answers ||
    rc.multiAnswers ||
    (exercise as any)?.multi_answers ||
    null;

  const canonicalAnswer =
    exercise.canonical ||
    rc.canonical ||
    (exercise as any)?.target ||
    rc.sample_answer_ja ||
    "はい、そうです。";

  const qnaMultiAnswers = {
    positive: rawMultiAnswers?.positive || {
      ja: canonicalAnswer,
      vi: rc.translation || "Câu trả lời khẳng định / đồng thuận",
    },
    negative: rawMultiAnswers?.negative || {
      ja: "いいえ、そうではありません。",
      vi: "Câu trả lời phủ định / từ chối",
    },
    extended:
      rawMultiAnswers?.extended ||
      rawMultiAnswers?.negotiation || {
        ja: `${canonicalAnswer.replace(/[。！]$/, "")}、とても楽しかったです。`,
        vi: "Câu trả lời mở rộng thêm chi tiết / cảm xúc",
      },
  };

  const keyVocab: Array<{ ja: string; vi?: string }> =
    rc.key_vocab ||
    (exercise as any)?.key_vocab ||
    (exercise as any)?.keyVocab ||
    [];

  // ─────────────────────────────────────────────────────────────
  // 2. DATA EXTRACTION FOR TRANSFORMATION
  // ─────────────────────────────────────────────────────────────
  const transformSource = exercise.source || rc.source || exercise.prompt || "";
  const transformTarget = exercise.targetLabel || rc.target_label || rc.targetLabel || exercise.task || "Đổi thể";
  const transformFormula = exercise.formula || rc.formula || "Quy tắc: Nhóm 1: đổi âm đuôi u → a/i/e; Nhóm 2: bỏ ru; Nhóm 3: suru/kuru";
  const transformGrammarNote = exercise.grammarNote || rc.grammar_note || rc.grammarNote || "Chú ý chia đúng thể theo ngữ cảnh thân mật hay trang trọng.";
  const transformExpected = (exercise as any)?.expected || rc.expected || exercise.canonical || rc.expected_sentence_ja || "";

  // ─────────────────────────────────────────────────────────────
  // 3. DATA EXTRACTION FOR CONTEXTUAL REACTION
  // ─────────────────────────────────────────────────────────────
  const contextRole = (exercise as any)?.role || rc.role || "Đối phương giao tiếp";
  const contextIntent = (exercise as any)?.intent || rc.intent || rc.scenario || "Phản xạ giao tiếp đúng văn hóa ứng xử";
  const contextCulturalNote = exercise.culturalNote || rc.cultural_note || rc.culturalNote || "Trong văn hóa Nhật, luôn thể hiện sự tôn trọng và đồng cảm trước khi đưa ra quyết định.";
  const contextExpected = (exercise as any)?.expected || rc.expected || exercise.canonical || rc.expected_response_ja || "ありがとうございます。";

  const contextNuanceAnswers = {
    keigo: {
      role: `Cấp trên / Khách hàng (${contextRole})`,
      badge: "Kính ngữ trang trọng",
      ja: contextExpected.includes("ありがとう")
        ? "誠にありがとうございます。大変助かります。"
        : contextExpected.includes("申し訳")
        ? "大変申し訳ございません。以後気をつけます。"
        : `恐れ入りますが、${contextExpected}`,
      vi: "Dành cho sếp, khách hàng hoặc đối tác thương mại",
    },
    teinei: {
      role: "Đồng nghiệp / Người quen",
      badge: "Lịch sự chuẩn です/ます",
      ja: contextExpected,
      vi: "Dành cho đồng nghiệp, người lớn tuổi hơn hoặc giao tiếp hàng ngày",
    },
    tameguchi: {
      role: "Bạn bè thân thiết",
      badge: "Thân mật (Tameguchi)",
      ja: contextExpected.includes("ありがとう")
        ? "ありがとう！助かるよ！"
        : contextExpected.includes("申し訳")
        ? "ごめん！気をつけるね！"
        : contextExpected.replace(/です|ます/g, "").replace(/でした/g, "だった") + "よ！",
      vi: "Dành cho bạn bè thân thiết, người cùng trang lứa",
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 4. DATA EXTRACTION FOR CONJUGATION BLITZ (NON-AI)
  // ─────────────────────────────────────────────────────────────
  const conjVerb = exercise.prompt || rc.verb || "";
  const conjTargetKey = (rc.target_form || (exercise as any)?.target_form || (exercise as any)?.targetLabel || "").toLowerCase().replace(/[\s-]/g, "_");
  const conjFormDetail =
    CONJUGATION_FORM_DETAILS[conjTargetKey] ||
    CONJUGATION_FORM_DETAILS[conjTargetKey.replace("_form", "")] || {
      shortName: exercise.targetLabel || rc.target_label || "Chia thể",
      formJa: rc.target_label_ja || "活用形",
      meaning: "Biến đổi hình thái động từ",
      suffixHint: "",
      fullLabel: exercise.targetLabel || "Chia thể động từ",
    };
  const conjVerbType = rc.verb_type || (exercise as any)?.verb_type || "godan";
  const conjGroupInfo =
    conjVerbType === "ichidan" || conjVerbType === "group2"
      ? {
          name: "Nhóm 2 (一段 - Ichidan)",
          rule: "Bỏ đuôi る + thêm hậu tố",
          tip: "Động từ có đuôi -iru / -eru (Ví dụ: 食べる → 食べ...)",
        }
      : conjVerbType === "suru" || conjVerbType === "kuru" || conjVerbType === "group3"
      ? {
          name: "Nhóm 3 (変格 - Bất quy tắc)",
          rule: "Biến đổi đặc biệt: する / くる",
          tip: "する (saseru/dekiru/shita), くる (kosaseru/korareru/kita)",
        }
      : {
          name: "Nhóm 1 (五段 - Godan)",
          rule: "Đổi âm đuôi u sang hàng tương ứng",
          tip: "u → a (phủ định/bị động), u → i (masu), u → e (khả năng/lệnh), u → o (ý chí)",
        };
  const conjTargetAnswer = (exercise as any)?.target || exercise.canonical || rc.target || "";

  // ─────────────────────────────────────────────────────────────
  // 5. DATA EXTRACTION FOR VOCAB BLITZ (NON-AI)
  // ─────────────────────────────────────────────────────────────
  const vocabWord = exercise.prompt || rc.prompt || "";
  const vocabMeaning = rc.word_meaning_vi || (exercise as any)?.prompt_translation || rc.prompt_translation || rc.translation || "";
  const vocabCollocationJa = rc.collocation_ja || (exercise as any)?.collocationJa || "";
  const vocabCollocationVi = rc.collocation_vi || (exercise as any)?.collocationVi || "";
  const vocabExampleJa = rc.example_ja || (exercise as any)?.exampleJa || "";
  const vocabExampleVi = rc.example_vi || (exercise as any)?.exampleVi || "";
  const vocabTypeLabel = rc.word_type_label || (exercise as any)?.wordTypeLabel || "Từ vựng cốt lõi";
  const vocabAnswer = exercise.canonical || (exercise as any)?.target || vocabWord;

  // ─────────────────────────────────────────────────────────────
  // 6. DATA EXTRACTION FOR KEIGO BLITZ (NON-AI)
  // ─────────────────────────────────────────────────────────────
  const keigoWord = exercise.prompt || rc.prompt || "";
  const keigoTargetType = rc.target_type || (exercise as any)?.targetType || "sonkeigo";
  const keigoTargetLabel = rc.target_label_vi || (keigoTargetType === "sonkeigo" ? "Tôn kính ngữ (Sonkeigo)" : "Khiêm nhường ngữ (Kenjougo)");
  const tripletSonkeigo = rc.triplet_sonkeigo || (exercise as any)?.tripletSonkeigo || "";
  const tripletKenjougo = rc.triplet_kenjougo || (exercise as any)?.tripletKenjougo || "";
  const keigoFormula = rc.formula || (exercise as any)?.formula || (keigoTargetType === "sonkeigo" ? "お + V(bỏ masu) + になる / ご〜になる" : "お + V(bỏ masu) + する/いたす");
  const keigoExampleJa = rc.example_ja || (exercise as any)?.exampleJa || "";
  const keigoExampleVi = rc.example_vi || (exercise as any)?.exampleVi || "";
  const keigoAnswer = exercise.canonical || (exercise as any)?.target || "";

  return (
    <div
      className={cn(
        "h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl shadow-lg relative overflow-hidden",
        className
      )}
    >
      {/* Header: Sensei AI / Smart Rule Scaffolding */}
      <div className="p-3.5 sm:p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
            {isDeterministic ? <Cpu className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-foreground">
                {isDeterministic ? "Tra Cứu & Gợi Ý Phản Xạ" : "Sensei AI • Trợ Lý Phản Xạ"}
              </span>
              {isDeterministic ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-sky-500/15 border border-sky-500/30 text-[9px] font-bold text-sky-700 dark:text-sky-300">
                  <Database className="h-2.5 w-2.5" /> Chuẩn bản xứ &lt;5ms
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                  <Zap className="h-2.5 w-2.5" /> Gợi Ý Trực Tiếp
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {isConjugation
                ? "Công thức chia thể theo nhóm động từ & đáp án chuẩn"
                : isVocab
                ? "Cụm Collocation tự nhiên & ví dụ ứng dụng đời thực"
                : isKeigoVocab
                ? "Bảng đối chiếu Bộ Ba Kính Ngữ & công thức công sở"
                : isQna
                ? "3 hướng trả lời đa chiều & từ vựng bật phản xạ"
                : isTransformation
                ? "Công thức biến đổi ngữ pháp & đối chiếu câu 2 chiều"
                : "3 sắc thái vai vế văn hóa Nhật & cụm từ ứng xử"}
            </p>
          </div>
        </div>

        <Badge variant="matcha" size="sm" className="text-[10px] font-bold shrink-0 shadow-2xs">
          {isConjugation
            ? "Conjugation Blitz"
            : isVocab
            ? "Vocab Blitz"
            : isKeigoVocab
            ? "Keigo Blitz"
            : isQna
            ? "Speed Q&A"
            : isTransformation
            ? "Biến đổi câu"
            : "Tình huống"}
        </Badge>
      </div>

      {/* Filter Navigation Pills */}
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
          onClick={() => setActiveTab("answers")}
          className={cn(
            "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 flex items-center gap-1",
            activeTab === "answers"
              ? "bg-amber-500 text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Lightbulb className="h-3 w-3" />
          {isConjugation ? "Đáp án & Mẫu" : isVocab ? "Collocation" : isKeigoVocab ? "Bộ ba kính ngữ" : isQna ? "3 Hướng trả lời" : isTransformation ? "Câu biến đổi" : "3 Vai vế ứng xử"}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("rules")}
          className={cn(
            "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 flex items-center gap-1",
            activeTab === "rules"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Layers className="h-3 w-3" />
          {isConjugation ? "Quy tắc nhóm" : isVocab ? "Ví dụ ngữ cảnh" : isKeigoVocab ? "Công thức công sở" : isTransformation ? "Mẹo ngữ pháp" : "Bí quyết văn hóa"}
        </button>
      </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-3 sm:p-4 space-y-3.5">
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SUB-MODE: CONJUGATION BLITZ (NON-AI)                       */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {isConjugation && (
          <>
            {/* Thẻ quy tắc nhóm động từ */}
            {(activeTab === "all" || activeTab === "rules") && (
              <div className="p-3.5 rounded-2xl bg-indigo-500/8 border border-indigo-500/25 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-800 dark:text-indigo-200 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-indigo-500" />
                    Đặc Điểm: 「{conjGroupInfo.name}」
                  </span>
                  <Badge variant="outline" size="sm" className="text-[10px] border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
                    Quy tắc chia
                  </Badge>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border/80 text-xs font-bold font-jp text-foreground">
                  💡 {conjGroupInfo.rule}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  📌 {conjGroupInfo.tip}
                </p>
              </div>
            )}

            {/* Chi tiết thể đích & Đáp án chuẩn */}
            {(activeTab === "all" || activeTab === "answers") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    Thể Yêu Cầu: {conjFormDetail.shortName}
                  </span>
                  {conjFormDetail.suffixHint && (
                    <Badge variant="outline" size="sm" className="text-[10px] font-mono font-bold">
                      {conjFormDetail.suffixHint}
                    </Badge>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-card border border-border/80 space-y-2.5 shadow-2xs">
                  <div className="text-[11px] text-muted-foreground leading-snug">
                    👉 {conjFormDetail.meaning}
                  </div>

                  {conjTargetAnswer && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                          Đáp án chia đúng:
                        </span>
                        <div className="text-sm sm:text-base font-bold font-jp text-foreground">
                          「<UniversalFurigana text={conjTargetAnswer} />」
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlay(conjTargetAnswer)}
                          className="h-7 w-7 p-0 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                          title="Nghe phát âm chuẩn Tokyo"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInsert(conjTargetAnswer)}
                          className="h-7 px-2 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-bold gap-1"
                          title="Chèn đáp án vào ô nói"
                        >
                          <PlusCircle className="h-3 w-3" />
                          <span>Chèn</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SUB-MODE: VOCAB BLITZ (NON-AI)                             */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {isVocab && (
          <>
            {/* Cụm Collocation tự nhiên */}
            {(activeTab === "all" || activeTab === "answers") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Cụm Collocation Tự Nhiên Đi Kèm:
                  </span>
                  <Badge variant="outline" size="sm" className="text-[10px]">
                    {vocabTypeLabel}
                  </Badge>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-500/8 border border-emerald-500/25 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                        Cụm từ người Nhật hay dùng:
                      </span>
                      <div className="text-sm sm:text-base font-bold font-jp text-foreground">
                        「<UniversalFurigana text={vocabCollocationJa || vocabWord} />」
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePlay(vocabCollocationJa || vocabWord)}
                        className="h-7 w-7 p-0 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                        title="Nghe phát âm chuẩn"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInsert(vocabCollocationJa || vocabWord)}
                        className="h-7 px-2 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-bold gap-1"
                        title="Chèn cụm từ vào ô nói"
                      >
                        <PlusCircle className="h-3 w-3" />
                        <span>Chèn</span>
                      </Button>
                    </div>
                  </div>
                  {vocabCollocationVi && (
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      👉 {vocabCollocationVi}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Ví dụ ngữ cảnh thực tế */}
            {(activeTab === "all" || activeTab === "rules") && (vocabExampleJa || vocabMeaning) && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-indigo-500" />
                  Ngữ Cảnh Ứng Dụng Thực Tế:
                </span>

                <div className="p-3 rounded-2xl bg-card border border-border/80 space-y-2 shadow-2xs">
                  {vocabMeaning && (
                    <div className="text-xs text-foreground font-medium pb-1 border-b border-border/60">
                      Nghĩa từ vựng: <span className="font-bold">{vocabMeaning}</span>
                    </div>
                  )}

                  {vocabExampleJa && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Câu ví dụ:</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlay(vocabExampleJa)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                          title="Nghe câu ví dụ"
                        >
                          <Volume2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-xs font-bold font-jp text-foreground leading-relaxed">
                        「<UniversalFurigana text={vocabExampleJa} />」
                      </div>
                      {vocabExampleVi && (
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          {vocabExampleVi}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SUB-MODE: KEIGO WORD BLITZ (NON-AI)                        */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {isKeigoVocab && (
          <>
            {/* Bảng Đối Chiếu Bộ Ba Kính Ngữ (Keigo Triplet) */}
            {(activeTab === "all" || activeTab === "answers") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-purple-500" />
                    Bộ Ba Kính Ngữ: 「{keigoWord}」
                  </span>
                  <Badge variant="outline" size="sm" className="text-[10px] border-purple-500/30 text-purple-700 dark:text-purple-300">
                    {keigoTargetLabel}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {/* Tôn kính Sonkeigo */}
                  {tripletSonkeigo && (
                    <div className="p-2.5 rounded-2xl bg-purple-500/8 border border-purple-500/25 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300">
                          👑 Tôn Kính (Sonkeigo - Nâng đối phương)
                        </span>
                        <div className="text-sm font-bold font-jp text-foreground mt-1">
                          「<UniversalFurigana text={tripletSonkeigo} />」
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlay(tripletSonkeigo)}
                          className="h-7 w-7 p-0 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20"
                          title="Nghe"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInsert(tripletSonkeigo)}
                          className="h-7 px-2 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 text-xs font-bold gap-1"
                          title="Chèn"
                        >
                          <PlusCircle className="h-3 w-3" />
                          <span>Chèn</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Khiêm nhường Kenjougo */}
                  {tripletKenjougo && (
                    <div className="p-2.5 rounded-2xl bg-sky-500/8 border border-sky-500/25 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-700 dark:text-sky-300">
                          🙇 Khiêm Nhường (Kenjougo - Hạ mình)
                        </span>
                        <div className="text-sm font-bold font-jp text-foreground mt-1">
                          「<UniversalFurigana text={tripletKenjougo} />」
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlay(tripletKenjougo)}
                          className="h-7 w-7 p-0 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20"
                          title="Nghe"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInsert(tripletKenjougo)}
                          className="h-7 px-2 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 text-xs font-bold gap-1"
                          title="Chèn"
                        >
                          <PlusCircle className="h-3 w-3" />
                          <span>Chèn</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Công thức công sở & Mẫu câu */}
            {(activeTab === "all" || activeTab === "rules") && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-indigo-500" />
                  Công Thức Công Sở Vàng:
                </span>

                <div className="p-3 rounded-2xl bg-card border border-border/80 space-y-2 shadow-2xs">
                  <div className="p-2 rounded-xl bg-muted/40 border border-border/60 text-xs font-bold font-jp text-foreground">
                    💡 {keigoFormula}
                  </div>

                  {keigoExampleJa && (
                    <div className="space-y-1 pt-1 border-t border-border/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Mẫu câu văn phòng:</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlay(keigoExampleJa)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                          title="Nghe mẫu câu"
                        >
                          <Volume2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-xs font-bold font-jp text-foreground leading-relaxed">
                        「<UniversalFurigana text={keigoExampleJa} />」
                      </div>
                      {keigoExampleVi && (
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          {keigoExampleVi}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SUB-MODE: SPEED Q&A (AI)                                   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {isQna && (
          <>
            {/* 3 Hướng trả lời đa chiều */}
            {(activeTab === "all" || activeTab === "answers") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    3 Hướng Trả Lời Đa Chiều:
                  </span>
                  <span className="text-[10px] text-muted-foreground">Loa để nghe, Click để chèn</span>
                </div>

                <div className="space-y-2">
                  {/* Row 1: Tích cực / Khẳng định */}
                  <div className="p-2.5 rounded-2xl bg-emerald-500/8 hover:bg-emerald-500/12 border border-emerald-500/25 transition-all shadow-2xs space-y-1.5 group">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        🟢 Hướng 1: Tích cực / Đồng ý
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlay(qnaMultiAnswers.positive.ja)}
                          className="h-6 px-1.5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs gap-1"
                          title="Nghe phát âm chuẩn Tokyo"
                        >
                          <Volume2 className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInsert(qnaMultiAnswers.positive.ja)}
                          className="h-6 px-1.5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs gap-1 font-bold"
                          title="Chèn vào ô phát ngôn"
                        >
                          <PlusCircle className="h-3 w-3" />
                          <span className="text-[10px]">Chèn</span>
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm font-bold font-jp text-foreground leading-relaxed">
                      「<UniversalFurigana text={qnaMultiAnswers.positive.ja} />」
                    </div>
                    {qnaMultiAnswers.positive.vi && (
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        👉 {qnaMultiAnswers.positive.vi}
                      </p>
                    )}
                  </div>

                  {/* Row 2: Phủ định / Từ chối */}
                  <div className="p-2.5 rounded-2xl bg-rose-500/8 hover:bg-rose-500/12 border border-rose-500/25 transition-all shadow-2xs space-y-1.5 group">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-700 dark:text-rose-300">
                        🔴 Hướng 2: Phủ định / Chưa thực hiện
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlay(qnaMultiAnswers.negative.ja)}
                          className="h-6 px-1.5 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 text-xs gap-1"
                          title="Nghe phát âm chuẩn Tokyo"
                        >
                          <Volume2 className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInsert(qnaMultiAnswers.negative.ja)}
                          className="h-6 px-1.5 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 text-xs gap-1 font-bold"
                          title="Chèn vào ô phát ngôn"
                        >
                          <PlusCircle className="h-3 w-3" />
                          <span className="text-[10px]">Chèn</span>
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm font-bold font-jp text-foreground leading-relaxed">
                      「<UniversalFurigana text={qnaMultiAnswers.negative.ja} />」
                    </div>
                    {qnaMultiAnswers.negative.vi && (
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        👉 {qnaMultiAnswers.negative.vi}
                      </p>
                    )}
                  </div>

                  {/* Row 3: Mở rộng / Đưa thêm chi tiết */}
                  <div className="p-2.5 rounded-2xl bg-amber-500/8 hover:bg-amber-500/12 border border-amber-500/25 transition-all shadow-2xs space-y-1.5 group">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        🟡 Hướng 3: Mở rộng thêm lý do / kế hoạch
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlay(qnaMultiAnswers.extended.ja)}
                          className="h-6 px-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs gap-1"
                          title="Nghe phát âm chuẩn Tokyo"
                        >
                          <Volume2 className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInsert(qnaMultiAnswers.extended.ja)}
                          className="h-6 px-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs gap-1 font-bold"
                          title="Chèn vào ô phát ngôn"
                        >
                          <PlusCircle className="h-3 w-3" />
                          <span className="text-[10px]">Chèn</span>
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm font-bold font-jp text-foreground leading-relaxed">
                      「<UniversalFurigana text={qnaMultiAnswers.extended.ja} />」
                    </div>
                    {qnaMultiAnswers.extended.vi && (
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        👉 {qnaMultiAnswers.extended.vi}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Từ vựng trọng tâm */}
            {(activeTab === "all" || activeTab === "vocab") && keyVocab.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Từ Vựng Gợi Ý:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {keyVocab.map((vocab, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-card border border-border/80 hover:border-emerald-500/40 flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-jp font-bold text-xs text-foreground truncate">
                          <UniversalFurigana text={vocab.ja} />
                        </div>
                        {vocab.vi && (
                          <p className="text-[10px] text-muted-foreground truncate">{vocab.vi}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handlePlay(vocab.ja)}
                          className="p-1 rounded-md text-muted-foreground hover:text-emerald-600 transition-colors"
                          title="Nghe"
                        >
                          <Volume2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsert(vocab.ja)}
                          className="h-6 px-1.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-0.5"
                          title="Chèn"
                        >
                          <PlusCircle className="h-3 w-3" />
                          <span>Chèn</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Câu mồi đệm phản xạ */}
            {(activeTab === "all" || activeTab === "rules") && (
              <div className="p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-indigo-500" />
                  Mẫu Đệm Bật Phản Xạ Nhanh:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { pattern: "そうですね、実は〜", meaning: "Để xem nào, thực ra là..." },
                    { pattern: "〜と思います", meaning: "Tôi nghĩ rằng..." },
                    { pattern: "普段はよく〜します", meaning: "Thường ngày tôi hay..." },
                  ].map((f, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleInsert(f.pattern)}
                      className="p-2 rounded-xl bg-card border border-border/80 hover:border-indigo-500/40 text-left shadow-2xs hover:bg-indigo-500/5 transition-all group"
                      title="Bấm để chèn"
                    >
                      <div className="font-jp font-bold text-xs text-foreground group-hover:text-indigo-600 transition-colors">
                        {f.pattern}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{f.meaning}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SUB-MODE: TRANSFORMATION (AI)                              */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {isTransformation && (
          <>
            {/* Công thức biến đổi ngữ pháp */}
            {(activeTab === "all" || activeTab === "rules" || activeTab === "vocab") && (
              <div className="p-3.5 rounded-2xl bg-indigo-500/8 border border-indigo-500/25 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-800 dark:text-indigo-200 flex items-center gap-1.5">
                    <Repeat className="h-3.5 w-3.5 text-indigo-500" />
                    Quy Tắc Biến Đổi: 「{transformTarget}」
                  </span>
                  <Badge variant="outline" size="sm" className="text-[10px] border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
                    Công thức vàng
                  </Badge>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border/80 text-xs font-bold font-jp text-foreground leading-relaxed">
                  💡 {transformFormula}
                </div>
                {transformGrammarNote && (
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    📌 {transformGrammarNote}
                  </p>
                )}
              </div>
            )}

            {/* Đối chiếu câu 2 chiều: Trước & Sau */}
            {(activeTab === "all" || activeTab === "answers") && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  Đối Chiếu Chuyển Thể 2 Chiều:
                </span>

                <div className="p-3 rounded-2xl bg-card border border-border/80 space-y-2.5 shadow-2xs">
                  {/* Câu gốc */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      1. Câu gốc ban đầu:
                    </span>
                    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/40 border border-border/60">
                      <div className="text-xs sm:text-sm font-bold font-jp text-foreground">
                        「<UniversalFurigana text={transformSource} />」
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePlay(transformSource)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        title="Nghe câu gốc"
                      >
                        <Volume2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="h-4 w-4 text-primary rotate-90 sm:rotate-0" />
                  </div>

                  {/* Câu đích sau biến đổi */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                        2. Câu sau khi đổi sang {transformTarget}:
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlay(transformExpected)}
                          className="h-6 px-1.5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs gap-1"
                          title="Nghe phát âm chuẩn Tokyo"
                        >
                          <Volume2 className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInsert(transformExpected)}
                          className="h-6 px-1.5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs gap-1 font-bold"
                          title="Chèn câu này vào ô nói"
                        >
                          <PlusCircle className="h-3 w-3" />
                          <span className="text-[10px]">Chèn câu</span>
                        </Button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs sm:text-sm font-bold font-jp text-foreground leading-relaxed">
                      「<UniversalFurigana text={transformExpected} />」
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SUB-MODE: CONTEXTUAL REACTION (AI)                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {isContext && (
          <>
            {/* Nhiệm vụ & Bí quyết ứng xử văn hóa */}
            {(activeTab === "all" || activeTab === "rules") && (
              <div className="p-3.5 rounded-2xl bg-amber-500/8 border border-amber-500/25 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5 text-amber-500" />
                    Bối Cảnh Đối Phương: 「{contextRole}」
                  </span>
                  <Badge variant="outline" size="sm" className="text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-300">
                    Văn hóa Kaiwa
                  </Badge>
                </div>
                <p className="text-xs font-bold text-foreground leading-snug">
                  🎯 Nhiệm vụ phản hồi: {contextIntent}
                </p>
                {contextCulturalNote && (
                  <p className="text-[11px] text-muted-foreground leading-snug border-t border-amber-500/20 pt-1.5">
                    💡 Bí quyết: {contextCulturalNote}
                  </p>
                )}
              </div>
            )}

            {/* 3 Mức độ vai vế phản hồi */}
            {(activeTab === "all" || activeTab === "answers") && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  3 Sắc Thái Ứng Xử Theo Vai Vế:
                </span>

                <div className="space-y-2">
                  {/* Cấp bậc 1: Kính ngữ trịnh trọng */}
                  <div className="p-2.5 rounded-2xl bg-purple-500/8 hover:bg-purple-500/12 border border-purple-500/25 transition-all shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {contextNuanceAnswers.keigo.role}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlay(contextNuanceAnswers.keigo.ja)}
                          className="h-6 px-1.5 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 text-xs gap-1"
                          title="Nghe phát âm Tokyo"
                        >
                          <Volume2 className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInsert(contextNuanceAnswers.keigo.ja)}
                          className="h-6 px-1.5 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 text-xs gap-1 font-bold"
                          title="Chèn"
                        >
                          <PlusCircle className="h-3 w-3" />
                          <span className="text-[10px]">Chèn</span>
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm font-bold font-jp text-foreground leading-relaxed">
                      「<UniversalFurigana text={contextNuanceAnswers.keigo.ja} />」
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      👉 {contextNuanceAnswers.keigo.vi}
                    </p>
                  </div>

                  {/* Cấp bậc 2: Lịch sự chuẩn */}
                  <div className="p-2.5 rounded-2xl bg-sky-500/8 hover:bg-sky-500/12 border border-sky-500/25 transition-all shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-700 dark:text-sky-300 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {contextNuanceAnswers.teinei.role}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlay(contextNuanceAnswers.teinei.ja)}
                          className="h-6 px-1.5 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 text-xs gap-1"
                          title="Nghe phát âm Tokyo"
                        >
                          <Volume2 className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInsert(contextNuanceAnswers.teinei.ja)}
                          className="h-6 px-1.5 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 text-xs gap-1 font-bold"
                          title="Chèn"
                        >
                          <PlusCircle className="h-3 w-3" />
                          <span className="text-[10px]">Chèn</span>
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm font-bold font-jp text-foreground leading-relaxed">
                      「<UniversalFurigana text={contextNuanceAnswers.teinei.ja} />」
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      👉 {contextNuanceAnswers.teinei.vi}
                    </p>
                  </div>

                  {/* Cấp bậc 3: Thân mật */}
                  <div className="p-2.5 rounded-2xl bg-emerald-500/8 hover:bg-emerald-500/12 border border-emerald-500/25 transition-all shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <Coffee className="h-3 w-3" />
                        {contextNuanceAnswers.tameguchi.role}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlay(contextNuanceAnswers.tameguchi.ja)}
                          className="h-6 px-1.5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs gap-1"
                          title="Nghe phát âm Tokyo"
                        >
                          <Volume2 className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInsert(contextNuanceAnswers.tameguchi.ja)}
                          className="h-6 px-1.5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs gap-1 font-bold"
                          title="Chèn"
                        >
                          <PlusCircle className="h-3 w-3" />
                          <span className="text-[10px]">Chèn</span>
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm font-bold font-jp text-foreground leading-relaxed">
                      「<UniversalFurigana text={contextNuanceAnswers.tameguchi.ja} />」
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      👉 {contextNuanceAnswers.tameguchi.vi}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
