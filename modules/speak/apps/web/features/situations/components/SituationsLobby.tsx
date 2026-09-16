"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Compass,
  Utensils,
  ShoppingBag,
  Train,
  HeartPulse,
  Briefcase,
  Hotel,
  Clock,
  Sparkles,
  Zap,
  Play,
  BookOpen,
  Keyboard,
  Shield,
  Sliders,
  Wand2,
  Send,
  Dice5,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import type { SituationsPressureLevel } from "../services/situations-api";

export interface SituationsLobbyProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  customTopic: string;
  onSelectCustomTopic: (topic: string) => void;
  selectedMode: string;
  onSelectMode: (mode: string) => void;
  pressureLevel: SituationsPressureLevel;
  onSelectPressureLevel: (p: SituationsPressureLevel) => void;
  duration: number;
  onSelectDuration: (d: number) => void;
  onStartSession: () => void;
  onOpenCheatsheet: () => void;
  onOpenKeybindings: () => void;
  isLoading: boolean;
}

export const SITUATIONAL_CATEGORIES = [
  {
    id: "food",
    jaTitle: "飲食・居酒屋",
    viTitle: "Ẩm Thực & Quán Nhậu",
    badge: "飲食",
    desc: "Đặt bàn, gọi món, đổi món dị ứng, tách hóa đơn betsu-betsu",
    icon: Utensils,
    iconColor: "text-amber-500",
    example: {
      location: "Quán nhậu Izakaya truyền thống Shinjuku",
      npc: "Phục vụ quán (店員) • Thân thiện, niềm nở",
      npcOpening: "いらっしゃいませ！何名様でしょうか？",
      userRole: "Khách hàng đi 2 người",
      goals: ["Báo số lượng người và xin bàn không hút thuốc", "Gọi bia tươi Nama-biiru và xiên gà Yakitori"],
    },
  },
  {
    id: "retail",
    jaTitle: "買い物・コンビニ",
    viTitle: "Mua Sắm & Konbini",
    badge: "店舗",
    desc: "Hâm nóng bento, từ chối túi nilon, thanh toán thẻ IC",
    icon: ShoppingBag,
    iconColor: "text-emerald-500",
    example: {
      location: "Cửa hàng tiện lợi 7-Eleven",
      npc: "Thu ngân (レジ係) • Nhanh nhẹn, chuẩn mực",
      npcOpening: "お弁当温めますか？袋はおつけしますか？",
      userRole: "Khách mua đồ ăn trưa",
      goals: ["Nhờ hâm nóng cơm bento", "Từ chối lấy túi nilon và thanh toán bằng thẻ Suica"],
    },
  },
  {
    id: "transportation",
    jaTitle: "交通・駅・空港",
    viTitle: "Giao Thông & Nhà Ga",
    badge: "交通",
    desc: "Vé Shinkansen ghế chỉ định, cửa chuyển tàu, nạp Suica",
    icon: Train,
    iconColor: "text-sky-500",
    example: {
      location: "Quầy vé ga Tokyo Station Midori no Madoguchi",
      npc: "Nhân viên quầy vé (窓口係) • Tận tình, cẩn thận",
      npcOpening: "いらっしゃいませ。どちらまでご乗車ですか？",
      userRole: "Hành khách mua vé tàu",
      goals: ["Mua vé Shinkansen đi Shin-Osaka ghế chỉ định", "Hỏi cửa chuyển tuyến và giờ khởi hành"],
    },
  },
  {
    id: "healthcare",
    jaTitle: "医療・薬局・緊急",
    viTitle: "Y Tế & Hiệu Thuốc",
    badge: "医療",
    desc: "Mô tả triệu chứng bệnh, mua thuốc kê đơn, báo rơi đồ",
    icon: HeartPulse,
    iconColor: "text-rose-500",
    example: {
      location: "Phòng khám Nội khoa (内科クリニック)",
      npc: "Bác sĩ khám bệnh (医師) • Điềm tĩnh, chu đáo",
      npcOpening: "こんにちは。今日はどうされましたか？",
      userRole: "Bệnh nhân bị cảm",
      goals: ["Mô tả triệu chứng đau họng và sốt từ đêm qua", "Hỏi cách uống thuốc và xin đơn thuốc"],
    },
  },
  {
    id: "workplace",
    jaTitle: "ビジネス・職場",
    viTitle: "Công Sở & Họp Hành",
    badge: "仕事",
    desc: "Tiếp đối tác, trao đổi danh thiếp, báo cáo Hou-Ren-So",
    icon: Briefcase,
    iconColor: "text-purple-500",
    example: {
      location: "Phòng họp công ty đối tác tại Marunouchi",
      npc: "Trưởng phòng đối tác (部長) • Lịch thiệp, trang trọng",
      npcOpening: "初めまして、本日はお時間をいただきありがとうございます。",
      userRole: "Đại diện công ty đối tác",
      goals: ["Chào hỏi và thực hiện nghi thức trao đổi danh thiếp Meishi", "Mở đầu buổi họp báo cáo tiến độ dự án"],
    },
  },
  {
    id: "travel",
    jaTitle: "ホテル・観光",
    viTitle: "Khách Sạn & Du Lịch",
    badge: "観光",
    desc: "Check-in khách sạn, gửi hành lý, gợi ý điểm tham quan",
    icon: Hotel,
    iconColor: "text-cyan-500",
    example: {
      location: "Quầy lễ tân Khách sạn Ryokan Onsen Hakone",
      npc: "Lễ tân khách sạn (フロント) • Nhã nhặn, hiếu khách",
      npcOpening: "いらっしゃいませ。ご宿泊のチェックインでございますか？",
      userRole: "Khách du lịch đã đặt phòng online",
      goals: ["Xác nhận tên người đặt phòng và số đêm lưu trú", "Hỏi giờ phục vụ bữa tối Kaiseki và tắm Onsen"],
    },
  },
  {
    id: "infinite",
    jaTitle: "無限・AI Random",
    viTitle: "Vô Tận Ngẫu Nhiên",
    badge: "無限",
    desc: "AI tự do sáng tạo 100,000+ tình huống độc lạ từ mọi ngóc ngách xã hội Nhật Bản",
    icon: Sparkles,
    iconColor: "text-amber-400",
    isSpecial: true,
    example: {
      location: "Công ty Bất động sản tại Shinjuku",
      npc: "Nhân viên môi giới (不動産屋) • Năng động, chuyên nghiệp",
      npcOpening: "いらっしゃいませ！お部屋探しでしょうか？ご希望の条件はございますか？",
      userRole: "Người tìm thuê căn hộ 1DK gần ga",
      goals: ["Nêu khoảng giá thuê và yêu cầu căn hộ gần ga dưới 10 phút đi bộ", "Hỏi về tiền cọc Shikikin và tiền lễ Reikin"],
    },
  },
];

export const QUICK_SUGGESTION_TAGS = [
  { label: "🏠 Thuê nhà & Cọc tiền", prompt: "Thuê căn hộ 1DK tại Tokyo qua công ty bất động sản, hỏi tiền cọc Shikikin và Reikin" },
  { label: "💼 Phỏng vấn Baito quán ăn", prompt: "Phỏng vấn xin việc làm thêm tại quán mì Ramen, hỏi lịch làm Shifuto và mức lương" },
  { label: "🏛️ Đăng ký cư trú Shiyakusho", prompt: "Đến ủy ban Shiyakusho làm thủ tục chuyển địa chỉ cư trú Juuminhyou và bảo hiểm quốc dân" },
  { label: "💇 Tiệm cắt tóc Omotesando", prompt: "Cắt tóc tại salon Nhật, yêu cầu cắt ngắn hai bên và tỉa ngọn tự nhiên" },
  { label: "📦 Chợ đồ cũ Mercari", prompt: "Thương lượng giảm giá món đồ trên Mercari và hẹn phương thức nhận hàng" },
  { label: "🗑️ Phân loại rác Sodai Gomi", prompt: "Hỏi hàng xóm người Nhật cách phân loại rác cồng kềnh Sodai Gomi và lịch vứt rác" },
];

export const CHALLENGE_MODES = [
  { id: "standard", label: "Chuẩn (Standard)", desc: "Hiện mục tiêu rõ ràng" },
  { id: "guided", label: "Gợi ý (Guided)", desc: "Kèm mẫu câu gợi ý" },
  { id: "challenge", label: "Thử thách (Challenge)", desc: "Ẩn mục tiêu kế tiếp" },
  { id: "blind", label: "Tự lực (Blind)", desc: "Ẩn toàn bộ mục tiêu" },
];

export const PRESSURE_OPTIONS: { id: SituationsPressureLevel; label: string; limit: string; desc: string }[] = [
  { id: "infinite", label: "∞ Vô hạn", limit: "∞", desc: "Không giới hạn thời gian" },
  { id: "relaxed", label: "6s Thư thái", limit: "6.0s", desc: "Dễ thở, suy nghĩ kỹ" },
  { id: "normal", label: "5s Chuẩn", limit: "5.0s", desc: "Tốc độ giao tiếp tự nhiên" },
  { id: "fast", label: "4s Nhanh", limit: "4.0s", desc: "Phản xạ nhanh nhạy" },
  { id: "reflex", label: "3s Cực hạn", limit: "3.0s", desc: "Áp lực thực chiến cao" },
];

export const DURATION_OPTIONS = [
  { mins: 0, label: "∞ Vô hạn" },
  { mins: 3, label: "3 phút" },
  { mins: 5, label: "5 phút" },
  { mins: 10, label: "10 phút" },
  { mins: 15, label: "15 phút" },
];

export function SituationsLobby({
  selectedCategory,
  onSelectCategory,
  customTopic,
  onSelectCustomTopic,
  selectedMode,
  onSelectMode,
  pressureLevel,
  onSelectPressureLevel,
  duration,
  onSelectDuration,
  onStartSession,
  onOpenCheatsheet,
  onOpenKeybindings,
  isLoading,
}: SituationsLobbyProps) {
  const [localInput, setLocalInput] = useState(customTopic);
  const [isCustomOpen, setIsCustomOpen] = useState(Boolean(customTopic));
  const [showSample, setShowSample] = useState(false);

  const handleApplyCustomTopic = () => {
    if (localInput.trim()) {
      soundFX.playSuikinkutsu();
      onSelectCustomTopic(localInput.trim());
      onSelectCategory("custom");
    }
  };

  const handle1ClickRandom = () => {
    soundFX.playKatana();
    onSelectCustomTopic("");
    setLocalInput("");
    onSelectCategory("infinite");
    onStartSession();
  };

  const handlePickRandomSuggestion = () => {
    soundFX.playFurin();
    const item = QUICK_SUGGESTION_TAGS[Math.floor(Math.random() * QUICK_SUGGESTION_TAGS.length)];
    setLocalInput(item.prompt);
    onSelectCustomTopic(item.prompt);
    onSelectCategory("custom");
  };

  const selectedCatObj = SITUATIONAL_CATEGORIES.find((c) => c.id === selectedCategory) || SITUATIONAL_CATEGORIES[0];
  const sample = selectedCatObj.example;

  return (
    <div className="w-full max-w-[1600px] mx-auto h-[calc(100vh-3.5rem)] flex flex-col justify-between p-2 sm:p-3 gap-2 sm:gap-2.5 overflow-hidden select-none animate-in fade-in duration-200">
      {/* ── Top Header Bar ── */}
      <div className="shrink-0 rounded-xl border border-border bg-card/95 washi-texture px-3 py-2 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-2xs">
              <Compass className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
                  Tình Huống Thực Chiến
                </h1>
                <Badge variant="matcha" size="sm" className="text-[10px] font-mono font-bold px-1.5 py-0">
                  場面会話
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                AI phản xạ nhập vai tương tác trực tiếp — rèn ứng biến thực tế trong mọi tình huống đời sống Nhật Bản.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            <Button
              variant="akane"
              size="sm"
              onClick={handle1ClickRandom}
              disabled={isLoading}
              className="gap-1 rounded-lg h-7 px-2.5 text-xs font-bold shadow-2xs cursor-pointer"
              title="Khởi tạo ngẫu nhiên 1 tình huống bất kỳ và vào luyện ngay"
            >
              <Dice5 className="h-3 w-3 animate-spin-slow" />
              <span>🎲 Ngẫu nhiên 1-Chạm</span>
            </Button>

            {onOpenCheatsheet && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 rounded-lg border-border h-7 px-2.5 text-xs font-semibold hover:bg-muted cursor-pointer"
                onClick={onOpenCheatsheet}
              >
                <BookOpen className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <span>Sổ tay (C)</span>
              </Button>
            )}

            {onOpenKeybindings && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 rounded-lg border-border h-7 px-2.5 text-xs font-semibold hover:bg-muted cursor-pointer"
                onClick={onOpenKeybindings}
              >
                <Keyboard className="h-3 w-3 text-muted-foreground" />
                <span>Phím tắt (?)</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 1: Context Segmented Bar (7 Bối Cảnh Thực Tế + Vô Tận AI) ── */}
      <div className="shrink-0 space-y-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            1. Chọn Bối Cảnh Nhập Vai
          </span>
          <button
            type="button"
            onClick={() => setIsCustomOpen((v) => !v)}
            className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Wand2 className="h-3 w-3" />
            <span>{isCustomOpen ? "Đóng nhập tự do ▲" : "✨ Nhập bối cảnh tự do / Gợi ý ▼"}</span>
          </button>
        </div>

        {/* Custom Topic Drawer (Collapsible) */}
        {isCustomOpen && (
          <div className="p-2.5 rounded-xl border border-primary/30 bg-card/90 washi-texture shadow-xs space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex flex-col sm:flex-row gap-1.5">
              <input
                value={localInput}
                onChange={(e) => setLocalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleApplyCustomTopic();
                  }
                }}
                placeholder="VD: Đi phỏng vấn xin việc baito, Thuê nhà trọ tại Shinjuku, Đổi hàng trên Mercari..."
                className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-primary placeholder:text-muted-foreground"
              />
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="akane"
                  size="sm"
                  onClick={handleApplyCustomTopic}
                  disabled={!localInput.trim()}
                  className="text-xs font-bold gap-1 rounded-lg h-7 px-2.5 cursor-pointer"
                >
                  <Send className="h-3 w-3" />
                  <span>Áp Dụng</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePickRandomSuggestion}
                  className="text-xs font-bold gap-1 rounded-lg h-7 px-2 border-border cursor-pointer hover:bg-muted"
                >
                  <Dice5 className="h-3 w-3 text-primary" />
                  <span>Đổi Gợi Ý</span>
                </Button>
              </div>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="flex flex-wrap gap-1">
              {QUICK_SUGGESTION_TAGS.map((tag, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    soundFX.playFurin();
                    setLocalInput(tag.prompt);
                    onSelectCustomTopic(tag.prompt);
                    onSelectCategory("custom");
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded-md border text-[10px] font-semibold transition-all cursor-pointer",
                    customTopic === tag.prompt
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/80"
                  )}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 p-1 rounded-xl bg-muted/40 border border-border">
          {SITUATIONAL_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id && (!customTopic || cat.id !== "custom");
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  soundFX.playFurin();
                  onSelectCustomTopic("");
                  setLocalInput("");
                  onSelectCategory(cat.id);
                }}
                className={cn(
                  "relative flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  isSelected
                    ? "bg-card text-foreground shadow-xs border border-border/80 ring-1 ring-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40",
                  cat.isSpecial && !isSelected && "text-amber-600 dark:text-amber-400 bg-amber-500/5"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", isSelected ? cat.iconColor : "opacity-70")} />
                <span className="truncate">{cat.jaTitle.split("・")[0]}</span>
                <span className="text-[10px] font-normal opacity-60 hidden xl:inline">({cat.badge})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Pressure Level Segmented Bar ── */}
      <div className="shrink-0 space-y-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            2. Áp Lực Thời Gian Phản Xạ
          </span>
          <span className="text-[11px] text-amber-500 font-mono font-bold">
            {PRESSURE_OPTIONS.find((p) => p.id === pressureLevel)?.desc || "5.0s"}
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 p-1 rounded-xl bg-muted/40 border border-border">
          {PRESSURE_OPTIONS.map((p) => {
            const active = pressureLevel === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  soundFX.playFurin();
                  onSelectPressureLevel(p.id);
                }}
                className={cn(
                  "py-1 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer",
                  active
                    ? "bg-card text-foreground shadow-xs border border-border/80 ring-1 ring-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                )}
              >
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Section 3: Summary & Collapsible Sample Card ── */}
      <div className="shrink-0 rounded-xl border border-border/80 bg-card/90 washi-texture px-3 py-2 transition-all shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant={selectedCatObj.isSpecial ? "kintsugi" : "matcha"} size="sm" className="font-bold text-[10px] shrink-0">
              {selectedCatObj.badge}
            </Badge>
            <p className="text-xs text-foreground/90 font-medium truncate">
              {customTopic ? `Bối cảnh tự do: ${customTopic}` : selectedCatObj.desc}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFX.playFurin();
              setShowSample((prev) => !prev);
            }}
            className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer shrink-0 self-end sm:self-auto"
          >
            <span>{showSample ? "Thu gọn mẫu" : "Xem tình huống mẫu đối chiếu"}</span>
            {showSample ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Collapsible Sample Scenario Box */}
        {showSample && (
          <div className="mt-2 pt-2 border-t border-border/60 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-muted/50 p-2 border border-border/50 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Địa Điểm & Nhân Vật:
                </span>
                <p className="font-bold text-foreground">
                  📍 {sample.location}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  👤 Đối thoại: <span className="font-medium text-foreground">{sample.npc}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  🎭 Vai trò của bạn: <span className="font-bold text-primary">{sample.userRole}</span>
                </p>
              </div>

              <div className="rounded-lg bg-emerald-500/5 p-2 border border-emerald-500/20 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Lời Thoại Mở Đầu NPC & Mục Tiêu Giao Tiếp:
                </span>
                <p className="font-bold text-foreground font-jp text-sm">
                  「{sample.npcOpening}」
                </p>
                <div className="space-y-0.5 pt-0.5">
                  {sample.goals.map((g, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{g}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 4: Inline Config Strip & CTA Button ── */}
      <div className="shrink-0 rounded-xl border border-border bg-card/95 washi-texture p-2.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Inline Config Selectors */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center sm:justify-start w-full sm:w-auto">
          {/* Challenge Mode Selector */}
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground">Chế độ:</span>
            <div className="flex items-center p-0.5 rounded-lg bg-muted/50 border border-border">
              {CHALLENGE_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    soundFX.playFurin();
                    onSelectMode(m.id);
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                    selectedMode === m.id
                      ? "bg-card text-foreground shadow-2xs border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title={m.desc}
                >
                  {m.label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-primary" /> Thời lượng:
            </span>
            <div className="flex items-center p-0.5 rounded-lg bg-muted/50 border border-border">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d.mins}
                  type="button"
                  onClick={() => {
                    soundFX.playFurin();
                    onSelectDuration(d.mins);
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                    duration === d.mins
                      ? "bg-card text-foreground shadow-2xs border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Launch Button */}
        <Button
          onClick={() => {
            soundFX.playTaiko();
            onStartSession();
          }}
          disabled={isLoading}
          className="w-full sm:w-auto h-10 px-5 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white shadow-md cursor-pointer transition-all duration-150 gap-2 shrink-0 ring-1 ring-emerald-500/30"
        >
          <Play className="h-4 w-4 fill-current" />
          <span>{isLoading ? "Đang chuẩn bị bối cảnh..." : `Bắt Đầu Nhập Vai (${selectedCatObj.viTitle.split(" ")[0]})`}</span>
          <kbd className="hidden md:inline text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/20 text-white font-bold">
            Space
          </kbd>
        </Button>
      </div>
    </div>
  );
}
