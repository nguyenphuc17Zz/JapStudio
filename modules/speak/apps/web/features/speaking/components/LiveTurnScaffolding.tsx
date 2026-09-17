"use client";

import React, { useMemo, useState } from "react";
import { ScaffoldingHint, ScaffoldingSuggestion, ScaffoldingVocab } from "../types";
import { Sparkles, Volume2, BookOpen, ChevronRight, Check, ArrowRight, Lightbulb } from "lucide-react";
import { speakJapaneseText } from "@/features/speaking/services/web-speech";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";

interface LiveTurnScaffoldingProps {
  scaffolding?: ScaffoldingHint | null;
  lastAiText?: string | null;
  personaName?: string;
  onSelectSuggestion?: (text: string) => void;
  disabled?: boolean;
}

export function LiveTurnScaffolding({
  scaffolding,
  lastAiText,
  personaName,
  onSelectSuggestion,
  disabled = false,
}: LiveTurnScaffoldingProps) {
  const [playingItem, setPlayingItem] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Only display scaffolding when provided by backend AI (no hardcoded junk)
  const effectiveScaffolding: ScaffoldingHint | null = useMemo(() => {
    if (scaffolding && (scaffolding.suggestions?.length || scaffolding.key_vocab?.length)) {
      return scaffolding;
    }
    return null;
  }, [scaffolding]);

  if (!effectiveScaffolding) return null;

  const handlePlayAudio = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    soundFX.playFurin();
    setPlayingItem(text);
    speakJapaneseText(text, { rate: 0.95 });
    setTimeout(() => setPlayingItem(null), 1500);
  };

  const handleSelect = (text: string) => {
    if (disabled) return;
    soundFX.playFurin();
    onSelectSuggestion?.(text);
  };

  const getIntentStyle = (intent?: string) => {
    switch (intent) {
      case "positive":
        return {
          badge: "🟢 Khẳng định / Thuận lợi",
          bg: "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
          iconColor: "text-emerald-500",
        };
      case "concern":
        return {
          badge: "🟡 Khó khăn / Khéo léo",
          bg: "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-700 dark:text-amber-300",
          iconColor: "text-amber-500",
        };
      case "question":
        return {
          badge: "🔵 Hỏi lại / Mở rộng",
          bg: "bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 text-indigo-700 dark:text-indigo-300",
          iconColor: "text-indigo-500",
        };
      default:
        return {
          badge: "✨ Gợi ý phản hồi",
          bg: "bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary",
          iconColor: "text-primary",
        };
    }
  };

  return (
    <div className="w-full p-3 rounded-2xl bg-gradient-to-br from-card via-card/90 to-background border border-border/80 shadow-md space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-black text-foreground">
          <Lightbulb className="h-4 w-4 text-amber-500 animate-pulse" />
          <span>Gợi Ý Phản Hồi Cho Lượt Nói Này</span>
          {personaName && (
            <span className="text-[10px] text-muted-foreground font-normal">
              (với {personaName})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[10px] font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
            Bấm để chèn vào câu trả lời
          </span>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-xs flex items-center gap-1 cursor-pointer"
            title={isCollapsed ? "Mở rộng gợi ý" : "Thu gọn gợi ý"}
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", !isCollapsed && "rotate-90")} />
            <span className="text-[10px] font-medium">{isCollapsed ? "Mở gợi ý" : "Thu gọn"}</span>
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* 3 Response Angle Cards */}
          {effectiveScaffolding.suggestions && effectiveScaffolding.suggestions.length > 0 && (
            <div className="space-y-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {effectiveScaffolding.suggestions.map((sug, idx) => {
                  const style = getIntentStyle(sug.intent);
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelect(sug.ja)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer group shadow-2xs hover:shadow-xs",
                        style.bg,
                        disabled && "opacity-50 cursor-not-allowed"
                      )}
                      title="Bấm để chèn câu hoặc nghe phát âm"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-background/80 border border-border/40">
                            {style.badge}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handlePlayAudio(e, sug.ja)}
                              className={cn(
                                "p-1 rounded-md bg-background/80 border border-border/60 hover:bg-background transition-colors",
                                playingItem === sug.ja && "text-primary border-primary animate-pulse"
                              )}
                              title="Nghe mẫu phát âm"
                            >
                              <Volume2 className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(sug.ja);
                              }}
                              className="p-1 rounded-md bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors"
                              title="Chèn vào câu trả lời"
                            >
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs font-bold font-jp text-foreground leading-snug group-hover:text-primary transition-colors">
                          {sug.ja}
                        </p>
                        {sug.vi && (
                          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
                            {sug.vi}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Strategic Key Vocab & Collocations */}
          {effectiveScaffolding.key_vocab && effectiveScaffolding.key_vocab.length > 0 && (
            <div className="pt-1.5 border-t border-border/40 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <BookOpen className="h-3 w-3 text-indigo-500" />
                <span>Từ vựng & Mẫu câu gợi ý:</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {effectiveScaffolding.key_vocab.map((v, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelect(v.ja)}
                    className="px-2 py-0.5 rounded-lg bg-background/80 border border-border/60 hover:border-primary/40 hover:bg-muted/40 text-[10.5px] font-medium flex items-center gap-1 transition-all shadow-2xs group cursor-pointer"
                    title={`Bấm để chèn từ "${v.ja}" (${v.vi})`}
                  >
                    <span className="font-bold font-jp text-primary group-hover:underline">
                      {v.ja}
                    </span>
                    {v.reading && v.reading !== v.ja && (
                      <span className="text-[9.5px] text-muted-foreground font-jp">
                        ({v.reading})
                      </span>
                    )}
                    <span className="text-[9.5px] text-muted-foreground font-normal">
                      • {v.vi}
                    </span>
                    <span
                      onClick={(e) => handlePlayAudio(e, v.ja)}
                      className="p-0.5 rounded text-muted-foreground hover:text-primary transition-colors ml-0.5"
                      title="Nghe phát âm từ này"
                    >
                      <Volume2 className="h-2.5 w-2.5" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
