"use client";

import React, { useState } from "react";
import { ProviderSettingsSection } from "@/components/settings/provider-settings-section";
import { GeneralSettingsSection } from "@/components/settings/general-settings-section";
import { VoiceSettingsHub } from "@/components/settings/voice-settings-hub";
import { KeybindingsSettingsSection } from "@/components/settings/keybindings-settings-section";
import {
  Settings as SettingsIcon,
  Cpu,
  Sliders,
  Volume2,
  Keyboard,
  ShieldCheck,
} from "lucide-react";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";

type SettingsTab = "providers" | "voice" | "keybindings" | "general";

interface NavOption {
  id: SettingsTab;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  jaLabel: string;
}

const NAV_OPTIONS: NavOption[] = [
  {
    id: "providers",
    icon: Cpu,
    label: "Mô hình AI & API",
    jaLabel: "AIモデル",
  },
  {
    id: "voice",
    icon: Volume2,
    label: "Giọng nói & Micro",
    jaLabel: "音声・マイク",
  },
  {
    id: "keybindings",
    icon: Keyboard,
    label: "Phím tắt hệ thống",
    jaLabel: "ショートカット",
  },
  {
    id: "general",
    icon: Sliders,
    label: "Cài đặt chung",
    jaLabel: "一般設定",
  },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("providers");

  return (
    <div className="space-y-4 animate-in fade-in duration-200 max-w-5xl mx-auto pb-12">
      {/* 1. Zen Minimalist Header — Kyoto Clean Glass */}
      <div className="rounded-2xl border border-border/70 bg-card/75 backdrop-blur-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-glass-sm">
        <div className="flex items-center gap-3">
          <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-primary flex items-center justify-center text-white font-black text-sm shadow-sm shadow-primary/20 shrink-0">
            <SettingsIcon className="h-4 w-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
                Cài Đặt Hệ Thống
              </h1>
              <span className="font-jp text-xs sm:text-sm font-bold text-muted-foreground">
                設定
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Quản lý mô hình AI, bộ tổng hợp giọng đọc, microphone và phím tắt thao tác nhanh.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 border border-border/70 px-3 py-1.5 rounded-full self-start sm:self-center">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>Mã hóa AES-256 an toàn</span>
        </div>
      </div>

      {/* 2. Zen Horizontal Segmented Tabs Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-muted/50 border border-border/70 backdrop-blur-md">
        {NAV_OPTIONS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                soundFX.playFurin();
                setActiveTab(item.id);
              }}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer select-none",
                isActive
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/40"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
              <span className="truncate">{item.label}</span>
              <span className="hidden md:inline font-jp text-[10px] opacity-60 font-normal">
                {item.jaLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Full-Width Content Container */}
      <main className="w-full min-w-0">
        {activeTab === "providers" && <ProviderSettingsSection />}
        {activeTab === "voice" && <VoiceSettingsHub />}
        {activeTab === "keybindings" && <KeybindingsSettingsSection />}
        {activeTab === "general" && <GeneralSettingsSection />}
      </main>
    </div>
  );
}
