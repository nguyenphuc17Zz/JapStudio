import {
  Shuffle,
  Zap,
  Crown,
  Users,
  Sparkles,
  Repeat,
  Compass,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import type { PressureLevel } from "./services/keigo-api";

export const BCCWJ_TIERS = [
  { tier: 0, label: "Tất cả (4.2k)" },
  { tier: 1, label: "🔥 Top 1k" },
  { tier: 2, label: "⭐ Top 3k" },
  { tier: 3, label: "💎 Top 5k" },
] as const;

export const BCCWJ_CATEGORIES = [
  { id: "all", label: "Tất cả chủ đề" },
  { id: "workplace_biz", label: "Công sở" },
  { id: "daily_life", label: "Đời sống" },
  { id: "action_verbs", label: "Hành động" },
  { id: "emotions_adj", label: "Cảm xúc" },
] as const;

export interface KeigoSubModeConfig {
  id: string;
  label: string;
  subLabel: string;
  ja: string;
  icon: any;
  desc: string;
  exampleSource: string;
  exampleTarget: string;
  badgeVariant: "sakura" | "kintsugi" | "matcha" | "fuji" | "jlpt" | "torii" | "akane";
  iconColor: string;
}

export const KEIGO_SUB_MODES: KeigoSubModeConfig[] = [
  {
    id: "mixed",
    label: "総合特訓",
    subLabel: "Mixed Adaptive",
    ja: "総合",
    icon: Shuffle,
    desc: "AI tự động đảo bài 8 chuyên đề theo điểm yếu của bạn",
    exampleSource: "Tình huống hỗn hợp",
    exampleTarget: "Phản xạ toàn diện",
    badgeVariant: "kintsugi",
    iconColor: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "keigo_vocab_blitz",
    label: "単語瞬間反射",
    subLabel: "Verb Flash-Blitz ⚡",
    ja: "単語",
    icon: Zap,
    desc: "Luyện phản xạ cơ bắp 1-1 cho 15+ động từ bất quy tắc cốt lõi",
    exampleSource: "言う (Nói) ➔ Khiêm nhường",
    exampleTarget: "申す / 申し上げる",
    badgeVariant: "akane",
    iconColor: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  },
  {
    id: "keigo_sonkeigo",
    label: "尊敬語",
    subLabel: "Sonkeigo ↑",
    ja: "尊敬",
    icon: Crown,
    desc: "Nâng cao hành động và trạng thái của khách hàng, đối tác, cấp trên",
    exampleSource: "食べる (Ăn)",
    exampleTarget: "召し上がる",
    badgeVariant: "sakura",
    iconColor: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  },
  {
    id: "keigo_kenjougo",
    label: "謙譲語",
    subLabel: "Kenjougo ↓",
    ja: "謙譲",
    icon: Users,
    desc: "Hạ thấp hành động của bản thân / nhóm mình khi nói với người ngoài",
    exampleSource: "言う (Nói)",
    exampleTarget: "申す / 申し上げる",
    badgeVariant: "matcha",
    iconColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "keigo_teineigo",
    label: "丁寧語・美化語",
    subLabel: "Teineigo",
    ja: "丁寧",
    icon: Sparkles,
    desc: "Quy chuẩn desu/masu, gozaimasu và thêm tiền tố mỹ từ お/ご",
    exampleSource: "水 / 会社",
    exampleTarget: "お水 / 貴社・御社",
    badgeVariant: "fuji",
    iconColor: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  },
  {
    id: "keigo_transformation",
    label: "言葉遣い変換",
    subLabel: "Register Shift",
    ja: "変換",
    icon: Repeat,
    desc: "Chuyển đổi tức thì giữa Thân mật (Tameguchi) ⇄ Kính ngữ thương mại",
    exampleSource: "明日、社長に会うよ",
    exampleTarget: "明日、社長にお会いします",
    badgeVariant: "kintsugi",
    iconColor: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "keigo_context",
    label: "ウチ・ソト特訓",
    subLabel: "Uchi / Soto",
    ja: "内外",
    icon: Compass,
    desc: "Thử thách chọn đúng hướng Kính ngữ theo quan hệ Trong - Ngoài",
    exampleSource: "Nói về sếp mình với khách",
    exampleTarget: "社長の田中が申しました",
    badgeVariant: "torii",
    iconColor: "text-sky-500 bg-sky-500/10 border-sky-500/20",
  },
  {
    id: "keigo_doctor",
    label: "敬語診断",
    subLabel: "Keigo Doctor",
    ja: "診断",
    icon: ShieldAlert,
    desc: "Phát hiện và sửa lỗi Nhị trùng kính ngữ (Double Keigo) & lộn hướng",
    exampleSource: "おっしゃられる ❌",
    exampleTarget: "おっしゃる ✅",
    badgeVariant: "akane",
    iconColor: "text-rose-600 bg-rose-600/10 border-rose-600/20",
  },
  {
    id: "keigo_naturalness",
    label: "自然度判定",
    subLabel: "Naturalness",
    ja: "自然",
    icon: CheckCircle2,
    desc: "Đo độ tự nhiên: Phân biệt câu chuẩn Nhật vs câu ngượng gạo",
    exampleSource: "ご苦労様です (Sai ngữ cảnh)",
    exampleTarget: "お疲れ様でございます ✅",
    badgeVariant: "jlpt",
    iconColor: "text-teal-500 bg-teal-500/10 border-teal-500/20",
  },
];

export const PRESSURE_LEVELS = [
  { id: "infinite", label: "Vô hạn", icon: "♾️", ms: 0, desc: "∞ Không giới hạn" },
  { id: "relaxed", label: "Dễ", icon: "🐢", ms: 6000, desc: "6.0s" },
  { id: "normal", label: "Tiêu chuẩn", icon: "🚶", ms: 5000, desc: "5.0s" },
  { id: "fast", label: "Nhanh", icon: "🏃", ms: 4000, desc: "4.0s" },
  { id: "reflex", label: "Phản xạ", icon: "⚡", ms: 3000, desc: "3.0s" },
  { id: "extreme", label: "Cực hạn", icon: "🔥", ms: 2000, desc: "2.0s" },
] as const;

export const DURATIONS = [0, 3, 5, 10, 20] as const;
