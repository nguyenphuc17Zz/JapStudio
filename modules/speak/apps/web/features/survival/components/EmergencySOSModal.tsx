"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, Volume2, Copy, Check } from "lucide-react";
import { toast } from "@/lib/toast";
import { speakJapaneseText } from "@/features/speaking/services/web-speech";
import { survivalApi } from "../services/survival-api";
import type { SOSSuggestionItem, SocialRelationship } from "../types/survival";

interface EmergencySOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  lastAiMessage: string;
  relationship?: SocialRelationship;
  onSelectPhrase?: (phrase: string) => void;
}

export function EmergencySOSModal({
  isOpen,
  onClose,
  lastAiMessage,
  relationship = "polite",
  onSelectPhrase,
}: EmergencySOSModalProps) {
  const [suggestions, setSuggestions] = useState<SOSSuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoading(true);

    survivalApi
      .getSosHint({
        lastAiMessage: lastAiMessage || "会話中",
        relationship,
      })
      .then((res) => {
        if (isMounted) setSuggestions(res.suggestions);
      })
      .catch((err) => {
        console.error("SOS Hint error:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, lastAiMessage, relationship]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      toast.success("Đã sao chép câu cứu cánh!");
      setTimeout(() => setCopiedText(null), 1500);
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  const handlePlay = (text: string) => {
    speakJapaneseText(text);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🆘 Cứu Cánh Khẩn Cấp (Emergency SOS)"
      description="Chọn ngay một câu cứu nguy dưới đây để phá vỡ khoảng lặng và tiếp tục hội thoại!"
      className="max-w-lg"
    >
      <div className="space-y-2.5 py-2">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
            Đang phân tích ngữ cảnh để tìm câu cứu cánh tối ưu...
          </div>
        ) : (
          suggestions.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 hover:border-primary/50 transition-all space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] font-bold border-primary/40 text-primary">
                  {item.title}
                </Badge>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-full text-muted-foreground hover:text-foreground"
                    onClick={() => handlePlay(item.japanese_phrase)}
                    title="Nghe phát âm"
                  >
                    <Volume2 className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-full text-muted-foreground hover:text-foreground"
                    onClick={() => handleCopy(item.japanese_phrase)}
                    title="Sao chép"
                  >
                    {copiedText === item.japanese_phrase ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-sm font-bold text-foreground">
                {item.japanese_phrase}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {item.meaning_vi}
              </div>

              {onSelectPhrase && (
                <div className="pt-1 flex justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onSelectPhrase(item.japanese_phrase);
                      onClose();
                    }}
                    className="h-7 text-xs rounded-xl px-2.5"
                  >
                    Sử dụng câu này
                  </Button>
                </div>
              )}
            </div>
          ))
        )}

        <div className="flex justify-end pt-2 border-t border-border/40">
          <Button variant="outline" onClick={onClose} className="rounded-xl text-xs h-9">
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
}
