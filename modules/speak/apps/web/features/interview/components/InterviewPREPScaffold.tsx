"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Compass,
  Lightbulb,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { speakJapaneseText } from "@/features/speaking/services/web-speech";
import type { PREPStarters } from "../types/interview";

interface InterviewPREPScaffoldProps {
  prepStarters: PREPStarters;
  keyVocabHints: Array<{ ja: string; vi: string }>;
  onSelectPhrase?: (phrase: string) => void;
}

export function InterviewPREPScaffold({
  prepStarters,
  keyVocabHints,
  onSelectPhrase,
}: InterviewPREPScaffoldProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
    if (onSelectPhrase) onSelectPhrase(text);
  };

  const prepItems = [
    {
      key: "point",
      badge: "P • Point (結論)",
      label: "Khẳng định luận điểm đầu tiên",
      color: "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300",
      starter: prepStarters.point,
    },
    {
      key: "reason",
      badge: "R • Reason (理由)",
      label: "Giải thích nguyên do / động lực",
      color: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300",
      starter: prepStarters.reason,
    },
    {
      key: "example",
      badge: "E • Example (具体例)",
      label: "Dẫn chứng số liệu hoặc dự án cụ thể",
      color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
      starter: prepStarters.example,
    },
    {
      key: "summary",
      badge: "P • Point (まとめ)",
      label: "Tóm lại và cam kết cống hiến",
      color: "border-purple-500/30 bg-purple-500/5 text-purple-700 dark:text-purple-300",
      starter: prepStarters.summary,
    },
  ];

  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-xs backdrop-blur-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Khung Gợi Ý Mẫu Câu PREP (PREP 思考フレーム)
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded((p) => !p)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
        >
          <span>{isExpanded ? "Thu gọn" : "Mở rộng"}</span>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* 4 PREP Stages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {prepItems.map((item) => (
              <div
                key={item.key}
                className={cn(
                  "p-2.5 rounded-xl border space-y-1.5 transition-all text-xs",
                  item.color
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px]">{item.badge}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.key, item.starter)}
                    className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer p-1"
                    title="Chèn mẫu câu vào bài làm"
                  >
                    {copiedKey === item.key ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className="text-xs font-medium text-foreground bg-background/70 p-2 rounded-lg border border-border/40 select-all">
                  {item.starter}
                </p>
              </div>
            ))}
          </div>

          {/* Key Vocabulary Hints */}
          {keyVocabHints.length > 0 && (
            <div className="pt-2 border-t border-border/40 space-y-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                <span>Từ vựng trọng tâm nên dùng:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {keyVocabHints.map((vocab, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      speakJapaneseText(vocab.ja);
                      if (onSelectPhrase) onSelectPhrase(vocab.ja);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-primary/15 border border-border/60 text-xs font-medium text-foreground transition-all cursor-pointer"
                    title="Bấm để nghe phát âm & chèn từ"
                  >
                    <span>{vocab.ja}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({vocab.vi})
                    </span>
                    <Volume2 className="h-3 w-3 text-muted-foreground/60 ml-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
