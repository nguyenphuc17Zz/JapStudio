"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Mic, PenTool, Headphones, BookOpen, Layers, ChevronDown, ExternalLink, Sparkles, Globe } from "lucide-react";
import { ModeSwitchModal, TargetModeInfo } from "../common/ModeSwitchModal";

export function ModeSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<TargetModeInfo | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/15 border border-primary/25 text-primary text-xs font-semibold transition-all shadow-xs"
        aria-label="Chuyển chế độ học"
        title="Chuyển chế độ học JapStudio"
      >
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <Mic className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Luyện Nói</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 rounded-xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-2 py-1.5 border-b border-border/60 mb-1">
            <div className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
              <Layers className="h-3 w-3 text-primary" />
              Chế Độ JapStudio AI
            </div>
          </div>

          <div className="space-y-1">
            {/* Hub */}
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-muted/80 text-xs font-medium text-foreground transition-colors group"
            >
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-muted text-foreground group-hover:text-primary transition-colors">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <span>Hub Tổng Quan</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Trang chủ</span>
            </Link>

            {/* Mode 1: Speak */}
            <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-primary/15 border border-primary/30 text-xs font-semibold text-primary">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-primary/20 text-primary">
                  <Mic className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div>JapSpeak</div>
                  <div className="text-[10px] font-normal text-primary/80">Luyện nói & phản xạ</div>
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono">Đang học</span>
            </div>

            {/* Mode 2: Write */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setSwitchTarget({
                  id: "write",
                  name: "JapWrite",
                  tag: "Luyện viết & 23 levels",
                  port: 5173,
                  url: "http://localhost:5173",
                });
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-blue-500/10 hover:border-blue-500/20 border border-transparent text-xs font-medium text-foreground hover:text-blue-500 transition-colors group cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20">
                  <PenTool className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div className="font-semibold flex items-center gap-1">
                    JapWrite
                    <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-blue-500" />
                  </div>
                  <div className="text-[10px] text-muted-foreground">Luyện viết & 23 levels</div>
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">5173</span>
            </button>

            {/* Mode 3: Immersion */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setSwitchTarget({
                  id: "immersion",
                  name: "JapImmersion",
                  tag: "Đắm chìm & Luyện đọc thực tế",
                  port: 3002,
                  url: "http://localhost:3002/immersion",
                });
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent text-xs font-medium text-foreground hover:text-rose-500 transition-colors group cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-rose-500/10 text-rose-500 group-hover:bg-rose-500/20">
                  <Globe className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div className="font-semibold flex items-center gap-1">
                    JapImmersion
                    <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-rose-500" />
                  </div>
                  <div className="text-[10px] text-muted-foreground">Đắm chìm & Smart Reader</div>
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">3002</span>
            </button>

            {/* Mode 3: Listen (Teaser) */}
            <div className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-muted-foreground/60 cursor-not-allowed">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-muted/50 text-muted-foreground/50">
                  <Headphones className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div>JapListen</div>
                  <div className="text-[10px]">Luyện nghe đa tốc độ</div>
                </div>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground/70">Sắp có</span>
            </div>

            {/* Mode 4: Read (Teaser) */}
            <div className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-muted-foreground/60 cursor-not-allowed">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-muted/50 text-muted-foreground/50">
                  <BookOpen className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div>JapRead</div>
                  <div className="text-[10px]">Bóc tách Kanji báo chí</div>
                </div>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground/70">Sắp có</span>
            </div>
          </div>
        </div>
      )}

      {/* Switch Mode Transition Modal */}
      <ModeSwitchModal
        isOpen={Boolean(switchTarget)}
        target={switchTarget}
        onClose={() => setSwitchTarget(null)}
      />
    </div>
  );
}
