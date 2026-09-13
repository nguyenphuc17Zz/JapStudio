"use client";

import React, { useState, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Check,
  CheckCircle2,
  Crown,
  Users,
  Sparkles,
  Zap,
  RotateCcw,
  Search,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { soundFX } from "@/lib/sound-fx";

export interface KeigoFormulaOption {
  id: string;
  nameVi: string;
  formulaJa: string;
  group: "sonkeigo" | "kenjougo" | "teineigo";
  groupNameVi: string;
  desc: string;
  exampleSource: string;
  exampleTarget: string;
  iconColor: string;
  badgeVariant: "sakura" | "matcha" | "fuji" | "kintsugi" | "akane" | "torii";
}

export const KEIGO_FORMULA_PRESETS: {
  id: string;
  label: string;
  icon: string;
  color: string;
  formulas: string[];
}[] = [
  {
    id: "all",
    label: "🌟 Tất cả 10 công thức (Toàn diện)",
    icon: "🌟",
    color: "border-primary/40 bg-primary/10 text-primary",
    formulas: [], // Empty means all
  },
  {
    id: "sonkeigo_all",
    label: "👑 Tôn Kính Ngữ (Sonkeigo ↑)",
    icon: "👑",
    color: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    formulas: [
      "sonkeigo_irregular",
      "sonkeigo_o_ni_naru",
      "sonkeigo_passive",
      "sonkeigo_kudasai",
    ],
  },
  {
    id: "kenjougo_all",
    label: "🙇 Khiêm Nhường Ngữ (Kenjougo ↓)",
    icon: "🙇",
    color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    formulas: [
      "kenjougo_irregular",
      "kenjougo_o_suru",
      "kenjougo_moushiageru",
      "kenjougo_permissive",
    ],
  },
  {
    id: "irregulars_only",
    label: "⚡ Động Từ Bất Quy Tắc (1-1 Blitz)",
    icon: "⚡",
    color: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    formulas: ["sonkeigo_irregular", "kenjougo_irregular"],
  },
  {
    id: "rules_only",
    label: "📜 Khuôn Mẫu Quy Tắc (お〜になる & お〜いたす)",
    icon: "📜",
    color: "border-teal-500/40 bg-teal-500/10 text-teal-600 dark:text-teal-400",
    formulas: ["sonkeigo_o_ni_naru", "kenjougo_o_suru"],
  },
  {
    id: "kudasai_requests",
    label: "🙏 Thể Nhờ Vả & Yêu Cầu (Kudasai)",
    icon: "🙏",
    color: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    formulas: ["sonkeigo_kudasai"],
  },
  {
    id: "bikago_teineigo",
    label: "🌸 Mỹ Từ & Lịch Sự (Bikago お/ご)",
    icon: "🌸",
    color: "border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    formulas: ["bikago_prefix", "teineigo_desu_masu"],
  },
];

export const ALL_KEIGO_FORMULAS: KeigoFormulaOption[] = [
  // 1. Tôn kính ngữ (Sonkeigo)
  {
    id: "sonkeigo_irregular",
    nameVi: "Động từ Bất quy tắc Tôn kính",
    formulaJa: "召し上がる / いらっしゃる / おっしゃる / ご覧になる",
    group: "sonkeigo",
    groupNameVi: "1. 👑 Tôn Kính Ngữ (Sonkeigo ↑ - Đối tác / Sếp / Khách)",
    desc: "Nâng cao hành động đặc biệt của đối phương không theo quy tắc đuôi từ",
    exampleSource: "食べる / 行く / 言う / 見る",
    exampleTarget: "召し上がる / いらっしゃる / おっしゃる / ご覧になる",
    iconColor: "text-rose-500 bg-rose-500/10 border-rose-500/30",
    badgeVariant: "sakura",
  },
  {
    id: "sonkeigo_o_ni_naru",
    nameVi: "Khuôn mẫu お + V + になる / ご + N + になる",
    formulaJa: "お + V(stem) + になる / ご + N + になる・なさる",
    group: "sonkeigo",
    groupNameVi: "1. 👑 Tôn Kính Ngữ (Sonkeigo ↑ - Đối tác / Sếp / Khách)",
    desc: "Quy tắc tôn kính trang trọng cho động từ thuần Nhật (Nhóm 1, 2) và động từ する",
    exampleSource: "待つ / 連絡する",
    exampleTarget: "お待ちになる / ご連絡なさる",
    iconColor: "text-rose-500 bg-rose-500/10 border-rose-500/30",
    badgeVariant: "sakura",
  },
  {
    id: "sonkeigo_passive",
    nameVi: "Thể Bị Động Kính Ngữ (〜れる / 〜られる)",
    formulaJa: "V(bị động) 〜れる / 〜られる / 〜される",
    group: "sonkeigo",
    groupNameVi: "1. 👑 Tôn Kính Ngữ (Sonkeigo ↑ - Đối tác / Sếp / Khách)",
    desc: "Kính ngữ thông dụng nhẹ nhàng, cực kỳ tự nhiên trong môi trường công sở",
    exampleSource: "書く / 食べる / 帰る",
    exampleTarget: "書かれる / 食べられる / 帰られる",
    iconColor: "text-amber-500 bg-amber-500/10 border-amber-500/30",
    badgeVariant: "kintsugi",
  },
  {
    id: "sonkeigo_kudasai",
    nameVi: "Thể Yêu Cầu / Nhờ Vả Lịch Sự (お/ご 〜 ください)",
    formulaJa: "お/ご + V(stem) + ください / いただけますでしょうか",
    group: "sonkeigo",
    groupNameVi: "1. 👑 Tôn Kính Ngữ (Sonkeigo ↑ - Đối tác / Sếp / Khách)",
    desc: "Khuyên nhủ, đề nghị đối phương hành động một cách nhã nhặn và trang trọng",
    exampleSource: "確認する / 待つ / 見る",
    exampleTarget: "ご確認ください / お待ちください / ご覧ください",
    iconColor: "text-sky-500 bg-sky-500/10 border-sky-500/30",
    badgeVariant: "torii",
  },

  // 2. Khiêm nhường ngữ (Kenjougo)
  {
    id: "kenjougo_irregular",
    nameVi: "Động từ Bất quy tắc Khiêm nhường",
    formulaJa: "いただく / 参る / 伺う / 申す / 拝見する / 致す / おる / 存じる",
    group: "kenjougo",
    groupNameVi: "2. 🙇 Khiêm Nhường Ngữ (Kenjougo ↓ - Bản thân / Công ty mình)",
    desc: "Hạ thấp vị thế hành động của bản thân hoặc nhóm mình trước đối tác ngoài",
    exampleSource: "もらう / 行く / 言う / 見る",
    exampleTarget: "いただく / 参る / 申す / 拝見する",
    iconColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
    badgeVariant: "matcha",
  },
  {
    id: "kenjougo_o_suru",
    nameVi: "Khuôn mẫu お + V + いたします / ご + N + いたします",
    formulaJa: "お + V(stem) + します・いたします / ご + N + いたします",
    group: "kenjougo",
    groupNameVi: "2. 🙇 Khiêm Nhường Ngữ (Kenjougo ↓ - Bản thân / Công ty mình)",
    desc: "Quy tắc khiêm nhường chuẩn mực khi hành động của mình hướng tới đối phương",
    exampleSource: "届ける / 案内する / 連絡する",
    exampleTarget: "お届けいたします / ご案内いたします / ご連絡いたします",
    iconColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
    badgeVariant: "matcha",
  },
  {
    id: "kenjougo_moushiageru",
    nameVi: "Thưa Gửi & Báo Cáo Trang Trọng (〜申し上げます)",
    formulaJa: "お/ご + V(stem)/N + 申し上げます",
    group: "kenjougo",
    groupNameVi: "2. 🙇 Khiêm Nhường Ngữ (Kenjougo ↓ - Bản thân / Công ty mình)",
    desc: "Bày tỏ lòng biết ơn, xin lỗi hoặc báo cáo thông tin ở cấp độ kính cẩn cao",
    exampleSource: "お願い / 報告 / お詫び",
    exampleTarget: "お願い申し上げます / ご報告申し上げます / お詫び申し上げます",
    iconColor: "text-teal-500 bg-teal-500/10 border-teal-500/30",
    badgeVariant: "kintsugi",
  },
  {
    id: "kenjougo_permissive",
    nameVi: "Xin Phép Bản Thân Được Làm (〜させていただきます)",
    formulaJa: "V(sai khiến) + させていただきます / させていただけますでしょうか",
    group: "kenjougo",
    groupNameVi: "2. 🙇 Khiêm Nhường Ngữ (Kenjougo ↓ - Bản thân / Công ty mình)",
    desc: "Xin phép người nghe cho phép mình thực hiện hành động và nhận được ân huệ",
    exampleSource: "説明する / 担当する",
    exampleTarget: "説明させていただきます / 担当させていただきます",
    iconColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
    badgeVariant: "matcha",
  },

  // 3. Lịch sự & Mỹ từ (Teineigo & Bikago)
  {
    id: "bikago_prefix",
    nameVi: "Tiền Tố Mỹ Từ Danh Từ (お vs ご)",
    formulaJa: "お + Kunyomi (Thuần Nhật) ↔ ご + Onyomi (Hán Nhật)",
    group: "teineigo",
    groupNameVi: "3. 🌸 Lịch Sự & Mỹ Từ (Teineigo & Bikago)",
    desc: "Thêm tiền tố お (thuần Nhật/đời sống) hoặc ご (từ Hán 2 chữ) để trau chuốt lời nói",
    exampleSource: "水 / 名前 / 家族 / 連絡",
    exampleTarget: "お水 / お名前 / ご家族 / ご連絡",
    iconColor: "text-indigo-500 bg-indigo-500/10 border-indigo-500/30",
    badgeVariant: "fuji",
  },
  {
    id: "teineigo_desu_masu",
    nameVi: "Thể Lịch Sự Tiêu Chuẩn (です / ます / でございます)",
    formulaJa: "〜です / 〜ます / 〜でございます / 〜よろしい",
    group: "teineigo",
    groupNameVi: "3. 🌸 Lịch Sự & Mỹ Từ (Teineigo & Bikago)",
    desc: "Quy chuẩn văn phong lịch sự nền tảng, biến đổi thể thông thường sang thể lịch thiệp",
    exampleSource: "だ / ある / いい",
    exampleTarget: "です / でございます / よろしいでしょうか",
    iconColor: "text-indigo-500 bg-indigo-500/10 border-indigo-500/30",
    badgeVariant: "fuji",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  selectedFormulas: string[];
  onChangeSelectedFormulas: (formulas: string[]) => void;
}

export function KeigoFormulaFilterModal({
  open,
  onClose,
  selectedFormulas,
  onChangeSelectedFormulas,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroupFilter, setActiveGroupFilter] = useState<string>("all");

  const isAllSelected = selectedFormulas.length === 0;

  // Toggle a formula
  const handleToggleFormula = (id: string) => {
    soundFX.playFurin();
    if (isAllSelected) {
      // Transitioning from 'all' to all minus this one
      const allIds = ALL_KEIGO_FORMULAS.map((f) => f.id);
      onChangeSelectedFormulas(allIds.filter((item) => item !== id));
      return;
    }

    if (selectedFormulas.includes(id)) {
      const next = selectedFormulas.filter((f) => f !== id);
      onChangeSelectedFormulas(next);
    } else {
      const next = [...selectedFormulas, id];
      if (next.length === ALL_KEIGO_FORMULAS.length) {
        onChangeSelectedFormulas([]);
      } else {
        onChangeSelectedFormulas(next);
      }
    }
  };

  // Select a preset
  const handleSelectPreset = (presetFormulas: string[]) => {
    soundFX.playKatana();
    onChangeSelectedFormulas(presetFormulas);
  };

  // Select all
  const handleSelectAll = () => {
    soundFX.playKatana();
    onChangeSelectedFormulas([]);
  };

  // Clear all
  const handleClearAll = () => {
    soundFX.playFurin();
    onChangeSelectedFormulas(["__none__"]);
  };

  // Filter items by search & group
  const filteredFormulas = useMemo(() => {
    return ALL_KEIGO_FORMULAS.filter((f) => {
      if (activeGroupFilter !== "all" && f.group !== activeGroupFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        f.nameVi.toLowerCase().includes(q) ||
        f.formulaJa.toLowerCase().includes(q) ||
        f.desc.toLowerCase().includes(q) ||
        f.exampleSource.toLowerCase().includes(q) ||
        f.exampleTarget.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, activeGroupFilter]);

  // Group items by groupNameVi
  const groupedFormulas = useMemo(() => {
    const groups: { [groupName: string]: KeigoFormulaOption[] } = {};
    for (const f of filteredFormulas) {
      if (!groups[f.groupNameVi]) groups[f.groupNameVi] = [];
      groups[f.groupNameVi].push(f);
    }
    return groups;
  }, [filteredFormulas]);

  const activeCount = isAllSelected
    ? ALL_KEIGO_FORMULAS.length
    : selectedFormulas.includes("__none__")
    ? 0
    : selectedFormulas.length;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Chọn Công Thức Kính Ngữ (Keigo Formula Filter)"
      description="Chủ động chọn các khuôn mẫu kính ngữ muốn tập trung luyện phản xạ"
      className="max-w-3xl"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* 1. Quick Presets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Bộ Chọn Nhanh (Presets 1-Chạm):</span>
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              Đã chọn: <b className="text-primary font-mono">{activeCount}</b>/{ALL_KEIGO_FORMULAS.length} công thức
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {KEIGO_FORMULA_PRESETS.map((preset) => {
              const isPresetActive =
                (preset.formulas.length === 0 && isAllSelected) ||
                (preset.formulas.length > 0 &&
                  !isAllSelected &&
                  preset.formulas.length === selectedFormulas.length &&
                  preset.formulas.every((id) => selectedFormulas.includes(id)));

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.formulas)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs",
                    isPresetActive
                      ? "ring-2 ring-primary ring-offset-1 bg-primary/15 text-primary border-primary font-black"
                      : "bg-card hover:bg-muted/70 text-foreground border-border/80"
                  )}
                >
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Search & Tab Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-border/60">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm theo tên công thức, ví dụ: 召し上がる, お〜になる, kudasai..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-muted/40 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setActiveGroupFilter("all")}
              className={cn(
                "px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors",
                activeGroupFilter === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              )}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setActiveGroupFilter("sonkeigo")}
              className={cn(
                "px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors",
                activeGroupFilter === "sonkeigo"
                  ? "bg-rose-600 text-white border-rose-600"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              )}
            >
              👑 Tôn Kính
            </button>
            <button
              type="button"
              onClick={() => setActiveGroupFilter("kenjougo")}
              className={cn(
                "px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors",
                activeGroupFilter === "kenjougo"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              )}
            >
              🙇 Khiêm Nhường
            </button>
            <button
              type="button"
              onClick={() => setActiveGroupFilter("teineigo")}
              className={cn(
                "px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors",
                activeGroupFilter === "teineigo"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              )}
            >
              🌸 Mỹ Từ
            </button>
          </div>
        </div>

        {/* 3. Grouped Formula List */}
        <div className="space-y-4 pt-1">
          {Object.entries(groupedFormulas).map(([groupTitle, formulas]) => (
            <div key={groupTitle} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>{groupTitle}</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formulas.length} công thức
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {formulas.map((f) => {
                  const isChecked = isAllSelected || selectedFormulas.includes(f.id);

                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleToggleFormula(f.id)}
                      className={cn(
                        "text-left rounded-2xl border p-3 transition-all flex flex-col justify-between space-y-2 washi-texture cursor-pointer relative group",
                        isChecked
                          ? "border-primary bg-primary/8 shadow-2xs ring-1 ring-primary/30"
                          : "border-border/80 hover:border-primary/40 bg-card hover:shadow-2xs opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={cn(
                              "h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-all",
                              isChecked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/40 bg-muted/20"
                            )}
                          >
                            {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-foreground block truncate">
                              {f.nameVi}
                            </span>
                            <span className="text-[10px] text-primary font-jp font-semibold block truncate">
                              {f.formulaJa}
                            </span>
                          </div>
                        </div>

                        <Badge variant={f.badgeVariant} size="sm" className="text-[10px] px-1.5 py-0 shrink-0">
                          {f.group === "sonkeigo" ? "Tôn Kính ↑" : f.group === "kenjougo" ? "Khiêm Nhường ↓" : "Mỹ Từ"}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1">
                        {f.desc}
                      </p>

                      <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground font-jp">
                        <span className="truncate max-w-[45%] text-muted-foreground">{f.exampleSource}</span>
                        <span className="text-primary font-bold px-1">➔</span>
                        <span className="font-bold text-foreground truncate max-w-[45%] text-right">{f.exampleTarget}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredFormulas.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-xs space-y-1">
              <p>Không tìm thấy công thức nào khớp với từ khóa "{searchQuery}"</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveGroupFilter("all");
                }}
                className="text-primary hover:underline font-bold"
              >
                Đặt lại bộ lọc tìm kiếm
              </button>
            </div>
          )}
        </div>

        {/* 4. Footer Actions */}
        <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="text-xs font-bold h-8 rounded-xl"
            >
              Chọn Tất Cả (10)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-xs font-medium h-8 rounded-xl text-muted-foreground hover:text-foreground"
            >
              Bỏ Chọn Hết
            </Button>
          </div>

          <Button
            variant="akane"
            size="sm"
            onClick={() => {
              soundFX.playKatana();
              onClose();
            }}
            className="text-xs font-bold h-8 px-4 rounded-xl gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Xác Nhận ({activeCount} công thức)</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
