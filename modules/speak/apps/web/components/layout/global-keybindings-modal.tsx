"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  RotateCcw,
  Keyboard,
  Check,
  Tv,
  MessageSquare,
  Zap,
  Crown,
  Music,
  Compass,
  Settings,
  Activity,
} from "lucide-react";
import {
  SystemKeybindings,
  KeybindingCategory,
  useSystemKeybindings,
  formatKeyDisplay,
} from "@/hooks/use-system-keybindings";
import { ALL_ACTION_DEFINITIONS } from "@/components/settings/keybindings-settings-section";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";

interface GlobalKeybindingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: KeybindingCategory;
}

function getCategoryFromPath(pathname: string | null): KeybindingCategory {
  if (!pathname) return "system";
  if (pathname.startsWith("/reflex")) return "reflex";
  if (pathname.startsWith("/keigo")) return "keigo";
  if (pathname.startsWith("/pitch")) return "pitch";
  if (pathname.startsWith("/situations")) return "situations";
  if (pathname.startsWith("/ramp")) return "ramp";
  if (pathname.startsWith("/speaking")) return "speaking";
  if (pathname.startsWith("/shadowing")) return "shadowing";
  return "system";
}

const MODAL_TABS: { id: KeybindingCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "reflex", label: "Phản Xạ", icon: Zap },
  { id: "keigo", label: "Kính Ngữ", icon: Crown },
  { id: "pitch", label: "Cao Độ", icon: Music },
  { id: "situations", label: "Tình Huống", icon: Compass },
  { id: "ramp", label: "Phục Hồi", icon: Activity },
  { id: "speaking", label: "Hội Thoại", icon: MessageSquare },
  { id: "shadowing", label: "Shadowing", icon: Tv },
  { id: "system", label: "Hệ Thống", icon: Settings },
];

export function GlobalKeybindingsModal({ isOpen, onClose, defaultTab }: GlobalKeybindingsModalProps) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<KeybindingCategory>(() => defaultTab || getCategoryFromPath(pathname));
  const { keybindings, updateKeybinding, resetToDefaults } = useSystemKeybindings();
  const [listeningAction, setListeningAction] = useState<keyof SystemKeybindings | null>(null);

  // Sync activeTab whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab || getCategoryFromPath(pathname));
    }
  }, [isOpen, defaultTab, pathname]);

  // Capture pressed key when listening
  useEffect(() => {
    if (!listeningAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setListeningAction(null);
        return;
      }

      let capturedKey = e.key.toLowerCase();
      if (capturedKey === " ") capturedKey = "space";

      soundFX.playFurin();
      updateKeybinding(listeningAction, capturedKey);
      setListeningAction(null);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [listeningAction, updateKeybinding]);

  const filteredActions = ALL_ACTION_DEFINITIONS.filter((a) => a.category === activeTab);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setListeningAction(null);
        onClose();
      }}
      title="Cài Đặt & Tra Cứu Phím Tắt"
      description="Tùy chỉnh các phím tắt nhanh được phân loại theo từng phòng học & tính năng"
      className="max-w-2xl"
    >
      <div className="space-y-4 pt-2">
        {/* Module Category Tabs */}
        <div className="flex items-center p-1 rounded-2xl bg-muted/70 border border-border overflow-x-auto scrollbar-thin gap-1">
          {MODAL_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundFX.playFurin();
                  setActiveTab(tab.id);
                }}
                className={cn(
                  "flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Listening alert */}
        {listeningAction && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between text-xs text-primary font-bold animate-pulse">
            <span>Đang lắng nghe phím mới... Bấm phím bất kỳ trên bàn phím.</span>
            <span className="text-[10px] text-muted-foreground font-normal">Esc để hủy</span>
          </div>
        )}

        {/* Action list */}
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {filteredActions.map((action) => {
            const currentKey = keybindings[action.key] || "";
            const isListening = listeningAction === action.key;

            return (
              <div
                key={action.key}
                className="p-3 rounded-xl border border-border/80 bg-card flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-foreground">{action.label}</div>
                  <div className="text-[11px] text-muted-foreground">{action.description}</div>
                </div>

                <button
                  type="button"
                  onClick={() => setListeningAction(action.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border font-mono text-xs font-bold transition-all shrink-0 min-w-[50px] text-center",
                    isListening
                      ? "bg-primary text-primary-foreground border-primary animate-bounce"
                      : "bg-muted hover:bg-muted/80 text-foreground border-border"
                  )}
                >
                  {isListening ? "..." : formatKeyDisplay(currentKey)}
                </button>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-border flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              soundFX.playTaiko();
              resetToDefaults(activeTab);
            }}
            className="text-xs text-muted-foreground gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Mặc định tab này</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              soundFX.playSuikinkutsu();
              onClose();
            }}
            className="text-xs font-bold gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Hoàn Tất</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
