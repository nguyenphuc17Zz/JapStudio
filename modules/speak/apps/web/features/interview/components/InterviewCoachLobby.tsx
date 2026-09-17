"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Code2,
  TrendingUp,
  Languages,
  Building2,
  Utensils,
  ShoppingBag,
  Sparkles,
  UserCheck,
  ShieldCheck,
  Brain,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { InterviewerPersonality } from "../types/interview";

interface IndustryPreset {
  id: string;
  label_vi: string;
  label_ja: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultRole: string;
}

const PRESET_INDUSTRIES: IndustryPreset[] = [
  {
    id: "it",
    label_vi: "Kỹ Sư Phần Mềm & AI",
    label_ja: "IT・エンジニア",
    icon: Code2,
    defaultRole: "IT Engineer (Web/Fullstack)",
  },
  {
    id: "sales",
    label_vi: "Kinh Doanh & Khách Hàng",
    label_ja: "営業・セールス",
    icon: TrendingUp,
    defaultRole: "法人営業 (B2B Sales Specialist)",
  },
  {
    id: "translation",
    label_vi: "Thông Biên Dịch / BrSE",
    label_ja: "通訳・翻訳・BrSE",
    icon: Languages,
    defaultRole: "Bridge SE / Thông dịch viên",
  },
  {
    id: "admin",
    label_vi: "Hành Chính / Nhân Sự",
    label_ja: "総務・一般事務",
    icon: Building2,
    defaultRole: "一般事務 / Nhân sự văn phòng",
  },
  {
    id: "hospitality",
    label_vi: "Dịch Vụ / Khách Sạn",
    label_ja: "接客・ホテル",
    icon: Utensils,
    defaultRole: "Khách sạn / Lễ tân Omotenashi",
  },
  {
    id: "baito",
    label_vi: "Làm Thêm (Baitou)",
    label_ja: "アルバイト",
    icon: ShoppingBag,
    defaultRole: "Thu ngân Konbini / Phục vụ quán ăn",
  },
];

const INTERVIEWER_STYLES = [
  {
    id: "friendly" as InterviewerPersonality,
    name: "山田 健二 (Yamada)",
    title: "Nhân Sự — Thân thiện",
    desc: "Cởi mở, kiên nhẫn, thích ứng viên tự tin và có định hướng rõ ràng.",
    icon: UserCheck,
    color: "emerald",
  },
  {
    id: "strict" as InterviewerPersonality,
    name: "佐藤 浩 (Sato)",
    title: "Trưởng Bộ Phận — Nghiêm khắc",
    desc: "Điềm tĩnh, săm soi số liệu thực tế và chuẩn mực Kính ngữ công sở.",
    icon: ShieldCheck,
    color: "amber",
  },
  {
    id: "analytical" as InterviewerPersonality,
    name: "高橋 摩耶 (Takahashi)",
    title: "Tech Lead — Hỏi xoáy sâu",
    desc: "Tập trung vào tư duy logic PREP, thích hỏi 'Tại sao bạn lại chọn giải pháp đó?'.",
    icon: Brain,
    color: "blue",
  },
];

interface InterviewCoachLobbyProps {
  onStartSession: (
    role: string,
    personality: InterviewerPersonality,
    context?: string
  ) => void;
  isLoading?: boolean;
}

export function InterviewCoachLobby({
  onStartSession,
  isLoading = false,
}: InterviewCoachLobbyProps) {
  const [selectedIndustry, setSelectedIndustry] = useState("it");
  const [customRole, setCustomRole] = useState(
    PRESET_INDUSTRIES[0].defaultRole
  );
  const [selectedStyle, setSelectedStyle] =
    useState<InterviewerPersonality>("friendly");
  const [companyContext, setCompanyContext] = useState("");

  const handleSelectPreset = (preset: IndustryPreset) => {
    setSelectedIndustry(preset.id);
    setCustomRole(preset.defaultRole);
  };

  const handleStart = () => {
    const finalRole = customRole.trim() || PRESET_INDUSTRIES[0].defaultRole;
    onStartSession(finalRole, selectedStyle, companyContext);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 py-4">
      {/* Header Banner */}
      <div className="rounded-2xl border border-border/70 bg-gradient-to-r from-primary/10 via-background to-background p-6 md:p-8 shadow-xs relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Dynamic Interview Coach • 面接道場</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Huấn Luyện Viên Phỏng Vấn Doanh Nghiệp Nhật
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
            Phỏng vấn linh hoạt theo thời gian thực:{" "}
            <span className="font-semibold text-foreground">
              Nói tới đâu sửa tới đó
            </span>
            . AI tự động soi lỗi Kính ngữ (Keigo), hướng dẫn lập luận theo khung{" "}
            <span className="font-semibold text-foreground">PREP</span> và viết
            lại câu trả lời mẫu chuẩn tác phong bản xứ.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Role & Industry Selection */}
        <div className="md:col-span-7 space-y-5 rounded-2xl border border-border/70 bg-card/60 p-6 shadow-xs backdrop-blur-xs">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                1. Chọn Vị Trí Hoặc Ngành Nghề Ứng Tuyển
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Chọn nhanh ngành nghề mẫu bên dưới hoặc tự do nhập bất kỳ vị trí
              nào.
            </p>
          </div>

          {/* Industry Preset Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {PRESET_INDUSTRIES.map((preset) => {
              const Icon = preset.icon;
              const isSelected = selectedIndustry === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={cn(
                    "flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all cursor-pointer text-xs",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40 font-medium"
                      : "border-border/60 bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <div>
                    <div className="font-bold text-foreground">
                      {preset.label_vi}
                    </div>
                    <div className="text-[10px] text-muted-foreground/80">
                      {preset.label_ja}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Role Input */}
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Vị trí phỏng vấn cụ thể (Có thể tùy chỉnh tự do):</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                Hỗ trợ đa dạng vô hạn
              </span>
            </label>
            <input
              type="text"
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
              placeholder="VD: Kỹ sư AI tại Rakuten, Nhân viên khách sạn Kyoto..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          {/* Company Context Optional */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <span>Tên công ty / Bối cảnh phỏng vấn (Tùy chọn):</span>
            </label>
            <input
              type="text"
              value={companyContext}
              onChange={(e) => setCompanyContext(e.target.value)}
              placeholder="VD: Startup công nghệ, Tập đoàn tài chính Tokyo, Siêu thị gần ga..."
              className="w-full px-3.5 py-2 rounded-xl border border-border/70 bg-background/60 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>
        </div>

        {/* Right Column: Interviewer Personality & Start */}
        <div className="md:col-span-5 space-y-5 rounded-2xl border border-border/70 bg-card/60 p-6 shadow-xs backdrop-blur-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  2. Chọn Tính Cách Phỏng Vấn Viên
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Mỗi phỏng vấn viên có phong cách và mức độ thử thách khác nhau.
              </p>
            </div>

            <div className="space-y-2.5">
              {INTERVIEWER_STYLES.map((style) => {
                const Icon = style.icon;
                const isSelected = selectedStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStyle(style.id)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
                        : "border-border/60 bg-muted/30 hover:bg-muted/60 text-muted-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "p-2 rounded-lg shrink-0 mt-0.5",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span>{style.name}</span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 font-normal"
                        >
                          {style.title}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        {style.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 space-y-3">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/40">
              <HelpCircle className="h-4 w-4 shrink-0 text-primary" />
              <span>
                Hệ thống tự động phát âm thanh câu hỏi giọng đọc tiếng Nhật theo
                cài đặt trong Settings.
              </span>
            </div>

            <Button
              type="button"
              onClick={handleStart}
              disabled={isLoading}
              className="w-full py-6 text-sm font-bold shadow-md gap-2 rounded-xl"
              size="lg"
            >
              <span>Vào Phòng Phỏng Vấn (開始)</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
