"use client";

import React from "react";
import Link from "next/link";
import {
  Zap,
  Ear,
  Blocks,
  Languages,
  Crown,
  Compass,
  Mic,
  Briefcase,
  ArrowRight,
  Layers,
} from "lucide-react";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";

interface StudioMode {
  id: string;
  title: string;
  jaTitle: string;
  kanji: string;
  tag: string;
  desc: string;
  icon: React.ReactNode;
  url: string;
  badgeStyle: string;
  accentBorder: string;
}

const STUDIO_MODES: StudioMode[] = [
  {
    id: "interview",
    title: "Phỏng Vấn AI",
    jaTitle: "面接道場",
    kanji: "面接",
    tag: "Coach PREP",
    desc: "Luyện phỏng vấn động doanh nghiệp Nhật: nói tới đâu sửa tới đó, chuẩn hóa PREP & Keigo.",
    icon: <Briefcase className="h-5 w-5 text-indigo-500" />,
    url: "/interview",
    badgeStyle: "border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10",
    accentBorder: "group-hover:border-indigo-500/40",
  },

  {
    id: "reflex",
    title: "Phản Xạ 3 Giây",
    jaTitle: "瞬発スピーキング",
    kanji: "瞬発",
    tag: "Tốc Độ 3s",
    desc: "Chuyển ý nghĩ sang tiếng Nhật dưới 3 giây. Rèn phản xạ không qua bước dịch nhẩm.",
    icon: <Zap className="h-5 w-5 text-amber-500" />,
    url: "/reflex",
    badgeStyle: "border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10",
    accentBorder: "group-hover:border-amber-500/40",
  },
  {
    id: "aizuchi",
    title: "Phản Hồi Aizuchi",
    jaTitle: "相づち・聞き返し",
    kanji: "相づち",
    tag: "Chêm Câu & Ngắt Lời",
    desc: "Chêm câu đúng nhịp (へー, 確かに) và kỹ năng ngắt lời đối phương lịch sự.",
    icon: <Ear className="h-5 w-5 text-indigo-500" />,
    url: "/aizuchi",
    badgeStyle: "border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10",
    accentBorder: "group-hover:border-indigo-500/40",
  },
  {
    id: "builder",
    title: "Xây Dựng Câu",
    jaTitle: "瞬発作文",
    kanji: "作文",
    tag: "Ghép Cụm & Mở Rộng",
    desc: "Lắp ghép cụm từ thành câu dài hoàn chỉnh, làm chủ các cấu trúc ngữ pháp nhanh.",
    icon: <Blocks className="h-5 w-5 text-blue-500" />,
    url: "/builder",
    badgeStyle: "border-blue-500/30 text-blue-700 dark:text-blue-300 bg-blue-500/10",
    accentBorder: "group-hover:border-blue-500/40",
  },
  {
    id: "interpret",
    title: "Việt - Nhật Song Song",
    jaTitle: "逐次通訳",
    kanji: "通訳",
    tag: "Dịch Đuổi 2 Chiều",
    desc: "Phản xạ thông dịch tức thì Việt → Nhật và Nhật → Việt dưới áp lực thời gian.",
    icon: <Languages className="h-5 w-5 text-emerald-500" />,
    url: "/interpret",
    badgeStyle: "border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10",
    accentBorder: "group-hover:border-emerald-500/40",
  },
  {
    id: "keigo",
    title: "Kính Ngữ Công Sở",
    jaTitle: "ビジネス敬語",
    kanji: "敬語",
    tag: "Chuẩn Doanh Nghiệp",
    desc: "Luyện Sonkeigo, Kenjougo, quy tắc Uchi/Soto và tác phong giao tiếp chuẩn mực.",
    icon: <Crown className="h-5 w-5 text-purple-500" />,
    url: "/keigo",
    badgeStyle: "border-purple-500/30 text-purple-700 dark:text-purple-300 bg-purple-500/10",
    accentBorder: "group-hover:border-purple-500/40",
  },
  {
    id: "situations",
    title: "Tình Huống Thực Chiến",
    jaTitle: "場面ロールプレイ",
    kanji: "場面",
    tag: "Hội Thoại AI",
    desc: "Hàng trăm bối cảnh đối thoại sinh động do AI tạo mới kèm phản hồi NPC tức thì.",
    icon: <Compass className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />,
    url: "/situations",
    badgeStyle: "border-cyan-500/30 text-cyan-700 dark:text-cyan-300 bg-cyan-500/10",
    accentBorder: "group-hover:border-cyan-500/40",
  },
  {
    id: "speaking",
    title: "Đàm Thoại Tự Do",
    jaTitle: "自由会話",
    kanji: "会話",
    tag: "AI Partner",
    desc: "Luyện nói mở tự do với các nhân vật AI bản xứ về mọi chủ đề đời sống hàng ngày.",
    icon: <Mic className="h-5 w-5 text-primary" />,
    url: "/speaking",
    badgeStyle: "border-primary/30 text-primary bg-primary/10",
    accentBorder: "group-hover:border-primary/40",
  },
];

export function StudioModesHub() {
  return (
    <div className="space-y-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Layers className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span>Phòng Luyện Thực Chiến</span>
            <span className="text-xs font-normal text-muted-foreground font-jp">実践スタジオ</span>
          </h2>
        </div>

        <span className="text-xs text-muted-foreground font-medium">8 chuyên đề phản xạ</span>
      </div>

      {/* Spacious 3-Column Grid — Kyoto Clean Glass */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {STUDIO_MODES.map((mode) => (
          <Link
            key={mode.id}
            href={mode.url}
            prefetch={true}
            onClick={() => soundFX.playKatana()}
            className={cn(
              "group p-3.5 sm:p-4 rounded-2xl border border-border/70 bg-card/75 backdrop-blur-xl hover:bg-card/95 hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between relative overflow-hidden shadow-glass-sm h-full",
              mode.accentBorder
            )}
          >
            <div className="space-y-2.5">
              {/* Card Header: Icon + Category Badge + Kanji */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-muted/60 border border-border/70 flex items-center justify-center text-foreground group-hover:scale-105 transition-transform duration-200 shadow-2xs shrink-0">
                    {mode.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {mode.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-jp">
                      {mode.jaTitle}
                    </p>
                  </div>
                </div>

                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 whitespace-nowrap",
                    mode.badgeStyle
                  )}
                >
                  {mode.tag}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {mode.desc}
              </p>
            </div>

            {/* Card Footer: Action Link */}
            <div className="pt-2.5 mt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] font-semibold text-muted-foreground group-hover:text-primary transition-colors">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
                Studio /{mode.id}
              </span>
              <span className="inline-flex items-center gap-1">
                <span>Vào luyện</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
