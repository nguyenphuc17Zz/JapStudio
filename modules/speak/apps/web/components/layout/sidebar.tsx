"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Mic,
  Tv,
  Settings,
  Sparkles,
  Zap,
  Crown,
  Music,
  Compass,
  Ear,
  Blocks,
  Languages,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  jaLabel: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MAIN_ITEMS: NavItem[] = [
  { label: "Trang chủ", jaLabel: "ホーム", href: "/dashboard", icon: LayoutDashboard },
  { label: "Luyện nói", jaLabel: "会話", href: "/speaking", icon: Mic },
  { label: "Phục hồi nói", jaLabel: "リハビリ", href: "/ramp", icon: Sparkles },
  { label: "Phản xạ", jaLabel: "瞬発", href: "/reflex", icon: Zap },
  { label: "Phản hồi", jaLabel: "相づち", href: "/aizuchi", icon: Ear },
  { label: "Xây câu", jaLabel: "文立て", href: "/builder", icon: Blocks },
  { label: "Việt-Nhật", jaLabel: "通訳", href: "/interpret", icon: Languages },
  { label: "Kính ngữ", jaLabel: "敬語", href: "/keigo", icon: Crown },
  { label: "Cao độ", jaLabel: "高低", href: "/pitch", icon: Music },
  { label: "Tình huống", jaLabel: "場面", href: "/situations", icon: Compass },
  { label: "Shadowing", jaLabel: "シャドーイング", href: "/shadowing", icon: Tv },
];



function isNavActive(itemHref: string, pathname: string): boolean {
  if (itemHref === "/speaking") {
    return pathname === "/speaking" || (pathname.startsWith("/speaking/") && !["/speaking/speech", "/speaking/reflex", "/speaking/pronunciation"].some((p) => pathname.startsWith(p)));
  }
  if (itemHref === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === itemHref || pathname.startsWith(itemHref + "/");
}

function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  if (collapsed) {
    return (
      <Link
        href={item.href}
        prefetch={true}
        title={item.label}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl text-sm transition-all duration-200",
          isActive
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        )}
      >
        <Icon className="h-4 w-4" />
      </Link>
    );
  }
  return (
    <Link
      href={item.href}
      prefetch={true}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group",
        isActive
          ? "bg-primary/15 text-primary font-semibold border border-primary/25 shadow-xs"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      <span className="truncate">{item.label}</span>
      <span className="ml-auto text-[11px] font-jp opacity-60 font-normal">{item.jaLabel}</span>
      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 shadow-xs shadow-primary" />}
    </Link>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  // Collapsed rail — compact
  if (collapsed) {
    return (
      <aside className="hidden md:flex w-[64px] shrink-0 flex-col items-center gap-2.5 border-r border-border/70 bg-card/75 backdrop-blur-xl px-2 py-3 overflow-y-auto z-20">
        {/* Brand */}
        <Link href="/dashboard" prefetch={true} className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-primary text-white flex items-center justify-center font-black text-sm tracking-tight shadow-md shadow-primary/25 shrink-0 transition-transform hover:scale-105">
          話
        </Link>
        <button onClick={onToggle} className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors" aria-label="Mở rộng menu">
          <PanelLeftOpen className="h-3.5 w-3.5" />
        </button>
        <div className="h-px w-6 bg-border/80 my-1" />
        <div className="flex flex-col gap-1">
          {MAIN_ITEMS.map((it) => (
            <NavLink key={it.href} item={it} collapsed isActive={isNavActive(it.href, pathname)} />
          ))}
        </div>


        <Link href="/settings" prefetch={true} className={cn("h-9 w-9 rounded-xl flex items-center justify-center mt-auto transition-colors", pathname.startsWith("/settings") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
          <Settings className="h-4 w-4" />
        </Link>
      </aside>
    );
  }

  // Expanded
  return (
    <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r border-border/70 bg-card/75 backdrop-blur-xl overflow-hidden z-20">
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        {/* Brand */}
        <div className="flex items-center justify-between px-1.5 pt-0.5">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-primary text-white flex items-center justify-center font-black text-sm tracking-tight shadow-md shadow-primary/25 transition-transform group-hover:scale-105">
              話
            </span>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-sm tracking-tight text-foreground">Hanasu AI</span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5">JapSpeak Studio</span>
            </div>
          </Link>
          <button
            onClick={onToggle}
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors shrink-0"
            aria-label="Thu gọn menu"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Main Navigation */}
        <div className="space-y-0.5">
          <div className="px-2 py-1">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">Học tập</p>
          </div>
          <nav className="flex flex-col gap-0.5">
            {MAIN_ITEMS.map((it) => (
              <NavLink key={it.href} item={it} collapsed={false} isActive={isNavActive(it.href, pathname)} />
            ))}
          </nav>
        </div>



        <div className="pt-1 mt-auto">
          <Link
            href="/settings"
            prefetch={true}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith("/settings") ? "bg-muted text-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Settings className="h-4 w-4" />
            <span>Cài đặt</span>
          </Link>
        </div>
      </div>

    </aside>
  );
}
