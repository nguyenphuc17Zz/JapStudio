"use client";

import React, { useState, useEffect } from "react";
import { ContextGuessResponse, ContextGuessOption } from "@/lib/types";
import { immersionApi } from "@/lib/api";
import { MarkdownRenderer } from "@/components/ui";
import {
  X,
  Sparkles,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  ArrowRight,
  BookOpen,
  Eye,
  Smile,
  Meh,
  Frown,
} from "lucide-react";

interface ContextGuessModalProps {
  contentId: number;
  guessData: ContextGuessResponse | null;
  onClose: () => void;
}

export const ContextGuessModal: React.FC<ContextGuessModalProps> = ({
  contentId,
  guessData,
  onClose,
}) => {
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [selectedOption, setSelectedOption] = useState<ContextGuessOption | null>(null);
  const [confidence, setConfidence] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [startTime] = useState<number>(Date.now());

  useEffect(() => {
    setStage(1);
    setSelectedOption(null);
  }, [guessData]);

  if (!guessData) return null;

  // Mirrors the guess outcome into the Personal Knowledge Library.
  // Fire-and-forget: must never block the guessing flow.
  const logGuessKnowledge = (eventType: "CONTEXT_GUESS_CORRECT" | "CONTEXT_GUESS_WRONG" | "ENCOUNTERED") => {
    immersionApi.ingestLearningEvent({
      event_type: eventType,
      item_type: "VOCABULARY",
      term: guessData.surface_form,
      reading: guessData.reading,
      meaning: guessData.full_meaning,
      content_id: contentId,
      sentence_text: guessData.sentence_text,
    }).catch(() => {});
  };

  const handleSelectOption = async (option: ContextGuessOption) => {
    setSelectedOption(option);
    const timeSpent = Date.now() - startTime;

    if (option.is_correct) {
      setStage(3);
      logGuessKnowledge("CONTEXT_GUESS_CORRECT");
      await immersionApi.recordInteraction({
        content_id: contentId,
        target_id: guessData.surface_form,
        interaction_type: "CONTEXT_GUESS",
        result: "CORRECT",
        confidence,
        time_spent_ms: timeSpent,
        metadata_json: { selected_text: option.text, stage_reached: stage },
      });
    } else {
      // Wrong guess -> Transition to Stage 2: Reveal Context Clues!
      setStage(2);
      logGuessKnowledge("CONTEXT_GUESS_WRONG");
      await immersionApi.recordInteraction({
        content_id: contentId,
        target_id: guessData.surface_form,
        interaction_type: "CONTEXT_GUESS",
        result: "INCORRECT",
        confidence,
        time_spent_ms: timeSpent,
        metadata_json: { selected_text: option.text, stage_reached: stage },
      });
    }
  };

  const handleRevealAll = async () => {
    setStage(3);
    // User gave up: at least register the encounter so the word enters the library.
    logGuessKnowledge("ENCOUNTERED");
    await immersionApi.recordInteraction({
      content_id: contentId,
      target_id: guessData.surface_form,
      interaction_type: "CONTEXT_GUESS",
      result: "REVEALED",
      confidence,
      time_spent_ms: Date.now() - startTime,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-sumi-900 border border-sumi-700 shadow-2xl p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Stage Badge */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-torii-100 dark:bg-torii-500/20 text-torii-600 dark:text-torii-400 border border-torii-200 dark:border-torii-500/30">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-torii-100 dark:bg-torii-950 text-torii-800 dark:text-torii-400 border border-torii-200 dark:border-torii-800">
                  Stage {stage}/3: {stage === 1 ? "Đoán nghĩa ngữ cảnh" : stage === 2 ? "Manh mối ngữ cảnh" : "Ý nghĩa đầy đủ"}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-sumi-900 dark:text-white font-serif tracking-wide mt-1">
                {guessData.surface_form}
                {guessData.reading && guessData.reading !== guessData.surface_form && (
                  <span className="text-sm text-sumi-400 font-sans ml-2">
                    【{guessData.reading}】
                  </span>
                )}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sumi-400 hover:text-sumi-900 dark:hover:text-white hover:bg-sumi-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Sentence Box with Clue Highlights */}
        <div className="mb-5 p-3.5 rounded-xl bg-sumi-950/70 border border-sumi-800">
          <span className="text-[10px] text-sumi-400 font-mono block mb-1">
            Câu chứa từ trong bài đọc:
          </span>
          <p className="text-sm sm:text-base text-sumi-800 dark:text-sumi-200 font-serif leading-relaxed">
            {guessData.sentence_text}
          </p>
        </div>

        {/* STAGE 1: Guessing with 4 Options */}
        {stage === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <span className="text-xs text-sumi-700 dark:text-sumi-300 font-semibold block mb-2">
                Theo bạn, trong ngữ cảnh câu trên, từ này có nghĩa là gì?
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {guessData.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(opt)}
                    className="p-3 rounded-xl bg-sumi-850 hover:bg-sumi-800 text-left border border-sumi-750 hover:border-torii-500/50 text-xs font-medium text-sumi-800 dark:text-sumi-200 hover:text-sumi-950 dark:hover:text-white transition-all hover:scale-[1.01]"
                  >
                    <span className="text-torii-600 dark:text-torii-400 font-bold mr-2">{String.fromCharCode(64 + opt.id)}.</span>
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Confidence Selector */}
            <div className="flex items-center justify-between pt-2 border-t border-sumi-800/80 text-[11px] text-sumi-400">
              <span>Mức độ tự tin của bạn:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setConfidence("HIGH")}
                  className={`px-2 py-1 rounded-lg border flex items-center gap-1 transition-colors ${
                    confidence === "HIGH"
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 font-semibold"
                      : "bg-sumi-800/40 border-sumi-750 text-sumi-400"
                  }`}
                >
                  <Smile className="w-3.5 h-3.5" /> Rất chắc
                </button>
                <button
                  onClick={() => setConfidence("MEDIUM")}
                  className={`px-2 py-1 rounded-lg border flex items-center gap-1 transition-colors ${
                    confidence === "MEDIUM"
                      ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-800 font-semibold"
                      : "bg-sumi-800/40 border-sumi-750 text-sumi-400"
                  }`}
                >
                  <Meh className="w-3.5 h-3.5" /> Vừa phải
                </button>
                <button
                  onClick={() => setConfidence("LOW")}
                  className={`px-2 py-1 rounded-lg border flex items-center gap-1 transition-colors ${
                    confidence === "LOW"
                      ? "bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-400 border-sky-300 dark:border-sky-800 font-semibold"
                      : "bg-sumi-800/40 border-sumi-750 text-sumi-400"
                  }`}
                >
                  <Frown className="w-3.5 h-3.5" /> Đoán mò
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setStage(2)}
                className="text-xs text-sumi-500 hover:text-torii-600 dark:text-sumi-400 dark:hover:text-torii-400 flex items-center gap-1 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Xem gợi ý manh mối ngữ cảnh (Stage 2)</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2: Context Clues Revealed */}
        {stage === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 shadow-sm">
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400 text-xs font-semibold mb-1">
                <Lightbulb className="w-4 h-4" />
                <span>Manh mối suy luận từ câu văn:</span>
              </div>
              <div className="text-xs text-amber-900 dark:text-amber-200/90 leading-relaxed font-medium">
                <MarkdownRenderer content={guessData.clue_hint} />
              </div>
            </div>

            <div>
              <span className="text-xs text-sumi-700 dark:text-sumi-300 font-semibold block mb-2">
                Hãy thử chọn lại sau khi quan sát manh mối:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {guessData.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(opt)}
                    className="p-3 rounded-xl bg-sumi-850 hover:bg-sumi-800 text-left border border-sumi-750 hover:border-torii-500/50 text-xs font-medium text-sumi-800 dark:text-sumi-200 hover:text-sumi-950 dark:hover:text-white transition-all"
                  >
                    <span className="text-torii-600 dark:text-torii-400 font-bold mr-2">{String.fromCharCode(64 + opt.id)}.</span>
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStage(1)}
                className="text-xs text-sumi-500 hover:text-sumi-900 dark:text-sumi-400 dark:hover:text-sumi-200"
              >
                &larr; Quay lại
              </button>
              <button
                onClick={handleRevealAll}
                className="text-xs font-semibold text-torii-600 dark:text-torii-400 hover:text-torii-700 dark:hover:text-torii-300 flex items-center gap-1"
              >
                <span>Mở đáp án đầy đủ &rarr;</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: Full Meaning & Micro-examples */}
        {stage === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Answer banner */}
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/40 flex items-start gap-3 shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                  Ý nghĩa chuẩn xác trong bài:
                </span>
                <p className="text-lg font-bold text-sumi-900 dark:text-white font-serif">
                  {guessData.full_meaning}
                </p>
              </div>
            </div>

            {/* Why this word? */}
            {guessData.why_this_word && (
              <div className="p-3.5 rounded-xl bg-sumi-950/60 border border-sumi-800 text-xs">
                <span className="text-[10px] font-mono text-sumi-400 uppercase font-bold block mb-1">
                  Tại sao tác giả dùng từ này?
                </span>
                <div className="text-sumi-700 dark:text-sumi-300 leading-relaxed">
                  <MarkdownRenderer content={guessData.why_this_word} />
                </div>
              </div>
            )}

            {/* Micro examples */}
            {guessData.micro_examples?.length > 0 && (
              <div className="p-3.5 rounded-xl bg-sumi-950/60 border border-sumi-800 text-xs">
                <span className="text-[10px] font-mono text-sumi-400 uppercase font-bold block mb-1.5">
                  Cách dùng thực tế lân cận:
                </span>
                <div className="space-y-1.5 text-sumi-300">
                  {guessData.micro_examples.map((ex, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-sumi-900 text-xs text-sumi-800 dark:text-sumi-200 font-japanese border border-sumi-800/80"
                    >
                      <MarkdownRenderer content={ex} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-torii-500 hover:bg-torii-600 text-white text-xs font-semibold shadow-lg transition-all flex items-center gap-1.5"
              >
                <span>Đã hiểu, tiếp tục đọc</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
