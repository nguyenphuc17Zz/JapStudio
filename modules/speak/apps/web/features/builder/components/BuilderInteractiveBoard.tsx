"use client";

import React, { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Zap,
  Volume2,
  ChevronDown,
  Copy,
  Check,
  RotateCcw,
  Delete,
  CornerDownLeft,
  Lightbulb,
  Plus,
  BookOpen,
} from "lucide-react";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { soundFX } from "@/lib/sound-fx";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { BuilderExercise, BuilderSkill } from "../services/builder-api";

interface BuilderInteractiveBoardProps {
  exercise: BuilderExercise | null;
  assembledText: string;
  onAssembledTextChange: (text: string) => void;
  hintTier: number;
  onSelectHintTier: (tier: 1 | 2 | 3 | 4) => void;
}

const DEFAULT_CONNECTORS_BY_SKILL: Record<BuilderSkill, Array<{ term: string; meaningVi: string }>> = {
  te_chain: [
    { term: "〜て", meaningVi: "và, rồi (chuỗi hành động)" },
    { term: "〜くて", meaningVi: "thể て của tính từ đuôi -i" },
    { term: "〜で", meaningVi: "thể て của danh từ/tính từ đuôi -na" },
    { term: "〜てから", meaningVi: "sau khi làm V thì..." },
    { term: "〜ながら", meaningVi: "vừa làm... vừa..." },
  ],
  relative_clause: [
    { term: "〜た [Danh từ]", meaningVi: "đã làm V (mệnh đề quá khứ)" },
    { term: "〜ている [Danh từ]", meaningVi: "đang làm V" },
    { term: "〜ない [Danh từ]", meaningVi: "không làm V" },
    { term: "〜という", meaningVi: "cái gọi là..." },
    { term: "〜ための", meaningVi: "dành cho mục đích..." },
  ],
  conditional: [
    { term: "〜たら", meaningVi: "nếu / sau khi (thông dụng nhất)" },
    { term: "〜ば", meaningVi: "nếu (giả định logic)" },
    { term: "〜なら", meaningVi: "nếu là (tiếp nhận ý)" },
    { term: "〜と", meaningVi: "hễ mà..." },
    { term: "〜ても", meaningVi: "cho dù có... đi nữa" },
  ],
  nominalization: [
    { term: "〜ので", meaningVi: "bởi vì... nên (lịch sự khách quan)" },
    { term: "〜から", meaningVi: "vì... nên (chủ quan)" },
    { term: "〜わけだ", meaningVi: "thảo nào là vậy" },
    { term: "〜はずだ", meaningVi: "chắc chắn là (theo logic)" },
    { term: "〜んです", meaningVi: "giải thích lý do thân mật" },
  ],
  contraction: [
    { term: "〜てる", meaningVi: "nói tắt của ている (đang)" },
    { term: "〜ちゃう", meaningVi: "nói tắt của てしまう (lỡ làm)" },
    { term: "〜とく", meaningVi: "nói tắt của ておく (làm sẵn)" },
    { term: "〜じゃん", meaningVi: "chẳng phải sao (thân mật)" },
    { term: "〜さ", meaningVi: "đấy/á (nhấn mạnh thân mật)" },
  ],
};

export function BuilderInteractiveBoard({
  exercise,
  assembledText,
  onAssembledTextChange,
  hintTier,
  onSelectHintTier,
}: BuilderInteractiveBoardProps) {
  const [isPlayingFull, setIsPlayingFull] = useState(false);
  const [isHintsExpanded, setIsHintsExpanded] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Đã sao chép: " + text);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 1500);
    } catch {
      toast.error("Không thể sao chép. Vui lòng bôi đen chuột và nhấn Ctrl+C.");
    }
  }, []);

  if (!exercise) return null;

  const canonicalSentence =
    exercise.canonical ||
    exercise.sourceSentence ||
    "";
  const canonicalVi = exercise.canonicalVi || "";

  const handlePlayFullSentence = () => {
    if (!canonicalSentence) return;
    try {
      stopWebSpeech();
      setIsPlayingFull(true);
      speakJapaneseText(canonicalSentence, {
        rate: 0.95,
        onEnd: () => setIsPlayingFull(false),
        onError: () => setIsPlayingFull(false),
      });
    } catch {
      setIsPlayingFull(false);
    }
  };

  const handleInsertToken = (token: string) => {
    soundFX.playTaiko();
    const cleanToken = token.replace(/^[〜\s]+/, "");
    const trimmed = assembledText.trim();
    if (!trimmed) {
      onAssembledTextChange(cleanToken);
    } else {
      // Append smoothly without duplicate spaces
      onAssembledTextChange(`${trimmed}${cleanToken}`);
    }
  };

  const handleRemoveLastToken = () => {
    const trimmed = assembledText.trim();
    if (!trimmed) return;
    // Remove last word or trailing Japanese characters
    const words = trimmed.split(/\s+/);
    if (words.length > 1) {
      words.pop();
      onAssembledTextChange(words.join(" "));
    } else {
      onAssembledTextChange(trimmed.slice(0, -1));
    }
  };

  const handleClearAll = () => {
    onAssembledTextChange("");
  };

  const handleApplyCanonical = () => {
    if (canonicalSentence) {
      soundFX.playFurin();
      onAssembledTextChange(canonicalSentence);
      toast.info("Đã áp dụng câu mẫu vào ô luyện nói");
    }
  };

  // Connectors for this skill
  const skillConnectors = DEFAULT_CONNECTORS_BY_SKILL[exercise.focusSkill] || DEFAULT_CONNECTORS_BY_SKILL.te_chain;
  const mergedConnectors = [
    ...(exercise.connectorItems || []).map((c) => ({ term: c.term, meaningVi: c.meaningVi })),
    ...skillConnectors,
  ].filter((item, idx, arr) => arr.findIndex((x) => x.term === item.term) === idx);

  // Progressive hints
  const hints = exercise.hints && exercise.hints.length > 0
    ? exercise.hints
    : [
        { tier: 1 as const, title: "Hướng tư duy ngữ pháp", content: `Kỹ năng: ${exercise.focusSkill}. Chia đúng thể để kết nối các vế.` },
        { tier: 2 as const, title: "Gợi ý từ nối", content: mergedConnectors.slice(0, 3).map((c) => c.term).join(", ") },
        { tier: 3 as const, title: "Khung sườn cấu trúc", content: exercise.template || (exercise.starter ? `${exercise.starter}…` : "Chưa có khung sườn") },
        { tier: 4 as const, title: "Câu mẫu hoàn chỉnh", content: canonicalSentence },
      ];

  return (
    <div className="h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl shadow-lg p-3.5 sm:p-4 overflow-hidden gap-2.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="size-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            2. Bàn Lắp Ghép & Gợi Ý Nấc Thang
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600 dark:text-amber-400">
            Nấc T{hintTier}/4
          </Badge>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 min-h-0">
        {/* Template Scaffold if available */}
        {exercise.template && (
          <div className="p-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              <span className="flex items-center gap-1">
                <Sparkles className="size-3 text-amber-500" />
                <span>Khung sườn cấu trúc mẫu:</span>
              </span>
            </div>
            <p className="font-jp text-xs sm:text-sm font-bold text-foreground leading-relaxed">
              <UniversalFurigana text={exercise.template} fontSize="sm" />
            </p>
          </div>
        )}

        {/* Sentence Assembly Canvas */}
        <div className="p-3 rounded-2xl bg-card border-2 border-primary/30 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
              <Sparkles className="size-3" />
              <span>Câu bạn đang lắp ghép:</span>
            </span>

            <div className="flex items-center gap-1">
              {assembledText && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLastToken}
                    className="h-6 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground rounded-lg"
                    title="Xóa ký tự/từ cuối"
                  >
                    <Delete className="size-3" />
                    <span className="hidden sm:inline">Xóa bớt</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-6 px-1.5 text-[10px] gap-1 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                    title="Xóa làm lại từ đầu"
                  >
                    <RotateCcw className="size-3" />
                    <span className="hidden sm:inline">Làm lại</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="min-h-[48px] p-2.5 rounded-xl bg-muted/25 border border-border/70 flex items-center">
            {assembledText ? (
              <span className="font-jp text-base sm:text-lg font-bold text-foreground leading-snug break-words">
                <UniversalFurigana text={assembledText} fontSize="normal" />
              </span>
            ) : (
              <span className="text-xs text-muted-foreground italic font-sans flex items-center gap-1.5">
                <Plus className="size-3 text-primary animate-pulse" />
                Bấm các mảnh ghép bên dưới để lắp ráp câu, hoặc đọc trực tiếp qua micro...
              </span>
            )}
          </div>
        </div>

        {/* Clickable Word & Connector Bank */}
        <div className="space-y-2">
          {/* Keywords Bank */}
          {exercise.keywords && exercise.keywords.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <span>Từ khóa ghép câu:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {exercise.keywords.map((kw, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleInsertToken(kw)}
                    className="px-2.5 py-1 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-700 dark:text-sky-300 font-jp font-bold text-xs shadow-2xs cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                    title={`Chèn "${kw}" vào câu`}
                  >
                    <Plus className="size-2.5 opacity-60" />
                    <span>{kw}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Connectors Bank */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Zap className="size-3 text-amber-500" />
              <span>Liên từ & Hậu tố gợi ý (Bấm để chèn nối vế):</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {mergedConnectors.map((conn, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleInsertToken(conn.term)}
                  className="px-2 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-jp font-bold text-xs shadow-2xs cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                  title={conn.meaningVi ? `${conn.term} (${conn.meaningVi})` : conn.term}
                >
                  <Plus className="size-2.5 opacity-60" />
                  <span>{conn.term}</span>
                  {conn.meaningVi && (
                    <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-normal font-sans">
                      ({conn.meaningVi})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4-Tier Progressive Scaffolding Hints */}
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-2.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              <Sparkles className="size-3 text-amber-500" />
              <span>Gợi ý nấc thang (T1 - T4):</span>
            </div>
            <button
              type="button"
              onClick={() => setIsHintsExpanded(!isHintsExpanded)}
              className="text-[10px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>{isHintsExpanded ? "Thu gọn" : "Mở rộng"}</span>
              <ChevronDown className={cn("size-3 transition-transform duration-200", isHintsExpanded && "rotate-180")} />
            </button>
          </div>

          {isHintsExpanded && (
            <div className="space-y-1.5 pt-0.5 animate-in fade-in-0 duration-150">
              {hints.map((h) => {
                const tierStyles = [
                  { badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30", border: "border-sky-500/20 bg-card/90" },
                  { badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30", border: "border-indigo-500/20 bg-card/90" },
                  { badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30", border: "border-amber-500/20 bg-card/90" },
                  { badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", border: "border-emerald-500/20 bg-card/90" },
                ];
                const style = tierStyles[h.tier - 1] || tierStyles[0];
                const isFullSentenceTier = h.tier === 4;

                return (
                  <div
                    key={h.tier}
                    className={cn(
                      "p-2 rounded-xl border shadow-2xs space-y-1 transition-all",
                      style.border,
                      hintTier >= h.tier && "ring-1 ring-primary/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectHintTier(h.tier as any)}
                          className={cn("px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border cursor-pointer", style.badge)}
                        >
                          T{h.tier}
                        </button>
                        <span className="text-[11px] font-bold text-foreground">{h.title}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {h.content && (
                          <button
                            type="button"
                            onClick={() => handleCopy(h.content, `hint-${h.tier}`)}
                            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
                            title="Sao chép nội dung gợi ý"
                          >
                            {copiedId === `hint-${h.tier}` ? (
                              <Check className="size-3 text-emerald-500" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        )}
                        {isFullSentenceTier && canonicalSentence && (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handlePlayFullSentence}
                              className="h-5 px-1.5 text-[9px] gap-1 rounded-md border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shrink-0 font-semibold cursor-pointer"
                              title="Nghe câu mẫu"
                            >
                              <Volume2 className={cn("size-2.5", isPlayingFull && "animate-bounce")} />
                              <span>{isPlayingFull ? "Đang đọc..." : "Nghe"}</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleApplyCanonical}
                              className="h-5 px-1.5 text-[9px] gap-1 rounded-md border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 shrink-0 font-semibold cursor-pointer"
                              title="Chép câu mẫu vào ô ghép"
                            >
                              <CornerDownLeft className="size-2.5" />
                              <span>Chèn câu</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="font-jp text-xs font-medium text-foreground/90 pl-0.5 leading-snug select-text cursor-text">
                      <UniversalFurigana text={h.content} fontSize="sm" />
                    </p>
                    {isFullSentenceTier && canonicalVi && (
                      <p className="text-[10px] text-muted-foreground italic font-sans pl-0.5">
                        {canonicalVi}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Meta */}
      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground shrink-0 font-mono">
        <span className="flex items-center gap-1">
          <BookOpen className="size-3 text-amber-500" />
          <span>Bấm phím [H] để mở nấc thang gợi ý tiếp theo</span>
        </span>
        <span>Hiện tại: T{hintTier}/4</span>
      </div>
    </div>
  );
}
