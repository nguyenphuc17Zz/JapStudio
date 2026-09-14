"use client";

import React, { useState } from "react";
import {
  X,
  Search,
  Check,
  RotateCcw,
  Sparkles,
  Crown,
  UserCheck,
  Briefcase,
  Flower2,
  CheckSquare,
  Square,
  HelpCircle,
} from "lucide-react";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";

export type KeigoGroupId = "sonkeigo" | "kenjougo" | "bikago_teineigo" | "business_words";

export interface KeigoFormulaItem {
  id: string;
  groupId: KeigoGroupId;
  groupLabel: string;
  nameVi: string;
  nameJa: string;
  formulaBadge: string;
  desc: string;
  subjectHint: string;
  badge: string;
  color: string;
  badgeColor: string;
  examples: Array<{ source: string; target: string; reading: string; label: string }>;
}

export const KEIGO_FORMULA_GROUPS = [
  { id: "all", label: "Tất cả", icon: Sparkles, count: 16 },
  { id: "sonkeigo", label: "👑 Tôn kính ngữ", icon: Crown, count: 5 },
  { id: "kenjougo", label: "🙇 Khiêm nhường ngữ", icon: UserCheck, count: 5 },
  { id: "bikago_teineigo", label: "🌸 Mỹ từ & Lịch sự", icon: Flower2, count: 3 },
  { id: "business_words", label: "💼 Từ vựng công sở", icon: Briefcase, count: 3 },
] as const;

export const KEIGO_FORMULAS: KeigoFormulaItem[] = [
  // =========================================================================
  // 1. TÔN KÍNH NGỮ (SONKEIGO - 5 công thức)
  // =========================================================================
  {
    id: "sonkeigo_irregular",
    groupId: "sonkeigo",
    groupLabel: "Tôn kính ngữ",
    nameVi: "Động từ đặc biệt (Bất quy tắc)",
    nameJa: "尊敬語・特定形（不規則動詞）",
    formulaBadge: "Biến đổi từ vựng đặc biệt",
    desc: "Nâng cao vị thế sếp, đối tác và khách hàng bằng từ vựng riêng biệt: 召し上がる, いらっしゃる, おっしゃる, ご覧になる...",
    subjectHint: "👑 Hành động của Sếp / Khách hàng / Đối tác",
    badge: "Bất quy tắc",
    color: "from-amber-500/20 via-amber-500/10 to-transparent border-amber-500/30 hover:border-amber-500/60",
    badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    examples: [
      { source: "食べる/飲む", target: "召し上がる", reading: "めしあがる", label: "ăn / uống" },
      { source: "行く/来る/いる", target: "いらっしゃる", reading: "いらっしゃる", label: "đi / đến / ở" },
      { source: "言う", target: "おっしゃる", reading: "おっしゃる", label: "nói" },
      { source: "見る", target: "ご覧になる", reading: "ごらんになる", label: "xem" },
    ],
  },
  {
    id: "sonkeigo_o_ni_naru",
    groupId: "sonkeigo",
    groupLabel: "Tôn kính ngữ",
    nameVi: "Công thức お + V(bỏ ます) + になる",
    nameJa: "お＋動詞連用形＋になる / になります",
    formulaBadge: "お + V(stem) + になる / になります",
    desc: "Quy tắc tôn kính chuẩn mực bậc nhất cho động từ nhóm 1 & 2: お書きになる, お読みになる, お待ちになる, お帰りになる...",
    subjectHint: "👑 Hành động của Sếp / Khách hàng / Đối tác",
    badge: "Quy tắc chuẩn",
    color: "from-amber-500/20 via-amber-500/10 to-transparent border-amber-500/30 hover:border-amber-500/60",
    badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    examples: [
      { source: "書く", target: "お書きになる", reading: "おかきになる", label: "viết" },
      { source: "読む", target: "お読みになる", reading: "およみになる", label: "đọc" },
      { source: "待つ", target: "お待ちになる", reading: "おまちになる", label: "chờ đợi" },
      { source: "帰る", target: "お帰りになる", reading: "おかえりになる", label: "về" },
    ],
  },
  {
    id: "sonkeigo_passive",
    groupId: "sonkeigo",
    groupLabel: "Tôn kính ngữ",
    nameVi: "Thể Bị động tôn kính (〜れる / 〜られる)",
    nameJa: "受身形による尊敬語（〜れる / 〜られる）",
    formulaBadge: "V(thể bị động): 〜れる / 〜られます",
    desc: "Tôn kính tự nhiên, thân thiện và cực kỳ phổ biến trong giao tiếp công sở: 書かれる, 読まれる, 行かれる, 来られる...",
    subjectHint: "👑 Hành động của Sếp / Đồng nghiệp / Khách",
    badge: "Thể Bị động",
    color: "from-amber-500/20 via-amber-500/10 to-transparent border-amber-500/30 hover:border-amber-500/60",
    badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    examples: [
      { source: "書く", target: "書かれる", reading: "かかれる", label: "viết" },
      { source: "読む", target: "読まれる", reading: "よまれる", label: "đọc" },
      { source: "待つ", target: "待たれる", reading: "またれる", label: "chờ" },
      { source: "食べる", target: "食べられる", reading: "たべられる", label: "ăn" },
    ],
  },
  {
    id: "sonkeigo_go_ni_naru",
    groupId: "sonkeigo",
    groupLabel: "Tôn kính ngữ",
    nameVi: "Công thức ご + Danh từ Suru + になる / なさる",
    nameJa: "ご＋漢語名詞＋になる / なさる",
    formulaBadge: "ご + N(Hán tự) + になる / なさる",
    desc: "Tôn kính dành cho động từ nhóm 3 (Hán tự 2 chữ): ご利用になる, ご案内になる, ご連絡なさる, ご検討になる...",
    subjectHint: "👑 Hành động của Sếp / Khách hàng / Đối tác",
    badge: "Hán tự Suru",
    color: "from-amber-500/20 via-amber-500/10 to-transparent border-amber-500/30 hover:border-amber-500/60",
    badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    examples: [
      { source: "利用する", target: "ご利用になる", reading: "ごりようになる", label: "sử dụng" },
      { source: "案内する", target: "ご案内なさる", reading: "ごあんないなさる", label: "hướng dẫn" },
      { source: "連絡する", target: "ご連絡になる", reading: "ごれんらくになる", label: "liên lạc" },
      { source: "検討する", target: "ご検討なさる", reading: "ごけんとうなさる", label: "xem xét" },
    ],
  },
  {
    id: "sonkeigo_kudasai",
    groupId: "sonkeigo",
    groupLabel: "Tôn kính ngữ",
    nameVi: "Công thức Yêu cầu tôn kính (お/ご 〜 ください)",
    nameJa: "お / ご 〜 ください（ませ）",
    formulaBadge: "お/ご 〜 ください / くださいませ",
    desc: "Mẫu câu yêu cầu, hướng dẫn và nhờ cậy lịch sự tối cao: 少々お待ちください, お入りください, ご確認ください...",
    subjectHint: "👑 Mời / Nhờ khách hàng vui lòng làm gì",
    badge: "Yêu cầu lịch sự",
    color: "from-amber-500/20 via-amber-500/10 to-transparent border-amber-500/30 hover:border-amber-500/60",
    badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    examples: [
      { source: "待つ", target: "お待ちください", reading: "おまちください", label: "vui lòng đợi" },
      { source: "入る", target: "お入りください", reading: "おはいりください", label: "mời vào" },
      { source: "確認する", target: "ご確認ください", reading: "ごかくにんください", label: "vui lòng kiểm tra" },
      { source: "遠慮する", target: "ご遠慮ください", reading: "ごえんりょください", label: "xin đừng làm" },
    ],
  },

  // =========================================================================
  // 2. KHIÊM NHƯỜNG NGỮ (KENJOUGO - 5 công thức)
  // =========================================================================
  {
    id: "kenjougo_irregular",
    groupId: "kenjougo",
    groupLabel: "Khiêm nhường ngữ",
    nameVi: "Động từ đặc biệt (Bất quy tắc)",
    nameJa: "謙譲語・特定形（不規則動詞）",
    formulaBadge: "Biến đổi từ vựng đặc biệt",
    desc: "Hạ mình khiêm tốn khi nói về hành động bản thân trước khách: いただく, 参る, 申す, 拝見する, 存じる, 伺う...",
    subjectHint: "🙇 Hành động của Bản thân / Công ty mình",
    badge: "Bất quy tắc",
    color: "from-indigo-500/20 via-indigo-500/10 to-transparent border-indigo-500/30 hover:border-indigo-500/60",
    badgeColor: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    examples: [
      { source: "食べる/もらう", target: "いただく", reading: "いただく", label: "ăn / nhận" },
      { source: "行く/来る", target: "参る", reading: "まいる", label: "đi / đến" },
      { source: "言う", target: "申す", reading: "もうす", label: "nói / xưng là" },
      { source: "見る", target: "拝見する", reading: "はいけんする", label: "xem qua" },
    ],
  },
  {
    id: "kenjougo_o_suru",
    groupId: "kenjougo",
    groupLabel: "Khiêm nhường ngữ",
    nameVi: "Công thức お + V(bỏ ます) + します / いたします",
    nameJa: "お＋動詞連用形＋します / いたします",
    formulaBadge: "お + V(stem) + します / いたします",
    desc: "Khiêm nhường quy tắc cho động từ thuần Nhật: お持ちする, お送りする, お届けする, お手伝いする...",
    subjectHint: "🙇 Hành động của Bản thân / Công ty mình",
    badge: "Quy tắc chuẩn",
    color: "from-indigo-500/20 via-indigo-500/10 to-transparent border-indigo-500/30 hover:border-indigo-500/60",
    badgeColor: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    examples: [
      { source: "持つ", target: "お持ちする", reading: "おもちする", label: "mang giúp" },
      { source: "送る", target: "お送りする", reading: "おおくりする", label: "gửi" },
      { source: "届ける", target: "お届けする", reading: "おとどけする", label: "giao đến" },
      { source: "手伝う", target: "お手伝いする", reading: "おてつだいする", label: "giúp đỡ" },
    ],
  },
  {
    id: "kenjougo_go_suru",
    groupId: "kenjougo",
    groupLabel: "Khiêm nhường ngữ",
    nameVi: "Công thức ご + Danh từ Suru + します / いたします",
    nameJa: "ご＋漢語名詞＋します / いたします",
    formulaBadge: "ご + N(Hán tự) + します / いたします",
    desc: "Khiêm nhường cho động từ nhóm 3 (Hán tự 2 chữ): ご連絡いたす, ご案内いたす, ご説明いたす, ご報告いたす...",
    subjectHint: "🙇 Hành động của Bản thân / Công ty mình",
    badge: "Hán tự Suru",
    color: "from-indigo-500/20 via-indigo-500/10 to-transparent border-indigo-500/30 hover:border-indigo-500/60",
    badgeColor: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    examples: [
      { source: "連絡する", target: "ご連絡いたす", reading: "ごれんらくいたす", label: "liên lạc" },
      { source: "案内する", target: "ご案内いたす", reading: "ごあんないいたす", label: "dẫn đường" },
      { source: "説明する", target: "ご説明いたす", reading: "ごせつめいいたす", label: "trình bày" },
      { source: "報告する", target: "ご報告いたす", reading: "ごほうこくいたす", label: "báo cáo" },
    ],
  },
  {
    id: "kenjougo_moushiageru",
    groupId: "kenjougo",
    groupLabel: "Khiêm nhường ngữ",
    nameVi: "Công thức 〜申し上げます (Khiêm nhường trang trọng)",
    nameJa: "お / ご 〜 申し上げます",
    formulaBadge: "お/ご + V/N + 申し上げます",
    desc: "Khiêm nhường cấp độ cao nhất dùng trong email và nghi thức thương mại: お礼申し上げる, お詫び申し上げる, お祝い申し上げる...",
    subjectHint: "🙇 Bày tỏ sự cung kính, lòng biết ơn, tạ lỗi",
    badge: "Cung kính cao cấp",
    color: "from-indigo-500/20 via-indigo-500/10 to-transparent border-indigo-500/30 hover:border-indigo-500/60",
    badgeColor: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    examples: [
      { source: "礼を言う", target: "お礼申し上げる", reading: "おれいもうしあげる", label: "cảm tạ" },
      { source: "詫びる", target: "お詫び申し上げる", reading: "おわびもうしあげる", label: "tạ lỗi" },
      { source: "祝う", target: "お祝い申し上げる", reading: "おいわいもうしあげる", label: "chúc mừng" },
      { source: "お願いする", target: "お願い申し上げる", reading: "おねがいもうしあげる", label: "kính mong" },
    ],
  },
  {
    id: "kenjougo_permissive",
    groupId: "kenjougo",
    groupLabel: "Khiêm nhường ngữ",
    nameVi: "Công thức Xin phép (〜させていただきます)",
    nameJa: "使役形＋いただく（〜させていただきます）",
    formulaBadge: "Thể sai khiến + させていただきます",
    desc: "Xin phép người khác cho bản thân thực hiện việc gì: 休ませていただく, 説明させていただく, 参加させていただく...",
    subjectHint: "🙇 Bản thân xin phép được làm gì",
    badge: "Xin phép",
    color: "from-indigo-500/20 via-indigo-500/10 to-transparent border-indigo-500/30 hover:border-indigo-500/60",
    badgeColor: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    examples: [
      { source: "休む", target: "休ませていただく", reading: "やすませていただく", label: "xin nghỉ" },
      { source: "説明する", target: "説明させていただく", reading: "せつめいさせていただく", label: "xin giải thích" },
      { source: "参加する", target: "参加させていただく", reading: "さんかさせていただく", label: "xin tham gia" },
      { source: "辞退する", target: "辞退させていただく", reading: "じたいさせていただく", label: "xin rút lui" },
    ],
  },

  // =========================================================================
  // 3. MỸ TỪ & LỊCH SỰ (BIKAGO & TEINEIGO - 3 công thức)
  // =========================================================================
  {
    id: "bikago_prefix_o",
    groupId: "bikago_teineigo",
    groupLabel: "Mỹ từ & Lịch sự",
    nameVi: "Tiền tố Mỹ từ「お」(Kunyomi - Thuần Nhật)",
    nameJa: "美化語・接頭辞「お」（和語）",
    formulaBadge: "お + Từ thuần Nhật / Quen thuộc",
    desc: "Thêm tiền tố お trước từ thuần Nhật để làm đẹp và tôn kính: お名前, お金, お茶, お水, お手紙, お宅...",
    subjectHint: "🌸 Mỹ hóa lời nói & Sở hữu của đối tác",
    badge: "Tiền tố お",
    color: "from-rose-500/20 via-rose-500/10 to-transparent border-rose-500/30 hover:border-rose-500/60",
    badgeColor: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    examples: [
      { source: "名前", target: "お名前", reading: "おなまえ", label: "quý danh" },
      { source: "金", target: "お金", reading: "おかね", label: "tiền bạc" },
      { source: "茶", target: "お茶", reading: "おちゃ", label: "trà" },
      { source: "手紙", target: "お手紙", reading: "おてがみ", label: "bức thư" },
    ],
  },
  {
    id: "bikago_prefix_go",
    groupId: "bikago_teineigo",
    groupLabel: "Mỹ từ & Lịch sự",
    nameVi: "Tiền tố Mỹ từ「ご」(Onyomi - Gốc Hán)",
    nameJa: "美化語・接頭辞「ご」（漢語）",
    formulaBadge: "ご + Từ gốc Hán (Âm On)",
    desc: "Thêm tiền tố ご trước từ 2 Hán tự để tăng tính trang trọng: ご家族, ご意見, ご住所, ご予定, ご親切, ご飯...",
    subjectHint: "🌸 Mỹ hóa lời nói & Trạng thái của đối tác",
    badge: "Tiền tố ご",
    color: "from-rose-500/20 via-rose-500/10 to-transparent border-rose-500/30 hover:border-rose-500/60",
    badgeColor: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    examples: [
      { source: "家族", target: "ご家族", reading: "ごかぞく", label: "gia đình quý ngài" },
      { source: "意見", target: "ご意見", reading: "ごいけん", label: "ý kiến" },
      { source: "住所", target: "ご住所", reading: "ごじゅうしょ", label: "địa chỉ" },
      { source: "予定", target: "ご予定", reading: "ごよてい", label: "kế hoạch" },
    ],
  },
  {
    id: "teineigo_desu_masu",
    groupId: "bikago_teineigo",
    groupLabel: "Mỹ từ & Lịch sự",
    nameVi: "Lịch sự & Đinh trọng ngữ (ございます / でございます)",
    nameJa: "丁寧語・丁重語（ございます / でございます）",
    formulaBadge: "ある → ございます | です → でございます",
    desc: "Cách diễn đạt lịch sự cao cấp của です・ます trong công sở: ございます, でございます, よろしいでしょうか, いかがでしょうか...",
    subjectHint: "🌸 Đinh trọng ngữ & Tông giọng trang trọng",
    badge: "Đinh trọng ngữ",
    color: "from-rose-500/20 via-rose-500/10 to-transparent border-rose-500/30 hover:border-rose-500/60",
    badgeColor: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    examples: [
      { source: "ある", target: "ございます", reading: "ございます", label: "có" },
      { source: "だ / です", target: "でございます", reading: "でございます", label: "là" },
      { source: "いいですか", target: "よろしいでしょうか", reading: "よろしいでしょうか", label: "được không" },
      { source: "どうですか", target: "いかがでしょうか", reading: "いかがでしょうか", label: "thế nào" },
    ],
  },

  // =========================================================================
  // 4. TỪ VỰNG CÔNG SỞ (BUSINESS WORDS - 3 công thức)
  // =========================================================================
  {
    id: "business_pronouns",
    groupId: "business_words",
    groupLabel: "Từ vựng công sở",
    nameVi: "Đại từ nhân xưng & Xưng hô Uchi / Soto",
    nameJa: "ビジネス人称代名詞（内外の使い分け）",
    formulaBadge: "Xưng hô đối ngoại công sở",
    desc: "Quy tắc ranh giới trong/ngoài sống còn của doanh nghiệp Nhật: わたくし, 私ども, 弊社 vs 貴社/御社, どちら様...",
    subjectHint: "💼 Xưng hô chuẩn mực Uchi vs Soto",
    badge: "Đại từ xưng hô",
    color: "from-blue-500/20 via-blue-500/10 to-transparent border-blue-500/30 hover:border-blue-500/60",
    badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    examples: [
      { source: "わたし", target: "わたくし", reading: "わたくし", label: "tôi" },
      { source: "わたしたち", target: "私ども", reading: "わたくしども", label: "chúng tôi" },
      { source: "会社 (mình)", target: "弊社", reading: "へいしゃ", label: "công ty tôi" },
      { source: "会社 (khách)", target: "御社 / 貴社", reading: "おんしゃ", label: "quý công ty" },
    ],
  },
  {
    id: "business_time_adverbs",
    groupId: "business_words",
    groupLabel: "Từ vựng công sở",
    nameVi: "Thời gian & Phó từ công sở chuẩn mực",
    nameJa: "ビジネス時間表現・副詞",
    formulaBadge: "Thời gian & Phó từ thương mại",
    desc: "Thuật ngữ thời gian và mức độ chuẩn Nhật thương mại: 本日, 明日(みょうにち), 昨日(さくじつ), 少々, 後ほど...",
    subjectHint: "💼 Diễn đạt lịch sự thời gian & phó từ",
    badge: "Thời gian & Phó từ",
    color: "from-blue-500/20 via-blue-500/10 to-transparent border-blue-500/30 hover:border-blue-500/60",
    badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    examples: [
      { source: "今日", target: "本日", reading: "ほんじつ", label: "hôm nay" },
      { source: "明日", target: "明日", reading: "みょうにち", label: "ngày mai" },
      { source: "ちょっと", target: "少々", reading: "しょうしょう", label: "một chút" },
      { source: "あとで", target: "後ほど", reading: "のちほど", label: "lát nữa" },
    ],
  },
  {
    id: "business_phrases",
    groupId: "business_words",
    groupLabel: "Từ vựng công sở",
    nameVi: "Cụm từ giao tiếp công sở kinh điển",
    nameJa: "ビジネス定型フレーズ・挨拶",
    formulaBadge: "Khẩu ngữ & Chào hỏi doanh nghiệp",
    desc: "Bộ câu cửa miệng ứng đối chuẩn mực của dân văn phòng: かしこまりました, 申し訳ございません, とんでもないことでございます...",
    subjectHint: "💼 Ứng đối công sở phản xạ",
    badge: "Cụm từ thương mại",
    color: "from-blue-500/20 via-blue-500/10 to-transparent border-blue-500/30 hover:border-blue-500/60",
    badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    examples: [
      { source: "わかりました", target: "かしこまりました", reading: "かしこまりました", label: "tôi đã hiểu" },
      { source: "すみません", target: "申し訳ございません", reading: "もうしわけございません", label: "xin thứ lỗi" },
      { source: "どういたしまして", target: "とんでもないことでございます", reading: "とんでもないことでございます", label: "không có chi" },
      { source: "ありがとう", target: "誠にありがとうございます", reading: "まことにありがとうございます", label: "chân thành cảm ơn" },
    ],
  },
];

interface KeigoFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  customKeywords?: string;
  onChangeCustomKeywords?: (val: string) => void;
}

export function KeigoFilterModal({
  isOpen,
  onClose,
  selectedCategories,
  onChange,
  customKeywords = "",
  onChangeCustomKeywords,
}: KeigoFilterModalProps) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  if (!isOpen) return null;

  const isAll = selectedCategories.length === 0;

  // Filter formulas by group and search query
  const displayedFormulas = KEIGO_FORMULAS.filter((item) => {
    // 1. Group check
    if (activeTab !== "all" && item.groupId !== activeTab) {
      return false;
    }
    // 2. Search query check
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.nameVi.toLowerCase().includes(q) ||
      item.nameJa.toLowerCase().includes(q) ||
      item.formulaBadge.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      item.badge.toLowerCase().includes(q) ||
      item.subjectHint.toLowerCase().includes(q) ||
      item.examples.some(
        (ex) =>
          ex.source.toLowerCase().includes(q) ||
          ex.target.toLowerCase().includes(q) ||
          ex.reading.toLowerCase().includes(q) ||
          ex.label.toLowerCase().includes(q)
      )
    );
  });

  const toggleFormula = (id: string) => {
    soundFX.playFurin();
    if (selectedCategories.includes(id)) {
      onChange(selectedCategories.filter((c) => c !== id));
    } else {
      onChange([...selectedCategories, id]);
    }
  };

  const handleSelectAllInActiveGroup = () => {
    soundFX.playFurin();
    const groupItems = activeTab === "all"
      ? KEIGO_FORMULAS.map((f) => f.id)
      : KEIGO_FORMULAS.filter((f) => f.groupId === activeTab).map((f) => f.id);

    const merged = Array.from(new Set([...selectedCategories, ...groupItems]));
    onChange(merged);
  };

  const handleDeselectAllInActiveGroup = () => {
    soundFX.playFurin();
    const groupItemIds = new Set(
      activeTab === "all"
        ? KEIGO_FORMULAS.map((f) => f.id)
        : KEIGO_FORMULAS.filter((f) => f.groupId === activeTab).map((f) => f.id)
    );
    onChange(selectedCategories.filter((id) => !groupItemIds.has(id)));
  };

  const handleResetToAll = () => {
    soundFX.playFurin();
    onChange([]);
    if (onChangeCustomKeywords) onChangeCustomKeywords("");
  };

  const handleSelectIrregularsOnly = () => {
    soundFX.playFurin();
    onChange(["sonkeigo_irregular", "kenjougo_irregular"]);
  };

  const handleSelectRuleBasedOnly = () => {
    soundFX.playFurin();
    onChange([
      "sonkeigo_o_ni_naru",
      "sonkeigo_passive",
      "sonkeigo_go_ni_naru",
      "sonkeigo_kudasai",
      "kenjougo_o_suru",
      "kenjougo_go_suru",
      "kenjougo_moushiageru",
      "kenjougo_permissive",
    ]);
  };

  // Check how many are selected in current tab
  const currentTabFormulas = activeTab === "all"
    ? KEIGO_FORMULAS
    : KEIGO_FORMULAS.filter((f) => f.groupId === activeTab);
  const selectedInCurrentTab = currentTabFormulas.filter((f) => selectedCategories.includes(f.id)).length;
  const isCurrentTabFullySelected = currentTabFormulas.length > 0 && selectedInCurrentTab === currentTabFormulas.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-card border border-border/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/25">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-foreground tracking-tight">
                  Tùy Chọn Công Thức Kính Ngữ Phản Xạ
                </h3>
                <span className="text-[11px] font-bold font-jp px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  敬語公式・文型
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Chọn chính xác các công thức kính ngữ bạn muốn luyện tập (đảm bảo 100% đúng công thức đã chọn).
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFX.playFurin();
              onClose();
            }}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* GROUP TABS BAR */}
        <div className="px-6 pt-3 pb-2 border-b border-border/40 bg-muted/10 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {KEIGO_FORMULA_GROUPS.map((grp) => {
            const Icon = grp.icon;
            const isActive = activeTab === grp.id;
            const countInGroup = grp.id === "all"
              ? selectedCategories.length
              : KEIGO_FORMULAS.filter((f) => f.groupId === grp.id && selectedCategories.includes(f.id)).length;

            return (
              <button
                key={grp.id}
                onClick={() => {
                  soundFX.playFurin();
                  setActiveTab(grp.id);
                }}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 border",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background/80 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{grp.label}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                    isActive
                      ? "bg-white/20 text-white"
                      : countInGroup > 0
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {countInGroup > 0 ? `${countInGroup}/${grp.count}` : grp.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* SEARCH & QUICK PRESET ACTIONS BAR */}
        <div className="px-6 py-2.5 border-b border-border/40 bg-muted/5 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm công thức, ví dụ (お〜になる, 申す, Bị động)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-background border border-border/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 w-full md:w-auto justify-end flex-wrap">
            <button
              onClick={handleResetToAll}
              className={cn(
                "px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all border flex items-center gap-1",
                isAll
                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                  : "bg-background border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <Sparkles className="h-3 w-3" />
              Ngẫu nhiên toàn diện
            </button>

            <button
              onClick={handleSelectIrregularsOnly}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-background border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              ⭐ Bất quy tắc
            </button>

            <button
              onClick={handleSelectRuleBasedOnly}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-background border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              ⚙️ Các quy tắc chuẩn
            </button>

            {/* Toggle current group */}
            {isCurrentTabFullySelected ? (
              <button
                onClick={handleDeselectAllInActiveGroup}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors flex items-center gap-1"
              >
                <Square className="h-3 w-3" />
                Bỏ chọn tab này
              </button>
            ) : (
              <button
                onClick={handleSelectAllInActiveGroup}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-foreground bg-muted/60 hover:bg-muted border border-border/60 transition-colors flex items-center gap-1"
              >
                <CheckSquare className="h-3 w-3" />
                Chọn cả tab này
              </button>
            )}
          </div>
        </div>

        {/* MODAL CONTENT BODY: FORMULA CARDS GRID */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[58vh]">
          {/* Active Preset Status Notice */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-muted/30 border border-border/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                {isAll
                  ? "🎯 Đang chọn: Ngẫu nhiên toàn bộ 290 cặp từ & 16 công thức kính ngữ."
                  : `✅ Đã chọn ${selectedCategories.length}/16 công thức cụ thể:`}
              </span>
              {!isAll && (
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  {selectedCategories.length === 1
                    ? KEIGO_FORMULAS.find((f) => f.id === selectedCategories[0])?.nameVi
                    : `${selectedCategories.length} công thức`}
                </span>
              )}
            </div>
            {!isAll && (
              <button
                onClick={handleResetToAll}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1 hover:underline"
              >
                <RotateCcw className="h-3 w-3" />
                Đặt lại
              </button>
            )}
          </div>

          {/* Grid of Formulas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {displayedFormulas.map((item) => {
              const isSelected = selectedCategories.includes(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => toggleFormula(item.id)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden",
                    isSelected
                      ? `bg-gradient-to-br ${item.color} shadow-sm ring-1.5 ring-primary/40`
                      : "bg-card border-border/70 hover:border-border hover:bg-muted/20"
                  )}
                >
                  <div>
                    {/* Top Row: Badges & Checkbox */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={cn(
                            "text-[10px] font-extrabold px-2 py-0.5 rounded-md border font-jp",
                            item.badgeColor
                          )}
                        >
                          {item.badge}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/50">
                          {item.groupLabel}
                        </span>
                      </div>

                      {/* Checkbox indicator */}
                      <div
                        className={cn(
                          "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground shadow-xs"
                            : "border-border/80 bg-background/50 group-hover:border-primary/50"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Formula Syntax Pill */}
                    <div className="mb-2">
                      <span className="inline-block font-mono font-bold text-[11px] px-2.5 py-1 rounded-xl bg-background/90 border border-border/80 text-foreground shadow-2xs">
                        {item.formulaBadge}
                      </span>
                    </div>

                    {/* Title & Japanese Name */}
                    <h4 className="font-black text-sm text-foreground group-hover:text-primary transition-colors leading-snug">
                      {item.nameVi}
                    </h4>
                    <p className="text-[11px] font-jp font-bold text-muted-foreground mt-0.5">
                      {item.nameJa}
                    </p>

                    {/* Subject Hint & Description */}
                    <div className="mt-2 space-y-1">
                      <p className="text-[11px] font-bold text-primary flex items-center gap-1">
                        {item.subjectHint}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  {/* Examples Preview */}
                  <div className="mt-3 pt-2.5 border-t border-border/40">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        Ví dụ mẫu:
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {item.examples.length} từ tiêu biểu
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {item.examples.map((ex, idx) => (
                        <div
                          key={idx}
                          className="px-2 py-1 rounded-lg bg-background/80 border border-border/60 text-[10px] flex items-center justify-between shadow-2xs font-medium"
                        >
                          <span className="text-muted-foreground truncate">{ex.source}</span>
                          <span className="font-bold font-jp text-primary truncate ml-1">{ex.target}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {displayedFormulas.length === 0 && (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <HelpCircle className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm font-semibold">
                Không tìm thấy công thức nào khớp với từ khóa "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-primary font-bold hover:underline"
              >
                Xóa bộ lọc tìm kiếm
              </button>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-muted/25">
          <div className="text-xs text-muted-foreground">
            {isAll ? (
              <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Đang bật: <strong>Ngẫu nhiên toàn diện (100% tất cả công thức kính ngữ)</strong>
              </span>
            ) : (
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Đã chọn <strong>{selectedCategories.length} công thức</strong> (bảo đảm ra đúng 100%)
              </span>
            )}
          </div>

          <button
            onClick={() => {
              soundFX.playFurin();
              onClose();
            }}
            className="px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground font-black text-xs shadow-md hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Áp Dụng & Bắt Đầu Luyện
          </button>
        </div>
      </div>
    </div>
  );
}
