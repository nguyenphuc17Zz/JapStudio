"use client";

import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Flame,
  Target,
  ArrowRight,
  RefreshCw,
  Crown,
  Volume2,
  Zap,
} from "lucide-react";
import { coachCoreApi, DailyBriefingDTO, CoachPersona } from "../services/coachCoreApi";
import { speakJapaneseText } from "@/features/speaking/services/web-speech";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const SENSEI_PERSONAS: {
  id: CoachPersona;
  name: string;
  jpName: string;
  tag: string;
  avatar: string;
  desc: string;
  color: string;
}[] = [
  {
    id: "tanaka",
    name: "Thầy Tanaka",
    jpName: "田中先生",
    tag: "Kính ngữ & Doanh nghiệp",
    avatar: "🎓",
    desc: "Chuẩn mực, điềm đạm, chuyên sâu văn hóa công sở Nhật",
    color: "purple",
  },
  {
    id: "aoi",
    name: "Aoi-chan",
    jpName: "あおい",
    tag: "Thân thiện & Khích lệ",
    avatar: "🌸",
    desc: "Tươi vui, gần gũi, tạo động lực giao tiếp đời sống",
    color: "rose",
  },
  {
    id: "kenji",
    name: "Kenji Senpai",
    jpName: "健二先輩",
    tag: "Thực chiến & Phản xạ",
    avatar: "⚡",
    desc: "Sắc bén, thẳng thắn, tối ưu tốc độ & phỏng vấn",
    color: "amber",
  },
];

export function DailySenseiBriefingCard() {
  const [selectedPersona, setSelectedPersona] = useState<CoachPersona>("tanaka");
  const [briefing, setBriefing] = useState<DailyBriefingDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchBriefing = async (persona: CoachPersona) => {
    try {
      setLoading(true);
      const data = await coachCoreApi.getDailyBriefing(persona);
      setBriefing(data);
    } catch (e) {
      console.warn("Failed to fetch daily briefing:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefing(selectedPersona);
  }, [selectedPersona]);

  const activePersonaObj = SENSEI_PERSONAS.find((p) => p.id === selectedPersona) || SENSEI_PERSONAS[0];

  return (
    <div className="p-5 sm:p-6 rounded-[24px] border border-border/70 bg-card/65 backdrop-blur-xl shadow-glass-card hover:shadow-glass-hover transition-all duration-300 space-y-4">
      {/* Top Header: Sensei Avatar & Persona Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/25 flex items-center justify-center text-xl shadow-xs">
            {activePersonaObj.avatar}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                Lời khuyên hôm nay từ {activePersonaObj.name}
              </h3>
              <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/25 font-semibold font-mono">
                AI SENSEI
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">{activePersonaObj.desc}</p>
          </div>
        </div>

        {/* Persona Switch Pills */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-full border border-border/70 self-start sm:self-auto backdrop-blur-md">
          {SENSEI_PERSONAS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                soundFX.playFurin();
                setSelectedPersona(p.id);
              }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5",
                selectedPersona === p.id
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <span>{p.avatar}</span>
              <span className="hidden md:inline">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Briefing Letter Content */}
      {loading ? (
        <div className="py-6 text-center space-y-2">
          <RefreshCw className="h-5 w-5 text-primary animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">{activePersonaObj.name} đang phân tích thành tích của bạn...</p>
        </div>
      ) : briefing ? (
        <div className="space-y-3.5 relative z-10">
          {/* Yesterday Progress Summary */}
          <div className="text-xs text-muted-foreground leading-relaxed">
            {briefing.yesterday_summary}
          </div>

          {/* Today Mission Box */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-glass-sm backdrop-blur-md">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Target className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-foreground">
                  Nhiệm vụ trọng tâm: {briefing.today_focus_title}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground pl-9 leading-snug">
                {briefing.today_focus_reason}
              </p>
            </div>

            <Link href={briefing.recommendation?.practice_url || "/learning"}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => soundFX.playKatana()}
                className="text-xs font-bold gap-1.5 rounded-full px-5 h-9 shrink-0 shadow-md shadow-primary/25"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Bắt Đầu Nhiệm Vụ</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {/* Streak Encouragement */}
          {briefing.streak_status && (
            <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span>🔥</span>
              <span>{briefing.streak_status}</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
