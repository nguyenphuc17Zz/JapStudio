"use client";

import React, { useState } from "react";
import { useHealth } from "@/hooks/use-health";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlobalFuriganaControl } from "@/components/japanese/GlobalFuriganaControl";
import { GlobalAudioQuickSettings } from "./global-audio-quick-settings";
import { GlobalAIQuickSettings } from "./global-ai-quick-settings";
import { GlobalKeybindingsModal } from "./global-keybindings-modal";
import { ModeSwitcher } from "./ModeSwitcher";
import { Search, Command, Keyboard, Sparkles } from "lucide-react";
import { soundFX } from "@/lib/sound-fx";

export function TopNav({
  onOpenCommand,
}: {
  onOpenCommand?: () => void;
}) {
  // useHealth monitors background connectivity and triggers auto-alerts when an outage occurs
  const { isHealthy, loading } = useHealth();
  const [jpDate, setJpDate] = useState<string>("");
  const [isKeybindingsOpen, setIsKeybindingsOpen] = useState(false);

  React.useEffect(() => {
    const now = new Date();
    const jpDays = ["日", "月", "火", "水", "木", "金", "土"];
    setJpDate(`${now.getMonth() + 1}月${now.getDate()}日 (${jpDays[now.getDay()]})`);
  }, []);

  return (
    <>
      <header className="h-[56px] border-b border-border/60 bg-card/75 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between shrink-0 gap-3 relative z-40 shadow-xs">
        {/* Left — date + ModeSwitcher */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <span className="hidden sm:inline-flex items-center text-sm">
            <span className="font-medium text-foreground text-xs sm:text-sm font-jp" suppressHydrationWarning>
              {jpDate || "8月25日"}
            </span>
          </span>
          <span className="hidden sm:block h-4 w-px bg-border/80" />
          <ModeSwitcher />
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile search */}
          <button
            onClick={onOpenCommand}
            className="md:hidden h-9 w-9 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground"
            aria-label="Tìm kiếm"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* AI Provider & Model Quick Switcher */}
          <GlobalAIQuickSettings />

          {/* Keybindings Shortcut Button */}
          <button
            onClick={() => {
              soundFX.playFurin();
              setIsKeybindingsOpen(true);
            }}
            className="h-8 w-8 rounded-lg border border-border/80 bg-muted/40 hover:bg-card hover:border-primary/40 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all"
            title="Phím tắt hệ thống (?)"
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>

          <GlobalAudioQuickSettings />
          <GlobalFuriganaControl />
          <ThemeToggle />
        </div>
      </header>

      {/* Global Keybindings Settings Modal */}
      <GlobalKeybindingsModal
        isOpen={isKeybindingsOpen}
        onClose={() => setIsKeybindingsOpen(false)}
      />
    </>
  );
}
