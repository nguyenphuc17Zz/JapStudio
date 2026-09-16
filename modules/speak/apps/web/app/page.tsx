"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Mic,
  PenTool,
  Headphones,
  BookOpen,
  Sparkles,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Zap,
  Flame,
  Layers,
  Bot,
  Radio,
  Globe,
} from "lucide-react";
import { ModeSwitchModal, TargetModeInfo } from "@/components/common/ModeSwitchModal";

export default function HomePage() {
  const [switchTarget, setSwitchTarget] = useState<TargetModeInfo | null>(null);
  return (
    <div className="min-h-[calc(100vh-56px)] bg-gradient-to-b from-background via-background/95 to-card/40 flex flex-col justify-between p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-[-100px] left-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl w-full mx-auto space-y-8 relative z-10">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto pt-2 sm:pt-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide shadow-xs backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            <span>JAPSTUDIO — JAPANESE MULTI-MODE AI OS</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground font-display">
            Chọn Chế Độ <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-akane-400 to-amber-400">Luyện Tập Tiếng Nhật</span>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Hệ sinh thái AI chuyên sâu hỗ trợ toàn diện các kỹ năng. Chọn chế độ học bên dưới để bắt đầu buổi luyện tập của bạn hôm nay.
          </p>
        </div>

        {/* Modes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 pt-4">
          {/* Mode 1: JapSpeak */}
          <div className="group relative rounded-2xl bg-card/80 hover:bg-card border border-border/80 hover:border-primary/50 p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 shadow-lg hover:shadow-primary/10 hover:-translate-y-1 backdrop-blur-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-akane-500 to-primary flex items-center justify-center text-white shadow-md shadow-primary/25">
                    <Mic className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                      JapSpeak
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">
                        Sẵn sàng
                      </span>
                    </h2>
                    <p className="text-xs text-muted-foreground">Chế độ Luyện Nói Phản Xạ AI (Web :3000 | API :8000)</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Hội thoại tiếng Nhật thời gian thực với VAD siêu nhạy, Faster-Whisper STT nhận diện giọng nói chuẩn xác, Edge-TTS biểu cảm và hệ thống chấm điểm phát âm đa tầng.
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted border border-border/60 text-muted-foreground font-medium">
                  🎙️ Voice Chat VAD
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted border border-border/60 text-muted-foreground font-medium">
                  ⚡ Faster-Whisper
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted border border-border/60 text-muted-foreground font-medium">
                  🔊 Edge-TTS
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted border border-border/60 text-muted-foreground font-medium">
                  🧠 AI Error Diagnosis
                </span>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-border/60 space-y-3">
              <Link
                href="/dashboard"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-akane-500 hover:from-primary/90 hover:to-akane-600 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all group-hover:scale-[1.01]"
              >
                <span>Vào Phòng Luyện Nói (Dashboard)</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <Link href="/speaking" className="hover:text-primary transition-colors">Hội thoại</Link>
                <span>•</span>
                <Link href="/reflex" className="hover:text-primary transition-colors">Phản xạ nhanh</Link>
                <span>•</span>
                <Link href="/shadowing" className="hover:text-primary transition-colors">Shadowing</Link>
                <span>•</span>
                <Link href="/keigo" className="hover:text-primary transition-colors">Kính ngữ</Link>
              </div>
            </div>
          </div>

          {/* Mode 2: JapWrite */}
          <div className="group relative rounded-2xl bg-card/80 hover:bg-card border border-border/80 hover:border-blue-500/50 p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 backdrop-blur-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
                    <PenTool className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground group-hover:text-blue-500 transition-colors flex items-center gap-2">
                      JapWrite
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium">
                        Sẵn sàng
                      </span>
                    </h2>
                    <p className="text-xs text-muted-foreground">Chế độ Luyện Viết & Sửa Lỗi AI (Web :5173 | API :8001)</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                23 cấp độ luyện viết chuyên sâu: Dịch thuật ngữ cảnh, viết tự do, ngân hàng từ vựng cá nhân, phân tích lỗi ngữ pháp 5 chiều và đấu Boss Writing Arena.
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted border border-border/60 text-muted-foreground font-medium">
                  ✍️ 23 Mastery Phases
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted border border-border/60 text-muted-foreground font-medium">
                  🌐 Dịch Việt - Nhật
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted border border-border/60 text-muted-foreground font-medium">
                  📚 Vocabulary Bank
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted border border-border/60 text-muted-foreground font-medium">
                  ⚔️ Boss Arena
                </span>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-border/60 space-y-3">
              <button
                type="button"
                onClick={() =>
                  setSwitchTarget({
                    id: "write",
                    name: "JapWrite",
                    tag: "Luyện Viết & 23 levels",
                    port: 5173,
                    url: "http://localhost:5173",
                  })
                }
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all group-hover:scale-[1.01] cursor-pointer"
              >
                <span>Chuyển sang Studio Luyện Viết (Port 5173)</span>
                <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>

              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="text-muted-foreground/80">Luyện viết theo chủ đề</span>
                <span>•</span>
                <span className="text-muted-foreground/80">Thử thách ngày</span>
                <span>•</span>
                <span className="text-muted-foreground/80">Chữa lỗi ngữ pháp</span>
              </div>
            </div>
          </div>

          {/* Mode 3: JapImmersion */}
          <div className="group relative rounded-2xl bg-card/80 hover:bg-card border border-border/80 hover:border-rose-500/50 p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 shadow-lg hover:shadow-rose-500/10 hover:-translate-y-1 backdrop-blur-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center text-white shadow-md shadow-rose-500/25">
                    <Globe className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground group-hover:text-rose-500 transition-colors flex items-center gap-2">
                      JapImmersion
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">
                        Sẵn sàng (Phase 1-8)
                      </span>
                    </h2>
                    <p className="text-xs text-muted-foreground">Chế độ Đắm Chìm & Smart Reader Đa Nguồn (Web :3002 | API :8002)</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Đọc tiếng Nhật thực tế từ báo chí, mạng xã hội, diễn đàn; Smart Reader bóc tách từ vựng & Furigana; AI Quiz đọc hiểu, Spaced Review FSRS và khám phá Xu Hướng Nhật Bản & Rabbit Hole.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted border border-border/60 text-muted-foreground font-medium">
                  📰 Live Feed & Smart Reader
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted border border-border/60 text-muted-foreground font-medium">
                  🔥 Xu Hướng & Rabbit Hole
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted border border-border/60 text-muted-foreground font-medium">
                  🧠 FSRS Spaced Review
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted border border-border/60 text-muted-foreground font-medium">
                  💬 Tiếng Nhật Mạng & Slang
                </span>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-border/60 space-y-3">
              <button
                type="button"
                onClick={() =>
                  setSwitchTarget({
                    id: "immersion",
                    name: "JapImmersion",
                    tag: "Đắm Chìm & Luyện Đọc Thực Tế",
                    port: 3002,
                    url: "http://localhost:3002/immersion",
                  })
                }
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-semibold text-sm shadow-md shadow-rose-500/20 transition-all group-hover:scale-[1.01] cursor-pointer"
              >
                <span>Chuyển sang Studio Đắm Chìm (Port 3002)</span>
                <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>

              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="text-muted-foreground/80">Live Feed</span>
                <span>•</span>
                <span className="text-muted-foreground/80">Xu hướng Hot</span>
                <span>•</span>
                <span className="text-muted-foreground/80">Ôn tập SRS</span>
                <span>•</span>
                <span className="text-muted-foreground/80">Quản lý nguồn</span>
              </div>
            </div>
          </div>

          {/* Mode 4: JapRead (Future Extension) */}
          <div className="relative rounded-2xl bg-card/40 border border-border/50 p-6 sm:p-7 flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      JapRead
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                        Sắp ra mắt
                      </span>
                    </h2>
                    <p className="text-xs text-muted-foreground">Luyện Đọc & Bóc Tách Hán Tự Chuyên Sâu</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Đọc báo chí thực tế (NHK Easy, Asahi), tiểu thuyết ngắn với công cụ tự động phân tích ngữ pháp câu dài, tra cứu Furigana và Hán tự theo ngữ cảnh.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted/50 border border-border/40 text-muted-foreground font-medium">
                  📖 Báo chí song ngữ
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted/50 border border-border/40 text-muted-foreground font-medium">
                  🀄 Kanji Breakdown
                </span>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-border/40">
              <button
                disabled
                className="w-full py-2.5 px-4 rounded-xl bg-muted/60 border border-border/60 text-muted-foreground font-medium text-sm cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Chế độ đang hoàn thiện...</span>
              </button>
            </div>
          </div>
        </div>

        {/* System Bar Tips */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary animate-pulse" />
            <span>Mẹo: Bạn có thể đổi qua lại giữa Luyện Nói và Luyện Viết bất cứ lúc nào qua nút <strong>Chế độ</strong> ở thanh trên cùng (TopBar).</span>
          </div>
          <div className="font-mono text-[11px] text-muted-foreground/70 shrink-0">
            JapStudio v1.0 • Monorepo Architecture
          </div>
        </div>
      </div>

      {/* Switch Mode Transition Modal */}
      <ModeSwitchModal
        isOpen={Boolean(switchTarget)}
        target={switchTarget}
        onClose={() => setSwitchTarget(null)}
      />
    </div>
  );
}
