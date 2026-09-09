"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sidebar } from "./Sidebar";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { Menu, Sparkles } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-sumi-950 text-sumi-100 flex flex-col">
      {/* Sidebar (Desktop fixed left, Mobile drawer) */}
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area (offset by 256px on desktop) */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0 transition-all">
        {/* Mobile Top Navigation Bar */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-sumi-950/90 backdrop-blur-xl border-b border-sumi-800/80">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-xl bg-sumi-900 border border-sumi-800 text-sumi-300 hover:text-white transition-colors"
              aria-label="Mở menu điều hướng"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/immersion" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-torii-500 to-torii-600 flex items-center justify-center shadow-[0_0_10px_rgba(230,57,70,0.3)]">
                <span className="text-white font-bold text-xs font-serif">浸</span>
              </div>
              <span className="font-bold text-sm text-white">JapImmersion</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <ThemeSwitcher compact />
            <Link
              href="/sources/new"
              className="p-2 rounded-xl bg-torii-500/20 text-torii-400 border border-torii-500/30 text-xs font-medium"
              title="Thêm nguồn mới"
            >
              <Sparkles className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
