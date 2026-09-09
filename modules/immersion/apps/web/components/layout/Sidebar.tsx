"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Compass,
  Library,
  Repeat,
  BarChart3,
  Brain,
  Bookmark,
  History,
  BrainCircuit,
  Database,
  Sparkles,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { ModeSwitcher } from "./ModeSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "NỘI DUNG & HỌC TẬP",
    items: [
      { label: "Live Feed", href: "/immersion", icon: BookOpen },
      { label: "Khám phá", href: "/immersion/explore", icon: Compass },
      { label: "Thư viện", href: "/immersion/library", icon: Library },
      { label: "Ôn tập SRS", href: "/immersion/review", icon: Repeat },
      { label: "Tri thức", href: "/immersion/knowledge", icon: BarChart3 },
      { label: "Thử thách Quiz", href: "/immersion/quizzes", icon: Brain },
    ],
  },
  {
    title: "BỘ SƯU TẬP",
    items: [
      { label: "Đã lưu", href: "/immersion/saved", icon: Bookmark },
      { label: "Lịch sử đọc", href: "/immersion/history", icon: History },
    ],
  },
  {
    title: "QUẢN TRỊ NGUỒN",
    items: [
      { label: "AI Studio", href: "/enrichment", icon: BrainCircuit },
      { label: "Nguồn dữ liệu", href: "/sources", icon: Database },
      { label: "Ingestion Pipeline", href: "/ingestion", icon: Sparkles },
      { label: "Thêm nguồn mới", href: "/sources/new", icon: Plus },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const pathname = usePathname();

  const isLinkActive = (href: string) => {
    if (href === "/immersion") {
      return pathname === "/immersion";
    }
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sumi-950/95 border-r border-sumi-800/80 backdrop-blur-xl">
      {/* Brand Header */}
      <div className="p-4 border-b border-sumi-800/70 flex items-center justify-between">
        <Link href="/immersion" onClick={onCloseMobile} className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-torii-500 to-torii-600 flex items-center justify-center shadow-[0_0_15px_rgba(230,57,70,0.35)] group-hover:scale-105 transition-transform flex-shrink-0">
            <span className="text-white font-bold text-lg font-serif">浸</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white group-hover:text-torii-600 dark:group-hover:text-torii-300 transition-colors">
                JapImmersion
              </span>
              <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded-full bg-torii-100 text-torii-700 border border-torii-200 dark:bg-torii-950 dark:text-torii-400 dark:border-torii-800/60 font-semibold">
                Feed
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-sumi-400 font-medium">Authentic Japanese Immersion</p>
          </div>
        </Link>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-500 dark:text-sumi-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-sumi-900 transition-colors"
            title="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links (Scrollable) */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-2.5 mb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-sumi-400/80">
              {group.title}
            </div>

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isLinkActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                      active
                        ? "bg-torii-100 text-torii-800 font-bold border border-torii-300 shadow-sm dark:bg-torii-500/15 dark:text-white dark:border-torii-500/30 dark:shadow-[0_0_12px_rgba(230,57,70,0.15)]"
                        : "text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-sumi-300 dark:hover:text-white dark:hover:bg-sumi-900/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 transition-colors ${
                          active ? "text-torii-600 dark:text-torii-400" : "text-slate-500 group-hover:text-slate-950 dark:text-sumi-400 dark:group-hover:text-sumi-200"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${item.badgeColor || "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-sumi-800 dark:text-sumi-300 dark:border-transparent"}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Section */}
      <div className="p-3 border-t border-sumi-800/70 space-y-3 bg-sumi-950/40">
        {/* Security Status */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white dark:bg-sumi-900/80 border border-slate-200 dark:border-sumi-800 text-[11px] text-slate-600 dark:text-sumi-400 shadow-sm">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px]">SSRF Shield</span>
          </div>
          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded">
            ACTIVE
          </span>
        </div>

        {/* Theme Switcher */}
        <div className="w-full">
          <ThemeSwitcher />
        </div>

        {/* Mode Switcher */}
        <div className="w-full">
          <ModeSwitcher />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
