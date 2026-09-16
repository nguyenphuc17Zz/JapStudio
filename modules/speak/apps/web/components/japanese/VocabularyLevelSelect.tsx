"use client";

import React from "react";
import { ChevronDown, Sparkles, Layers } from "lucide-react";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";

export interface VocabularyTierOption {
  tier: number;
  label: string;
  compactLabel: string;
  badge: string;
  desc: string;
}

export const VOCABULARY_TIERS: VocabularyTierOption[] = [
  {
    tier: 0,
    label: "🌐 Tất cả mức độ (BCCWJ 4.200 từ)",
    compactLabel: "🌐 Tất cả (4.2k)",
    badge: "Toàn bộ",
    desc: "Toàn bộ 4.200 từ vựng tần suất cao thực tế",
  },
  {
    tier: 1,
    label: "🔥 Tier 1: Top 1.000 từ thiết yếu (~N5 - N4)",
    compactLabel: "🔥 Tier 1 (~N5-N4)",
    badge: "Top 1k",
    desc: "Cốt lõi giao tiếp cơ bản (~JLPT N5/N4)",
  },
  {
    tier: 2,
    label: "⭐ Tier 2: Top 3.000 từ đời sống (~N3)",
    compactLabel: "⭐ Tier 2 (~N3)",
    badge: "Top 3k",
    desc: "Giao tiếp hàng ngày & công sở thông dụng (~JLPT N3)",
  },
  {
    tier: 3,
    label: "💎 Tier 3: Top 5.000 từ chuyên sâu (~N2 - N1)",
    compactLabel: "💎 Tier 3 (~N2-N1)",
    badge: "Top 5k",
    desc: "Từ vựng mở rộng, học thuật & thương mại (~JLPT N2/N1)",
  },
];

export interface VocabularyCategoryOption {
  id: string;
  label: string;
  compactLabel: string;
  icon: string;
}

export const VOCABULARY_CATEGORIES: VocabularyCategoryOption[] = [
  { id: "all", label: "📚 Tất cả chủ đề", compactLabel: "📚 Mọi chủ đề", icon: "📚" },
  { id: "business", label: "💼 Công sở / Thương mại", compactLabel: "💼 Công sở", icon: "💼" },
  { id: "daily", label: "🍵 Đời sống / Hàng ngày", compactLabel: "🍵 Đời sống", icon: "🍵" },
  { id: "service", label: "🛎️ Dịch vụ / Khách hàng", compactLabel: "🛎️ Dịch vụ", icon: "🛎️" },
  { id: "family", label: "🏠 Gia đình / Bạn bè", compactLabel: "🏠 Gia đình", icon: "🏠" },
  { id: "academic", label: "🎓 Học thuật / Xã hội", compactLabel: "🎓 Học thuật", icon: "🎓" },
];

export interface VocabularyLevelSelectProps {
  tier: number;
  setTier: (tier: number) => void;
  category?: string;
  setCategory?: (category: string) => void;
  variant?: "default" | "compact" | "hud";
  showCategory?: boolean;
  className?: string;
}

export function VocabularyLevelSelect({
  tier,
  setTier,
  category = "all",
  setCategory,
  variant = "default",
  showCategory = true,
  className,
}: VocabularyLevelSelectProps) {
  const handleTierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10);
    soundFX.playFurin();
    setTier(isNaN(val) ? 0 : val);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    soundFX.playFurin();
    if (setCategory) {
      setCategory(e.target.value);
    }
  };

  // 1. HUD Variant: Ultra-compact to sit directly in CombatCapsuleHUD bar
  if (variant === "hud") {
    return (
      <div className={cn("flex items-center gap-1.5", className)} suppressHydrationWarning>
        {/* Tier Select */}
        <div className="relative flex items-center">
          <select
            value={tier}
            onChange={handleTierChange}
            aria-label="Chọn mức độ từ điển"
            suppressHydrationWarning
            className="h-7 pl-2 pr-6 rounded-lg bg-card/90 dark:bg-zinc-800/90 border border-primary/30 text-[11px] font-bold text-foreground hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs appearance-none cursor-pointer transition-colors"
          >
            {VOCABULARY_TIERS.map((t) => (
              <option key={t.tier} value={t.tier} suppressHydrationWarning className="bg-popover text-foreground text-xs py-1">
                {t.compactLabel}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
        </div>

        {/* Category Select (Optional in HUD) */}
        {showCategory && setCategory && (
          <div className="relative hidden sm:flex items-center">
            <select
              value={category}
              onChange={handleCategoryChange}
              aria-label="Chọn chủ đề từ điển"
              suppressHydrationWarning
              className="h-7 pl-2 pr-6 rounded-lg bg-card/90 dark:bg-zinc-800/90 border border-border/80 text-[11px] font-medium text-foreground hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs appearance-none cursor-pointer transition-colors"
            >
              {VOCABULARY_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id} suppressHydrationWarning className="bg-popover text-foreground text-xs py-1">
                  {c.compactLabel}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>
        )}
      </div>
    );
  }

  // 2. Compact Variant: Medium size for cards or toolbars
  if (variant === "compact") {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2", className)} suppressHydrationWarning>
        <div className="relative">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Mức Độ (BCCWJ / JLPT)
          </label>
          <div className="relative flex items-center">
            <select
              value={tier}
              onChange={handleTierChange}
              suppressHydrationWarning
              className="w-full h-8 pl-2.5 pr-7 rounded-xl bg-card border border-primary/30 text-xs font-bold text-foreground hover:border-primary focus:outline-none focus:ring-1.5 focus:ring-primary/40 shadow-2xs appearance-none cursor-pointer"
            >
              {VOCABULARY_TIERS.map((t) => (
                <option key={t.tier} value={t.tier} suppressHydrationWarning className="bg-popover text-foreground py-1">
                  {t.compactLabel}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary pointer-events-none" />
          </div>
        </div>

        {showCategory && setCategory && (
          <div className="relative">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Chủ Đề
            </label>
            <div className="relative flex items-center">
              <select
                value={category}
                onChange={handleCategoryChange}
                suppressHydrationWarning
                className="w-full h-8 pl-2.5 pr-7 rounded-xl bg-card border border-border/80 text-xs font-semibold text-foreground hover:border-primary/50 focus:outline-none focus:ring-1.5 focus:ring-primary/40 shadow-2xs appearance-none cursor-pointer"
              >
                {VOCABULARY_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id} suppressHydrationWarning className="bg-popover text-foreground py-1">
                    {c.compactLabel}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Default Variant: Full, prominent cockpit card for Lobby (Keigo, Reflex)
  const currentTierObj = VOCABULARY_TIERS.find((t) => t.tier === tier) || VOCABULARY_TIERS[0];

  return (
    <div
      className={cn(
        "p-3 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/25 space-y-2.5 transition-all shadow-xs",
        className
      )}
      suppressHydrationWarning
    >
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-5 w-5 rounded-md bg-primary/15 text-primary flex items-center justify-center">
            <Sparkles className="h-3 w-3" />
          </span>
          <span className="text-xs font-extrabold text-foreground tracking-tight">
            Kho Từ Điển & Tần Suất (BCCWJ)
          </span>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-mono"
          suppressHydrationWarning
        >
          {currentTierObj.badge}
        </span>
      </div>

      {/* 2 Dropdown Selects Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Dropdown 1: Mức độ (Tier) */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Layers className="h-3 w-3 text-primary" />
            <span>Mức Độ / Cấp Độ:</span>
          </label>
          <div className="relative">
            <select
              value={tier}
              onChange={handleTierChange}
              suppressHydrationWarning
              className="w-full h-9 pl-3 pr-8 rounded-xl bg-card dark:bg-[#161c28] border border-primary/35 hover:border-primary text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-xs appearance-none cursor-pointer transition-all"
            >
              {VOCABULARY_TIERS.map((t) => (
                <option key={t.tier} value={t.tier} suppressHydrationWarning className="bg-popover text-foreground py-1.5">
                  {t.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none" />
          </div>
        </div>

        {/* Dropdown 2: Chủ đề (Category) */}
        {showCategory && setCategory && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <span>Chủ Đề Áp Dụng:</span>
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={handleCategoryChange}
                suppressHydrationWarning
                className="w-full h-9 pl-3 pr-8 rounded-xl bg-card dark:bg-[#161c28] border border-border/80 hover:border-primary/50 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-xs appearance-none cursor-pointer transition-all"
              >
                {VOCABULARY_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id} suppressHydrationWarning className="bg-popover text-foreground py-1.5">
                    {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Micro Description */}
      <p
        className="text-[10px] text-muted-foreground/90 italic line-clamp-1 pt-0.5 border-t border-primary/10"
        suppressHydrationWarning
      >
        💡 {currentTierObj.desc}
      </p>
    </div>
  );
}
