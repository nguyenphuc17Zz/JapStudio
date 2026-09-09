"use client";

import React, { useState } from "react";
import { immersionApi } from "@/lib/api";
import { CheckCircle2, Smile, Meh, Frown } from "lucide-react";

interface SentenceCheckBarProps {
  contentId: number;
  sentenceIndex: number;
  onRatingRecorded?: (rating: "UNDERSTOOD" | "MOSTLY" | "NOT_UNDERSTOOD") => void;
}

export const SentenceCheckBar: React.FC<SentenceCheckBarProps> = ({
  contentId,
  sentenceIndex,
  onRatingRecorded,
}) => {
  const [rated, setRated] = useState<"UNDERSTOOD" | "MOSTLY" | "NOT_UNDERSTOOD" | null>(null);

  const handleRate = async (val: "UNDERSTOOD" | "MOSTLY" | "NOT_UNDERSTOOD") => {
    setRated(val);
    try {
      await immersionApi.recordInteraction({
        content_id: contentId,
        sentence_index: sentenceIndex,
        interaction_type: "COMPREHENSION_CHECK",
        result: val,
        confidence: val === "UNDERSTOOD" ? "HIGH" : val === "MOSTLY" ? "MEDIUM" : "LOW",
      });
      if (onRatingRecorded) onRatingRecorded(val);
    } catch (err) {
      console.error("Failed to record comprehension rating:", err);
    }
  };

  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-sumi-900/70 border border-sumi-800 text-xs">
      <span className="text-[11px] text-sumi-400 font-medium">
        Mức độ hiểu câu:
      </span>

      {rated ? (
        <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {rated === "UNDERSTOOD" ? "Đã hiểu rõ" : rated === "MOSTLY" ? "Tạm hiểu" : "Cần xem lại"}
        </span>
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleRate("UNDERSTOOD")}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/60 text-[11px] font-medium transition-colors"
            title="Đã hiểu rõ câu này"
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Rõ</span>
          </button>
          <button
            onClick={() => handleRate("MOSTLY")}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-400 border border-amber-800/60 text-[11px] font-medium transition-colors"
            title="Hiểu khoảng 70%"
          >
            <Meh className="w-3.5 h-3.5" />
            <span>Tạm</span>
          </button>
          <button
            onClick={() => handleRate("NOT_UNDERSTOOD")}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-950/40 hover:bg-sky-900/60 text-sky-400 border border-sky-800/60 text-[11px] font-medium transition-colors"
            title="Chưa hiểu hoặc còn lúng túng"
          >
            <Frown className="w-3.5 h-3.5" />
            <span>Chưa rõ</span>
          </button>
        </div>
      )}
    </div>
  );
};
