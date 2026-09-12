"use client";

import React, { useState } from "react";
import {
  PenTool,
  Headphones,
  BookOpen,
  ExternalLink,
  Layers,
  Sparkles,
  ArrowUpRight,
  Clock,
  Globe,
} from "lucide-react";
import { ModeSwitchModal, TargetModeInfo } from "../common/ModeSwitchModal";

interface StudioModeItem {
  id: string;
  name: string;
  jaName: string;
  port: number;
  tag: string;
  description: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "active" | "coming_soon";
  theme: "purple" | "sky" | "amber" | "rose";
}

const STUDIO_MODES_CATALOG: StudioModeItem[] = [
  {
    id: "write",
    name: "JapWrite",
    jaName: "日本語ライティング",
    port: 5173,
    tag: "Luyện Viết & Ngữ Pháp",
    description:
      "Rèn cấu trúc câu, ngữ pháp thực hành, Kanji Studio và đối đầu Boss ngữ pháp 23 cấp độ.",
    url: "http://localhost:5173",
    icon: PenTool,
    status: "active",
    theme: "purple",
  },
  {
    id: "immersion",
    name: "JapImmersion",
    jaName: "多読・多聴インプット",
    port: 3002,
    tag: "Đắm Chìm & Luyện Đọc Thực Tế",
    description:
      "Kho ngữ liệu tiếng Nhật đa nguồn: Báo chí, MXH, Blog; Smart Reader dịch ngữ cảnh, Quiz đọc hiểu, Spaced Review và Xu Hướng.",
    url: "http://localhost:3002/immersion",
    icon: Globe,
    status: "active",
    theme: "rose",
  },
  {
    id: "listen",
    name: "JapListen",
    jaName: "リスニング演習",
    port: 5174,
    tag: "Luyện Nghe & Phản Xạ Âm",
    description:
      "Luyện nghe hiểu hội thoại thực tế, nhận diện phách âm Mora và ngữ điệu tự nhiên.",
    url: "http://localhost:5174",
    icon: Headphones,
    status: "coming_soon",
    theme: "sky",
  },
  {
    id: "read",
    name: "JapRead",
    jaName: "読解・語彙スタジオ",
    port: 5175,
    tag: "Luyện Đọc & Ngữ Liệu",
    description:
      "Phân tích văn bản tiếng Nhật thực tế, đọc tin tức báo chí và đọc hiểu chuyên sâu JLPT.",
    url: "http://localhost:5175",
    icon: BookOpen,
    status: "coming_soon",
    theme: "amber",
  },
];

export function CrossStudioBanner() {
  const [switchTarget, setSwitchTarget] = useState<TargetModeInfo | null>(null);

  const handleOpenMode = (mode: StudioModeItem) => {
    if (mode.id === "write" || mode.id === "immersion") {
      setSwitchTarget({
        id: mode.id as "write" | "immersion",
        name: mode.name,
        tag: mode.tag,
        port: mode.port,
        url: mode.url,
      });
    } else {
      window.open(mode.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section className="space-y-3 pt-2">
      {/* Mode Switch Modal */}
      <ModeSwitchModal
        isOpen={Boolean(switchTarget)}
        target={switchTarget}
        onClose={() => setSwitchTarget(null)}
      />

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-primary/10 text-primary">
            <Layers className="h-4 w-4" />
          </span>
          <h2 className="text-sm sm:text-base font-bold text-foreground">
            Hệ Sinh Thái JapStudio — Chế Độ Học Mở Rộng
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          Chuyển đổi linh hoạt giữa các phòng luyện chuyên sâu
        </span>
      </div>

      {/* Responsive Grid 1-3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {STUDIO_MODES_CATALOG.map((mode) => {
          const Icon = mode.icon;
          const isActive = mode.status === "active";

          if (isActive) {
            const isRose = mode.theme === "rose";
            return (
              <div
                key={mode.id}
                className={`relative flex flex-col justify-between rounded-[22px] border p-4 sm:p-5 shadow-glass-sm backdrop-blur-xl transition-all duration-300 hover:shadow-glass-hover hover:-translate-y-1 group ${
                  isRose
                    ? "border-rose-300/60 bg-card/65 dark:border-rose-500/30 dark:bg-card/65 hover:border-rose-400"
                    : "border-purple-300/60 bg-card/65 dark:border-purple-500/30 dark:bg-card/65 hover:border-purple-400"
                }`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div
                      className={`h-10 w-10 rounded-2xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                        isRose
                          ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/50"
                          : "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/50"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                          isRose
                            ? "bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700/40"
                            : "bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-700/40"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Web :{mode.port}
                      </span>
                    </div>
                  </div>

                  {/* Titles */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <h3
                        className={`text-base font-bold text-foreground transition-colors ${
                          isRose
                            ? "group-hover:text-rose-700 dark:group-hover:text-rose-400"
                            : "group-hover:text-purple-700 dark:group-hover:text-purple-400"
                        }`}
                      >
                        {mode.name}
                      </h3>
                      <span className="font-jp text-xs text-muted-foreground">
                        ({mode.jaName})
                      </span>
                    </div>
                    <p
                      className={`text-xs font-semibold ${
                        isRose ? "text-rose-700 dark:text-rose-400" : "text-purple-700 dark:text-purple-400"
                      }`}
                    >
                      {mode.tag}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed mt-2 line-clamp-3">
                    {mode.description}
                  </p>
                </div>

                {/* Action Link */}
                <div className="pt-4 mt-3 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => handleOpenMode(mode)}
                    className={`w-full inline-flex items-center justify-between px-4 py-2.5 rounded-full text-white font-semibold text-xs transition-all shadow-xs active:scale-[0.98] cursor-pointer ${
                      isRose ? "bg-rose-600 hover:bg-rose-700" : "bg-purple-600 hover:bg-purple-700"
                    }`}
                  >
                    <span>Chuyển sang {mode.name}</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          }

          {/* Coming Soon Card */}
          return (
            <div
              key={mode.id}
              className="flex flex-col justify-between rounded-xl border border-dashed border-border/80 bg-muted/20 dark:bg-card/40 p-4 sm:p-5 opacity-80 hover:opacity-100 transition-opacity"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-muted text-muted-foreground border border-border/60 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/60">
                    <Clock className="h-3 w-3" />
                    Sắp ra mắt
                  </span>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-foreground/80">
                      {mode.name}
                    </h3>
                    <span className="font-jp text-xs text-muted-foreground">
                      ({mode.jaName})
                    </span>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {mode.tag}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed mt-2 line-clamp-3">
                  {mode.description}
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-border/50">
                <div className="w-full inline-flex items-center justify-between px-3.5 py-2 rounded-lg bg-muted text-muted-foreground text-xs font-medium cursor-not-allowed border border-border/50">
                  <span>Module mở rộng (Port :{mode.port})</span>
                  <span className="text-[10px] font-mono opacity-75">Docs</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
