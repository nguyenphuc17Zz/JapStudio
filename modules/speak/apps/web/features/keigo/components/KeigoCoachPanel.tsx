"use client";

import React, { useState } from "react";
import {
  Crown,
  Volume2,
  BookOpen,
  PlusCircle,
  Lightbulb,
  Layers,
  ArrowRight,
  Zap,
  CheckCircle2,
  MessageSquare,
  Flame,
  Check,
  Info,
  ShieldAlert,
  Compass,
  Award,
  GitCompare,
  AlertTriangle,
  Building2,
  Users,
} from "lucide-react";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type { KeigoExercise, KeigoAnatomy, KeigoHints } from "../services/keigo-api";

export interface KeigoCoachPanelProps {
  exercise: KeigoExercise | null;
  onInsertText?: (text: string) => void;
  onPlayAudio?: (text: string) => void;
  className?: string;
}

type TabKey = "all" | "formula" | "pairs" | "pragmatics";

interface VerbPair {
  root: string;
  meaningVi: string;
  sonkeigo: string;
  kenjougo: string;
}

const COMMON_KEIGO_PAIRS: VerbPair[] = [
  { root: "言う", meaningVi: "nói", sonkeigo: "おっしゃる", kenjougo: "申す / 申し上げる" },
  { root: "行く / 来る", meaningVi: "đi / đến", sonkeigo: "いらっしゃる / おいでになる", kenjougo: "参る / 伺う" },
  { root: "見る", meaningVi: "nhìn / xem", sonkeigo: "ご覧になる", kenjougo: "拝見する" },
  { root: "知る", meaningVi: "biết", sonkeigo: "ご存じだ", kenjougo: "存じ上げる / 存じる" },
  { root: "食べる / 飲む", meaningVi: "ăn / uống", sonkeigo: "召し上がる", kenjougo: "いただく" },
  { root: "する", meaningVi: "làm", sonkeigo: "なさる", kenjougo: "致す" },
  { root: "聞く / 尋ねる", meaningVi: "hỏi / nghe", sonkeigo: "お聞きになる", kenjougo: "伺う / 拝聴する" },
  { root: "会う", meaningVi: "gặp", sonkeigo: "お会いになる", kenjougo: "お目にかかる" },
  { root: "あげる / くれる", meaningVi: "cho / tặng", sonkeigo: "くださる", kenjougo: "差し上げる" },
  { root: "思う", meaningVi: "nghĩ", sonkeigo: "お思いになる", kenjougo: "存じます" },
];

const CUSHION_PHRASES: Array<{ ja: string; vi: string }> = [
  { ja: "恐れ入りますが、", vi: "Xin thứ lỗi vì làm phiền nhưng..." },
  { ja: "お手数をおかけいたしますが、", vi: "Xin phiền quý khách nhưng..." },
  { ja: "差し支えなければ、", vi: "Nếu không có gì bất tiện thì..." },
  { ja: "承知いたしました。", vi: "Tôi đã hiểu rõ / tiếp nhận rồi ạ." },
  { ja: "かしこまりました。", vi: "Rõ thưa quý khách (dùng với khách hàng)." },
  { ja: "少々お待ちいただけますでしょうか。", vi: "Xin vui lòng đợi một chút được không ạ?" },
];

export function KeigoCoachPanel({
  exercise,
  onInsertText,
  onPlayAudio,
  className,
}: KeigoCoachPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  if (!exercise) return null;

  const kc = exercise.extra_metadata?.keigo_config || {};
  const canonical =
    exercise.canonical ||
    (exercise.target_patterns && exercise.target_patterns.length > 0 ? exercise.target_patterns[0] : "") ||
    kc.canonical ||
    "";
  const canonicalVi =
    kc.canonical_vi ||
    kc.translation ||
    exercise.instructions ||
    "";

  const anatomy: KeigoAnatomy | undefined = exercise.anatomy || kc.anatomy;
  const hints: KeigoHints | undefined = exercise.hints || kc.hints;
  const pitfall =
    anatomy?.pitfallWarning ||
    kc.pitfall_warning ||
    kc.baito_warning ||
    "Tránh lỗi nhị trùng kính ngữ (ví dụ: おっしゃられる là sai, chỉ dùng おっしゃる).";

  const targetType =
    kc.target_type ||
    (exercise.title?.includes("謙譲") ? "kenjougo" : "sonkeigo");

  const isSonkeigo = targetType === "sonkeigo" || targetType === "respectful";
  const isKenjougo = targetType === "kenjougo" || targetType === "humble";

  const formulaText =
    anatomy?.formula ||
    kc.formula ||
    (isSonkeigo
      ? "お + V(stem) + になる / になります (hoặc động từ đặc biệt)"
      : isKenjougo
      ? "お + V(stem) + する / いたします (hoặc động từ đặc biệt)"
      : "Thể lịch sự chuẩn thương mại");

  const rationale =
    anatomy?.rationale ||
    kc.rule_explanation ||
    hints?.tier1 ||
    (isSonkeigo
      ? "Nâng cao vị thế của cấp trên / đối tác / khách hàng khi nói về hành động của họ."
      : "Hạ mình khi nói về hành động của bản thân / công ty mình để bày tỏ sự tôn kính.");

  const handlePlay = (text: string) => {
    stopWebSpeech();
    soundFX.playFurin();
    if (onPlayAudio) {
      onPlayAudio(text);
    } else {
      speakJapaneseText(text, { rate: 0.95 });
    }
  };

  const handleInsert = (text: string) => {
    soundFX.playTaiko();
    const clean = text.replace(/〜/g, "").trim();
    if (onInsertText) {
      onInsertText(clean);
      toast.success("Đã chèn gợi ý vào ô phát ngôn!");
    } else {
      navigator.clipboard.writeText(clean);
      toast.success("Đã sao chép vào bộ nhớ tạm!");
    }
  };

  return (
    <div
      className={cn(
        "h-full flex flex-col justify-between rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#111622]/90 backdrop-blur-2xl shadow-lg relative overflow-hidden",
        className
      )}
    >
      {/* ── 1. Header: Sensei AI Trợ Lý Kính Ngữ ── */}
      <div className="p-3.5 sm:p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-2xs">
            <Crown className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-foreground">
                Sensei AI • Trợ Lý Kính Ngữ Doanh Nghiệp
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-amber-500/15 border border-amber-500/30 text-[9px] font-bold text-amber-700 dark:text-amber-300">
                <Zap className="h-2.5 w-2.5" /> Gợi Ý Trực Tiếp
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {isSonkeigo
                ? "👑 Tôn Kính Ngữ (尊敬語) • Hành động của Sếp / Đối tác / Khách hàng"
                : isKenjougo
                ? "🙇 Khiêm Nhường Ngữ (謙譲語) • Hành động của Bản thân / Phía mình"
                : "🏢 Kính Ngữ Doanh Nghiệp • Giao tiếp thương mại chuẩn Tokyo"}
            </p>
          </div>
        </div>

        <Badge
          variant={isSonkeigo ? "sakura" : isKenjougo ? "matcha" : "fuji"}
          size="sm"
          className="text-[10px] font-bold shrink-0 shadow-2xs"
        >
          {isSonkeigo ? "Tôn Kính" : isKenjougo ? "Khiêm Nhường" : "Thương Mại"}
        </Badge>
      </div>

      {/* ── 2. Filter Navigation Pills ── */}
      <div className="px-3.5 py-2 border-b border-border/40 bg-muted/10 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={cn(
            "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 cursor-pointer",
            activeTab === "all"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          Tất cả
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("formula")}
          className={cn(
            "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 flex items-center gap-1 cursor-pointer",
            activeTab === "formula"
              ? "bg-amber-600 text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Layers className="h-3 w-3" />
          Câu mồi & Công thức
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("pairs")}
          className={cn(
            "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 flex items-center gap-1 cursor-pointer",
            activeTab === "pairs"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <GitCompare className="h-3 w-3" />
          Cặp từ đối chiếu
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("pragmatics")}
          className={cn(
            "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 flex items-center gap-1 cursor-pointer",
            activeTab === "pragmatics"
              ? "bg-rose-600 text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <ShieldAlert className="h-3 w-3" />
          Bẫy lỗi & Uchi/Soto
        </button>
      </div>

      {/* ── 3. Main Scrollable Body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-3 sm:p-4 space-y-3">
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CÂU MỒI ĐỆM THƯƠNG MẠI (CUSHION PHRASES)                   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "formula") && (
          <div className="p-3 rounded-2xl bg-amber-500/8 border border-amber-500/25 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-amber-500" />
                Câu Đệm Thương Mại Chuẩn Mực (Cushion Phrases):
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">1-Chạm chèn</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {CUSHION_PHRASES.map((cp, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl bg-card border border-amber-500/30 flex items-center justify-between gap-1.5 shadow-2xs hover:border-amber-500 transition-all"
                >
                  <div className="min-w-0 flex-1 truncate">
                    <div className="text-xs font-bold font-jp text-foreground truncate">
                      <UniversalFurigana text={cp.ja} fontSize="sm" />
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {cp.vi}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePlay(cp.ja)}
                      className="h-6 w-6 p-0 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleInsert(cp.ja)}
                      className="h-6 px-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-[10px] font-bold gap-0.5"
                      title="Chèn câu đệm này"
                    >
                      <PlusCircle className="h-3 w-3" />
                      <span>Chèn</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CÔNG THỨC VÀNG CHUYỂN ĐỔI (KEIGO FORMULA BLUEPRINT)         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "formula") && (
          <div className="p-3.5 rounded-2xl bg-indigo-500/8 border border-indigo-500/25 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-500" />
                Công Thức Chuyển Đổi Vàng:
              </span>
              <Badge variant="outline" size="sm" className="text-[10px] border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
                Formula
              </Badge>
            </div>

            <div className="p-2.5 rounded-xl bg-card border border-border/80 text-xs font-bold font-jp text-foreground">
              💡 {formulaText}
            </div>

            <p className="text-[11px] text-muted-foreground leading-snug">
              👉 {rationale}
            </p>

            {hints?.tier2 && (
              <div className="pt-1.5 border-t border-indigo-500/15 flex items-center justify-between gap-2">
                <div className="text-xs font-bold text-foreground truncate">
                  <span className="text-[10px] text-muted-foreground uppercase mr-1">Khung sườn mồi:</span>
                  <UniversalFurigana text={hints.tier2} fontSize="sm" />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleInsert(hints.tier2)}
                  className="h-6 px-1.5 text-indigo-600 hover:bg-indigo-500/10 text-[10px] font-bold gap-0.5 shrink-0"
                  title="Chèn khung sườn"
                >
                  <PlusCircle className="h-3 w-3" />
                  <span>Chèn</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ĐÁP ÁN MẪU CHUẨN TOKYO (CANONICAL MODEL RESPONSE)          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "formula") && canonical && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/8 border border-emerald-500/25 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-emerald-500" />
                Đáp Án Kính Ngữ Chuẩn Tokyo Tham Khảo:
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePlay(canonical)}
                  className="h-6 w-6 p-0 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                  title="Nghe phát âm chuẩn Tokyo"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleInsert(canonical)}
                  className="h-6 px-2 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-[10px] font-bold gap-1"
                  title="Chèn toàn bộ câu mẫu"
                >
                  <PlusCircle className="h-3 w-3" />
                  <span>Chèn câu</span>
                </Button>
              </div>
            </div>

            <div className="text-sm font-black font-jp text-foreground leading-relaxed">
              「<UniversalFurigana text={canonical} fontSize="normal" />」
            </div>

            {canonicalVi && (
              <p className="text-[11px] text-muted-foreground leading-snug">
                👉 {canonicalVi}
              </p>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* BẢNG ĐỐI CHIẾU CẶP ĐỘNG TỪ KÍNH NGỮ (VERB PAIRS CONTRAST)  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "pairs") && (
          <div className="p-3 rounded-2xl bg-card border border-border/80 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <GitCompare className="h-3.5 w-3.5 text-primary" />
                Bảng Đối Chiếu Động Từ Kinh Điển (Tôn Kính vs Khiêm Nhường):
              </span>
              <span className="text-[10px] text-muted-foreground">Verb Matrix</span>
            </div>

            <div className="space-y-1.5">
              {COMMON_KEIGO_PAIRS.slice(0, 6).map((vp, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl bg-muted/20 border border-border/60 text-xs flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-1.5 min-w-[80px]">
                    <span className="font-bold text-foreground font-jp">{vp.root}</span>
                    <span className="text-[10px] text-muted-foreground">({vp.meaningVi})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-[11px] font-bold">
                      <span className="text-[9px] uppercase opacity-75">Tôn:</span>
                      <span className="font-jp">{vp.sonkeigo}</span>
                    </div>

                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold">
                      <span className="text-[9px] uppercase opacity-75">Khiêm:</span>
                      <span className="font-jp">{vp.kenjougo}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* BẪY LỖI KÍNH NGỮ & QUY TẮC UCHI/SOTO                        */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(activeTab === "all" || activeTab === "pragmatics") && (
          <div className="space-y-2.5">
            {pitfall && (
              <div className="p-3.5 rounded-2xl bg-rose-500/8 border border-rose-500/25 space-y-1.5 shadow-2xs">
                <span className="text-xs font-black text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                  Cảnh Báo Bẫy Lỗi Kính Ngữ Thường Gặp:
                </span>
                <div className="p-2 rounded-xl bg-card border border-border/80 text-xs text-foreground leading-relaxed">
                  ⚠️ {pitfall}
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-sky-500/8 border border-sky-500/25 space-y-2 shadow-2xs">
              <span className="text-xs font-black text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-sky-500" />
                Quy Tắc Biên Giới Trong - Ngoài (Uchi / Soto):
              </span>
              <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                <p>
                  🏢 <strong>Với người ngoài công ty (Soto):</strong> Dù là Giám đốc của mình, vẫn dùng <em>Khiêm nhường ngữ (Kenjougo)</em> và không thêm chức danh hay xưng hô kính cẩn khi nói về họ (ví dụ: 「部長の田中」 thay vì 「田中部長様」).
                </p>
                <p>
                  🤝 <strong>Với đối tác / Khách hàng:</strong> Luôn dùng <em>Tôn kính ngữ (Sonkeigo)</em> tuyệt đối cho hành động của họ.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Bottom Footer Hint ── */}
      <div className="p-2.5 sm:p-3 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
        <span className="flex items-center gap-1.5 font-medium truncate">
          <Info className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Tự do nói câu kính ngữ, AI chấm linh hoạt theo cấp độ quan hệ</span>
        </span>
        <span className="text-[10px] font-mono text-muted-foreground shrink-0 hidden sm:inline">
          Bấm <strong>Space / Nộp</strong> khi nói xong
        </span>
      </div>
    </div>
  );
}
