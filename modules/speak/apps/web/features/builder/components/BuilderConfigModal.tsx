"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  SlidersHorizontal,
  Shuffle,
  Puzzle,
  Maximize2,
  Wrench,
  Users,
  Briefcase,
  Layers,
  Key,
  Zap,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import type {
  BuilderSubMode,
  BuilderSkill,
  BuilderRelation,
  BuilderScaffold,
} from "../services/builder-api";

interface BuilderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSubMode: BuilderSubMode;
  currentFocusSkill: BuilderSkill;
  currentRelation: BuilderRelation;
  currentScaffold: BuilderScaffold;
  onApply: (newConfig: {
    subMode: BuilderSubMode;
    focusSkill: BuilderSkill;
    relation: BuilderRelation;
    scaffold: BuilderScaffold;
  }) => void;
  isLoading?: boolean;
}

const SUB_MODES: Array<{
  id: BuilderSubMode;
  label: string;
  ja: string;
  desc: string;
  icon: React.ElementType;
}> = [
  {
    id: "mixed",
    label: "Tổng Hợp",
    ja: "混合",
    desc: "AI luân phiên ngẫu nhiên giữa Nối từ, Mở rộng & Sửa câu",
    icon: Shuffle,
  },
  {
    id: "sentence_assemble",
    label: "Nối Từ Thành Câu",
    ja: "文立て",
    desc: "Ghép từ khóa rời rạc với trợ từ & liên từ chuẩn ngữ pháp",
    icon: Puzzle,
  },
  {
    id: "sentence_expand",
    label: "Mở Rộng Câu",
    ja: "文拡大",
    desc: "Bổ sung trạng từ, lý do, sắc thái cảm xúc vào câu cốt lõi",
    icon: Maximize2,
  },
  {
    id: "sentence_repair",
    label: "Sửa Lỗi Câu",
    ja: "文修理",
    desc: "Phát hiện và chỉnh sửa câu sai trợ từ, thể hoặc văn phong",
    icon: Wrench,
  },
];

const SKILLS: Array<{
  id: BuilderSkill;
  label: string;
  ja: string;
  desc: string;
}> = [
  {
    id: "te_chain",
    label: "Nối て-chain",
    ja: "て形接続",
    desc: "Nối chuỗi hành động & tính từ",
  },
  {
    id: "relative_clause",
    label: "Mệnh đề quan hệ",
    ja: "修飾節",
    desc: "Bổ nghĩa danh từ trong đàm thoại",
  },
  {
    id: "conditional",
    label: "Điều kiện たら・ば",
    ja: "条件形",
    desc: "Giả định, nếu thì & tình huống",
  },
  {
    id: "nominalization",
    label: "Danh từ hóa",
    ja: "名詞化",
    desc: "わけ・はず・こと・の phán đoán",
  },
  {
    id: "contraction",
    label: "Nói tắt bản xứ",
    ja: "縮約表現",
    desc: "〜てる, 〜ちゃう, 〜なきゃ khẩu ngữ",
  },
];

const RELATIONS: Array<{
  id: BuilderRelation;
  label: string;
  ja: string;
  desc: string;
  icon: React.ElementType;
}> = [
  {
    id: "casual_friend",
    label: "Bạn bè / Thân mật",
    ja: "タメ口",
    desc: "Thể thông thường, dùng với bạn bè & người thân",
    icon: Users,
  },
  {
    id: "business_polite",
    label: "Công sở / Lịch sự",
    ja: "丁寧語・敬語",
    desc: "Lịch sự trang trọng, dùng cho đồng nghiệp & khách hàng",
    icon: Briefcase,
  },
];

const SCAFFOLDS: Array<{
  id: BuilderScaffold;
  label: string;
  desc: string;
  icon: React.ElementType;
}> = [
  {
    id: "structured_options",
    label: "Khung mẫu (Template)",
    desc: "Điền vào chỗ trống ______",
    icon: Layers,
  },
  {
    id: "keyword_hint",
    label: "Từ khóa (Keywords)",
    desc: "Cho sẵn các từ khóa bắt buộc",
    icon: Key,
  },
  {
    id: "none",
    label: "Tự do (Free Speaking)",
    desc: "Thử thách phản xạ không gợi ý",
    icon: Zap,
  },
];

export function BuilderConfigModal({
  isOpen,
  onClose,
  currentSubMode,
  currentFocusSkill,
  currentRelation,
  currentScaffold,
  onApply,
  isLoading = false,
}: BuilderConfigModalProps) {
  const [subMode, setSubMode] = useState<BuilderSubMode>(currentSubMode);
  const [focusSkill, setFocusSkill] = useState<BuilderSkill>(currentFocusSkill);
  const [relation, setRelation] = useState<BuilderRelation>(currentRelation);
  const [scaffold, setScaffold] = useState<BuilderScaffold>(currentScaffold);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSubMode(currentSubMode);
      setFocusSkill(currentFocusSkill);
      setRelation(currentRelation);
      setScaffold(currentScaffold);
    }
  }, [isOpen, currentSubMode, currentFocusSkill, currentRelation, currentScaffold]);

  // Handle keyboard shortcuts (Esc to close, Enter to submit)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, subMode, focusSkill, relation, scaffold]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    soundFX.playTaiko();
    onApply({
      subMode,
      focusSkill,
      relation,
      scaffold,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-border/80 dark:border-white/10 bg-card/95 dark:bg-[#111622]/95 backdrop-blur-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <SlidersHorizontal className="size-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Tùy Chỉnh Chế Độ & Trọng Tâm Ngữ Pháp
              </h3>
              <p className="text-xs text-muted-foreground">
                Cấu hình chủ đề và dạng bài tập cho AI sinh câu phù hợp với bạn
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFX.playFurin();
              onClose();
            }}
            className="size-8 rounded-xl hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Body: Scrollable Sections */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Section 1: Sub-Mode */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Puzzle className="size-3.5 text-primary" />
                <span>1. Dạng Bài Tập Xây Câu (Sub-Mode)</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUB_MODES.map((mode) => {
                const Icon = mode.icon;
                const isSelected = subMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      soundFX.playFurin();
                      setSubMode(mode.id);
                    }}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5",
                      isSelected
                        ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40 text-foreground"
                        : "bg-muted/30 border-border/70 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                        <Icon className={cn("size-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                        <span>{mode.label}</span>
                      </span>
                      <span className="text-[10px] font-jp font-bold px-1.5 py-0.5 rounded bg-muted/60 border border-border/60">
                        {mode.ja}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {mode.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Focus Skill */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Zap className="size-3.5 text-primary" />
                <span>2. Trọng Tâm Kỹ Năng Ngữ Pháp (Focus Skill)</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SKILLS.map((s) => {
                const isSelected = focusSkill === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      soundFX.playFurin();
                      setFocusSkill(s.id);
                    }}
                    className={cn(
                      "p-2.5 rounded-2xl border text-left transition-all cursor-pointer space-y-1",
                      isSelected
                        ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40 text-foreground"
                        : "bg-muted/30 border-border/70 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground">
                        {s.label}
                      </span>
                      <span className="text-[10px] font-jp font-bold px-1 py-0.5 rounded bg-muted/50 border border-border/60 text-primary">
                        {s.ja}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {s.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Register / Relation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Users className="size-3.5 text-primary" />
                <span>3. Ngữ Cảnh Giao Tiếp & Văn Phong (Register)</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RELATIONS.map((r) => {
                const Icon = r.icon;
                const isSelected = relation === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      soundFX.playFurin();
                      setRelation(r.id);
                    }}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1",
                      isSelected
                        ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40 text-foreground"
                        : "bg-muted/30 border-border/70 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                        <Icon className={cn("size-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                        <span>{r.label}</span>
                      </span>
                      <span className="text-[10px] font-jp font-bold px-1.5 py-0.5 rounded bg-muted/60 border border-border/60 text-amber-600 dark:text-amber-400">
                        {r.ja}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {r.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Scaffold Support */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" />
                <span>4. Cấp Độ Giàn Giáo Hỗ Trợ (Scaffolding)</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SCAFFOLDS.map((sc) => {
                const Icon = sc.icon;
                const isSelected = scaffold === sc.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      soundFX.playFurin();
                      setScaffold(sc.id);
                    }}
                    className={cn(
                      "p-2.5 rounded-2xl border text-left transition-all cursor-pointer space-y-1",
                      isSelected
                        ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40 text-foreground"
                        : "bg-muted/30 border-border/70 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                      <Icon className={cn("size-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                      <span>{sc.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {sc.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border/60 bg-muted/20 shrink-0">
          <div className="text-[11px] text-muted-foreground hidden sm:block">
            Nhấn <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono font-bold text-[10px] border border-border">Enter</kbd> để áp dụng, <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono font-bold text-[10px] border border-border">Esc</kbd> để hủy
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                soundFX.playFurin();
                onClose();
              }}
              className="rounded-xl text-xs font-semibold cursor-pointer"
            >
              Hủy bỏ
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isLoading}
              onClick={handleSubmit}
              className="rounded-xl text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
            >
              <Sparkles className="size-3.5" />
              <span>Áp Dụng & Sinh Bài Mới</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
