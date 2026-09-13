"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Crown,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Users,
  Building,
  Volume2,
  Sparkles,
  BookOpen,
  Clock,
  Briefcase,
  ChevronRight,
  Layers,
} from "lucide-react";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectWord?: (word: string) => void;
}

// 1. Core Irregular Verb Triplets
const KEIGO_VERB_TABLE = [
  { plain: "する (Làm)", sonkeigo: "なさる / なさいます", kenjougo: "いたす / いたします", teineigo: "します", example: "ご検討なさる / 準備いたします" },
  { plain: "言う (Nói)", sonkeigo: "おっしゃる / おっしゃいます", kenjougo: "申す / 申し上げる", teineigo: "言います", example: "社長がおっしゃる / 田中と申します" },
  { plain: "行く (Đi)", sonkeigo: "いらっしゃる / おいでになる", kenjougo: "参る / 伺う", teineigo: "行きます", example: "どちらにいらっしゃいますか / 明日伺います" },
  { plain: "来る (Đến)", sonkeigo: "いらっしゃる / お越しになる / お見えになる", kenjougo: "参る (まいる)", teineigo: "来ます", example: "お客様がお見えになりました / 支社から参りました" },
  { plain: "いる (Ở/Có)", sonkeigo: "いらっしゃる / おいでになる", kenjougo: "おる / おります", teineigo: "います", example: "部長はいらっしゃいますか / 席におります" },
  { plain: "食べる・飲む (Ăn/Uống)", sonkeigo: "召し上がる (めしあがる)", kenjougo: "いただく / 頂戴する", teineigo: "食べます", example: "どうぞ召し上がってください / 美味しくいただきました" },
  { plain: "見る (Xem/Nhìn)", sonkeigo: "ご覧になる (ごらんになる)", kenjougo: "拝見する (はいけんする)", teineigo: "見ます", example: "資料をご覧になりましたか / 拝見しました" },
  { plain: "知っている (Biết)", sonkeigo: "ご存知だ / ご存知です", kenjougo: "存じる / 存じ上げる", teineigo: "知っています", example: "ご存知ですか / 重々存じております" },
  { plain: "聞く (Nghe/Hỏi)", sonkeigo: "お聞きになる", kenjougo: "伺う / 拝聴する", teineigo: "聞きます", example: "お話を伺いました / 講演を拝聴する" },
  { plain: "会う (Gặp)", sonkeigo: "お会いになる", kenjougo: "お目にかかる", teineigo: "会います", example: "初めてお目にかかります / 社長とお会いになる" },
  { plain: "もらう (Nhận)", sonkeigo: "お受け取りになる", kenjougo: "いただく / 頂戴する", teineigo: "もらいます", example: "名刺を頂戴いたします" },
  { plain: "あげる (Tặng)", sonkeigo: "くださる", kenjougo: "差し上げる (さしあげる)", teineigo: "あげます", example: "資料を差し上げます / 助言をくださる" },
  { plain: "くれる (Cho mình)", sonkeigo: "くださる / くださいます", kenjougo: "—", teineigo: "くれます", example: "教えてくださり感謝いたします" },
  { plain: "寝る (Ngủ/Nghỉ)", sonkeigo: "お休みになる", kenjougo: "休ませていただく", teineigo: "寝ます", example: "どうぞごゆっくりお休みください" },
  { plain: "着る (Mặc đồ)", sonkeigo: "お召しになる", kenjougo: "着させていただく", teineigo: "着ます", example: "素敵なコートをお召しですね" },
  { plain: "死ぬ (Mất/Qua đời)", sonkeigo: "お亡くなりになる", kenjougo: "亡くなる", teineigo: "亡くなりました", example: "先月お亡くなりになりました" },
  { plain: "伝える (Nhắn lại)", sonkeigo: "お伝えになる", kenjougo: "申し伝える (もうしつたえる)", teineigo: "伝えます", example: "担当の者に申し伝えます" },
  { plain: "思う (Nghĩ)", sonkeigo: "お思いになる", kenjougo: "存じます / 存じ上げる", teineigo: "思います", example: "大変光栄に存じます" },
  { plain: "借りる (Mượn)", sonkeigo: "お借りになる", kenjougo: "拝借する (はいしゃくする)", teineigo: "借ります", example: "お知恵を拝借できますか" },
  { plain: "座る (Ngồi)", sonkeigo: "お掛けになる (おかえになる)", kenjougo: "座らせていただく", teineigo: "座ります", example: "どうぞソファにお掛けください" },
];

// 2. Prefixes O vs Go and Exceptions
const NOUN_PREFIXES_TABLE = [
  { word: "名前 (なまえ)", prefix: "お", result: "お名前", type: "Kunyomi (Thuần Nhật)", meaning: "Họ tên của quý khách" },
  { word: "元気 (げんき)", prefix: "お", result: "お元気", type: "Trạng thái đối phương", meaning: "Sức khỏe / Khỏe mạnh" },
  { word: "宅 (たく)", prefix: "お", result: "お宅", type: "Kunyomi", meaning: "Nhà của quý khách/đối tác" },
  { word: "仕事 (しごと)", prefix: "お", result: "お仕事", type: "Kunyomi", meaning: "Công việc của đối tác" },
  { word: "電話 (でんわ)", prefix: "お", result: "お電話", type: "Ngoại lệ Hán tự", meaning: "Cuộc gọi / Số điện thoại" },
  { word: "食事 (しょくじ)", prefix: "お", result: "お食事", type: "Ngoại lệ Hán tự", meaning: "Bữa ăn của đối phương" },
  { word: "料理 (りょうり)", prefix: "お", result: "お料理", type: "Ngoại lệ Hán tự", meaning: "Món ăn" },
  { word: "時間 (じかん)", prefix: "お", result: "お時間", type: "Ngoại lệ Hán tự", meaning: "Thời gian quý báu" },
  { word: "返事 (へんじ)", prefix: "お", result: "お返事", type: "Ngoại lệ Hán tự", meaning: "Thư/Lời hồi đáp" },
  { word: "約束 (やくそく)", prefix: "お", result: "お約束", type: "Ngoại lệ Hán tự", meaning: "Lời hứa / Cuộc hẹn" },
  { word: "家族 (かぞく)", prefix: "ご", result: "ご家族", type: "Onyomi (Từ gốc Hán)", meaning: "Gia đình của quý khách" },
  { word: "意見 (いけん)", prefix: "ご", result: "ご意見", type: "Onyomi (Từ gốc Hán)", meaning: "Ý kiến đóng góp" },
  { word: "連絡 (れんらく)", prefix: "ご", result: "ご連絡", type: "Onyomi (Từ gốc Hán)", meaning: "Sự liên lạc" },
  { word: "住所 (じゅうしょ)", prefix: "ご", result: "ご住所", type: "Onyomi (Từ gốc Hán)", meaning: "Địa chỉ của đối tác" },
  { word: "都合 (つごう)", prefix: "ご", result: "ご都合", type: "Onyomi (Từ gốc Hán)", meaning: "Lịch trình / Sự thuận tiện" },
  { word: "予定 (よてい)", prefix: "ご", result: "ご予定", type: "Onyomi (Từ gốc Hán)", meaning: "Kế hoạch dự kiến" },
  { word: "案内 (あんない)", prefix: "ご", result: "ご案内", type: "Onyomi (Từ gốc Hán)", meaning: "Sự hướng dẫn / Chỉ đường" },
  { word: "説明 (せつめい)", prefix: "ご", result: "ご説明", type: "Onyomi (Từ gốc Hán)", meaning: "Lời giải thích / Trình bày" },
  { word: "協力 (きょうりょく)", prefix: "ご", result: "ご協力", type: "Onyomi (Từ gốc Hán)", meaning: "Sự hợp tác giúp đỡ" },
  { word: "検討 (けんとう)", prefix: "ご", result: "ご検討", type: "Onyomi (Từ gốc Hán)", meaning: "Sự xem xét cân nhắc" },
  { word: "親切 (しんせつ)", prefix: "ご", result: "ご親切", type: "Tính từ Na gốc Hán", meaning: "Sự tử tế chu đáo" },
  { word: "心配 (しんぱい)", prefix: "ご", result: "ご心配", type: "Onyomi (Từ gốc Hán)", meaning: "Sự lo lắng bận tâm" },
];

// 3. Business Pronouns & Expressions
const BUSINESS_WORDS_TABLE = [
  { plain: "わたし (Tôi)", biz: "わたくし", category: "Đại từ nhân xưng", example: "わたくしが担当いたします" },
  { plain: "わたしたち (Chúng tôi)", biz: "私ども (わたくしども)", category: "Đại từ nhân xưng", example: "私ども一同お待ちしております" },
  { plain: "会社 (Công ty mình - Uchi)", biz: "弊社 (へいしゃ) / 当社 (とうしゃ)", category: "Xưng hô công ty", example: "弊社の担当よりご連絡いたします" },
  { plain: "会社 (Công ty khách - Soto)", biz: "御社 (おんしゃ - nói) / 貴社 (きしゃ - viết)", category: "Xưng hô công ty", example: "御社のますますのご発展をお祈りします" },
  { plain: "人 (Người)", biz: "方 (かた)", category: "Xưng hô đối tác", example: "あちらにいらっしゃる方" },
  { plain: "だれ (Ai)", biz: "どなた / どちら様 (どちらさま)", category: "Hỏi danh tính", example: "失礼ですがどちら様でしょうか" },
  { plain: "どこ (Ở đâu)", biz: "どちら", category: "Hỏi phương hướng", example: "受付はどちらでしょうか" },
  { plain: "どう (Thế nào)", biz: "いかが", category: "Hỏi ý kiến", example: "ご提案はいかがでしょうか" },
  { plain: "今日 (Hôm nay)", biz: "本日 (ほんじつ)", category: "Thời gian", example: "本日はお時間をいただき感謝いたします" },
  { plain: "明日 (Ngày mai)", biz: "明日 (みょうにち / あす)", category: "Thời gian", example: "明日、改めてご連絡申し上げます" },
  { plain: "昨日 (Hôm qua)", biz: "昨日 (さくじつ)", category: "Thời gian", example: "昨日は大変お世話になりました" },
  { plain: "おととい (Hôm kia)", biz: "一昨日 (いっさくじつ)", category: "Thời gian", example: "一昨日お送りした資料" },
  { plain: "あさって (Ngày kìa)", biz: "明後日 (みょうごにち)", category: "Thời gian", example: "明後日の午前中に伺います" },
  { plain: "今年 (Năm nay)", biz: "本年 (ほんねん)", category: "Thời gian", example: "本年もよろしくお願い申し上げます" },
  { plain: "去年 (Năm ngoái)", biz: "昨年 (さくねん)", category: "Thời gian", example: "昨年に引き続きご愛顧を賜り" },
  { plain: "ちょっと (Một chút)", biz: "少々 (しょうしょう) / しばらく", category: "Phó từ công sở", example: "少々お待ちいただけますでしょうか" },
  { plain: "すぐ (Lập tức)", biz: "至急 (しきゅう) / 早急に (さっきゅうに)", category: "Phó từ công sở", example: "至急、確認して対応いたします" },
  { plain: "いい (Được/Tốt)", biz: "よろしい / 結構です (けっこうです)", category: "Tính từ công sở", example: "こちらの内容でよろしいでしょうか" },
  { plain: "すみません (Xin lỗi)", biz: "申し訳ございません / 恐れ入ります", category: "Cảm ơn/Xin lỗi", example: "ご不便をおかけし申し訳ございません" },
];

export function KeigoCheatsheetModal({ isOpen, onClose, onSelectWord }: Props) {
  const [activeTab, setActiveTab] = useState<"verbs" | "formulas" | "prefixes" | "business" | "uchi_soto">("verbs");
  const [searchQuery, setSearchQuery] = useState("");
  const [speakingText, setSpeakingText] = useState<string | null>(null);

  const handleSpeak = (text: string) => {
    if (!text || text === "—") return;
    const clean = text.split("/")[0].split("(")[0].trim();
    setSpeakingText(clean);
    speakJapaneseText(clean, {
      rate: 0.95,
      onEnd: () => setSpeakingText(null),
      onError: () => setSpeakingText(null),
    });
  };

  const filteredVerbs = KEIGO_VERB_TABLE.filter(
    (v) =>
      v.plain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.sonkeigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.kenjougo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.example.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPrefixes = NOUN_PREFIXES_TABLE.filter(
    (p) =>
      p.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.result.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.meaning.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBusiness = BUSINESS_WORDS_TABLE.filter(
    (b) =>
      b.plain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.biz.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📖 Sổ Tay Kính Ngữ Công Sở Toàn Diện (Keigo Master Guide)" className="max-w-4xl">
      <div className="space-y-4 text-sm">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-border/80 pb-2">
          <Button
            size="sm"
            variant={activeTab === "verbs" ? "akane" : "ghost"}
            onClick={() => setActiveTab("verbs")}
            className="gap-1.5 font-bold text-xs"
          >
            <Crown className="h-3.5 w-3.5" /> Động Từ Bất Quy Tắc
          </Button>
          <Button
            size="sm"
            variant={activeTab === "formulas" ? "akane" : "ghost"}
            onClick={() => setActiveTab("formulas")}
            className="gap-1.5 font-bold text-xs"
          >
            <Layers className="h-3.5 w-3.5" /> Bộ Công Thức Động Từ
          </Button>
          <Button
            size="sm"
            variant={activeTab === "prefixes" ? "akane" : "ghost"}
            onClick={() => setActiveTab("prefixes")}
            className="gap-1.5 font-bold text-xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-rose-500" /> Tiền Tố「お」và「ご」
          </Button>
          <Button
            size="sm"
            variant={activeTab === "business" ? "akane" : "ghost"}
            onClick={() => setActiveTab("business")}
            className="gap-1.5 font-bold text-xs"
          >
            <Briefcase className="h-3.5 w-3.5" /> Từ Vựng & Đại Từ Công Sở
          </Button>
          <Button
            size="sm"
            variant={activeTab === "uchi_soto" ? "akane" : "ghost"}
            onClick={() => setActiveTab("uchi_soto")}
            className="gap-1.5 font-bold text-xs"
          >
            <Users className="h-3.5 w-3.5" /> Uchi/Soto & Bẫy Kính Ngữ
          </Button>
        </div>

        {/* Search bar for searchable tabs */}
        {(activeTab === "verbs" || activeTab === "prefixes" || activeTab === "business") && (
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm: từ gốc, kính ngữ, tiền tố, nghĩa tiếng Việt (ăn, nói, gia đình, công ty...)"
              className="w-full rounded-xl border bg-background pl-9 pr-4 py-2 text-xs focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>
        )}

        {/* Tab 1: Verbs Table */}
        {activeTab === "verbs" && (
          <div className="space-y-3">
            <div className="max-h-[380px] overflow-y-auto rounded-2xl border border-border/80 bg-card">
              <table className="w-full text-left text-xs border-collapse font-jp">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs border-b border-border text-[11px] font-bold text-muted-foreground z-10">
                  <tr>
                    <th className="p-2.5 font-sans">Động từ gốc</th>
                    <th className="p-2.5 text-rose-600 dark:text-rose-400 font-sans">Tôn Kính (尊敬語 ↑)</th>
                    <th className="p-2.5 text-emerald-600 dark:text-emerald-400 font-sans">Khiêm Nhường (謙譲語 ↓)</th>
                    <th className="p-2.5 text-muted-foreground hidden md:table-cell font-sans">Ví dụ ứng dụng</th>
                    <th className="p-2.5 text-right font-sans">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredVerbs.map((v, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="p-2.5 font-bold text-foreground font-sans">{v.plain}</td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-1.5 font-extrabold text-rose-600 dark:text-rose-400">
                          <UniversalFurigana text={v.sonkeigo} fontSize="sm" />
                          <button
                            onClick={() => handleSpeak(v.sonkeigo)}
                            className="text-muted-foreground hover:text-rose-600 p-0.5"
                            title="Nghe phát âm"
                          >
                            <Volume2 className={cn("h-3.5 w-3.5", speakingText === v.sonkeigo.split("/")[0].trim() && "animate-bounce text-rose-600")} />
                          </button>
                        </div>
                      </td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-1.5 font-extrabold text-emerald-600 dark:text-emerald-400">
                          <UniversalFurigana text={v.kenjougo} fontSize="sm" />
                          <button
                            onClick={() => handleSpeak(v.kenjougo)}
                            className="text-muted-foreground hover:text-emerald-600 p-0.5"
                            title="Nghe phát âm"
                          >
                            <Volume2 className={cn("h-3.5 w-3.5", speakingText === v.kenjougo.split("/")[0].trim() && "animate-bounce text-emerald-600")} />
                          </button>
                        </div>
                      </td>
                      <td className="p-2.5 text-muted-foreground text-[11px] hidden md:table-cell">
                        <UniversalFurigana text={v.example} fontSize="sm" />
                      </td>
                      <td className="p-2.5 text-right">
                        {onSelectWord && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              onSelectWord(v.plain.split(" ")[0]);
                              onClose();
                            }}
                            className="h-6 px-2 text-[10px] font-bold text-primary hover:bg-primary/10"
                          >
                            Luyện từ này
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Formulas (Full grammar formulas) */}
        {activeTab === "formulas" && (
          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            {/* Sonkeigo Formulas */}
            <div className="p-4 rounded-2xl bg-rose-500/8 border border-rose-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="sakura" size="sm">👑 Tôn Kính Ngữ (尊敬語 ↑)</Badge>
                  <span className="font-bold text-xs text-rose-700 dark:text-rose-300">Nâng cao hành động của Đối phương / Sếp / Khách hàng</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Sonkeigo Formula 1 */}
                <div className="p-3 rounded-xl bg-background border space-y-2">
                  <div className="font-bold text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-rose-500" />
                    <span>Công thức 1: お ＋ Động từ (stem) ＋ になる / になります</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Áp dụng cho Động từ Nhóm 1 và Nhóm 2 (bỏ đuôi ます).
                  </p>
                  <div className="p-2 rounded-lg bg-muted/40 font-mono text-xs space-y-1">
                    <div>• 待つ ➔ <strong>お待ちになる / お待ちになります</strong></div>
                    <div>• 読む ➔ <strong>お読みになる / お読みになります</strong></div>
                    <div>• 帰る ➔ <strong>お帰りになる / お帰りになります</strong></div>
                  </div>
                </div>

                {/* Sonkeigo Formula 2 */}
                <div className="p-3 rounded-xl bg-background border space-y-2">
                  <div className="font-bold text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-rose-500" />
                    <span>Công thức 2: Thể Bị Động Kính Ngữ (〜れる / 〜られます)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Lịch sự tự nhiên, phổ biến rộng rãi trong giao tiếp văn phòng.
                  </p>
                  <div className="p-2 rounded-lg bg-muted/40 font-mono text-xs space-y-1">
                    <div>• Nhóm 1: 書く ➔ <strong>書かれる / 書かれます</strong></div>
                    <div>• Nhóm 2: 食べる ➔ <strong>食べられる / 食べられます</strong></div>
                    <div>• Nhóm 3: する ➔ <strong>される / されます</strong></div>
                    <div>• Nhóm 3: 来る ➔ <strong>来られる (こられる) / 来られます</strong></div>
                  </div>
                </div>

                {/* Sonkeigo Formula 3: Kudasai & Polite Requests */}
                <div className="p-3 rounded-xl bg-background border space-y-2 md:col-span-2">
                  <div className="font-bold text-xs text-rose-600 dark:text-rose-400 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-rose-500" />
                      <span>Công thức 3: Thể Yêu Cầu / Nhờ Vả & Mời Lịch Sự (ください & いただけますでしょうか)</span>
                    </div>
                    <Badge variant="sakura" size="sm">Siêu thông dụng ⚡</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Dùng khi yêu cầu, hướng dẫn hoặc nhờ đối phương, sếp, khách hàng thực hiện hành động một cách tôn trọng.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                    <div className="p-2 rounded-lg bg-muted/40 space-y-1">
                      <span className="font-bold text-rose-600 dark:text-rose-400 block font-sans text-[11px]">A. Nhóm 1 & 2 (Thuần Nhật):</span>
                      <div className="text-[11px]">お ＋ V_stem ＋ <strong>ください</strong></div>
                      <div className="text-[10px] text-muted-foreground pt-1 space-y-0.5 font-sans">
                        <div>• 待つ ➔ <strong>少々お待ちください</strong></div>
                        <div>• 入る ➔ <strong>お入りください</strong></div>
                        <div>• 座る ➔ <strong>お掛けください</strong></div>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40 space-y-1">
                      <span className="font-bold text-rose-600 dark:text-rose-400 block font-sans text-[11px]">B. Nhóm 3 (Hán tự する):</span>
                      <div className="text-[11px]">ご ＋ N ＋ <strong>ください</strong></div>
                      <div className="text-[10px] text-muted-foreground pt-1 space-y-0.5 font-sans">
                        <div>• 確認 ➔ <strong>ご確認ください</strong></div>
                        <div>• 連絡 ➔ <strong>ご連絡ください</strong></div>
                        <div>• 検討 ➔ <strong>ご検討ください</strong></div>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40 space-y-1">
                      <span className="font-bold text-rose-600 dark:text-rose-400 block font-sans text-[11px]">C. Đàm phán cao cấp:</span>
                      <div className="text-[11px]">お/ご ＋ ... ＋ <strong>いただけますでしょうか</strong></div>
                      <div className="text-[10px] text-muted-foreground pt-1 space-y-0.5 font-sans">
                        <div>• <strong>ご確認いただけますでしょうか</strong></div>
                        <div>• <strong>お待ちいただけますでしょうか</strong></div>
                        <div>• Mềm mại: <strong>お待ちくださいませ</strong></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-rose-500/10 text-[11px] text-rose-700 dark:text-rose-300 font-jp flex flex-wrap gap-2 items-center">
                    <span className="font-bold font-sans">Bất quy tắc:</span>
                    <span>見る ➔ <strong>ご覧ください</strong></span>
                    <span>•</span>
                    <span>食べる ➔ <strong>お召し上がりください</strong></span>
                    <span>•</span>
                    <span>来る ➔ <strong>お越しください / いらしてください</strong></span>
                    <span>•</span>
                    <span>寝る ➔ <strong>お休みください</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Kenjougo Formulas */}
            <div className="p-4 rounded-2xl bg-emerald-500/8 border border-emerald-500/20 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="matcha" size="sm">🙇 Khiêm Nhường Ngữ (謙譲語 ↓)</Badge>
                <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300">Hạ thấp hành động của Bản thân & Người công ty mình</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Kenjougo Cách 1 */}
                <div className="p-3 rounded-xl bg-background border space-y-2">
                  <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Cách 1: Động từ Nhóm 1 & 2 (Thuần Nhật)</span>
                  </div>
                  <div className="p-1.5 rounded bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300 text-xs text-center font-mono">
                    お ＋ V (bỏ ます) ＋ します / いたします
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40 font-mono text-xs space-y-1">
                    <div>• 待つ ➔ <strong>お待ちします / お待ちいたします</strong></div>
                    <div>• 届ける ➔ <strong>お届けします / お届けいたします</strong></div>
                    <div>• 手伝う ➔ <strong>お手伝いします / お手伝いいたします</strong></div>
                    <div>• 送る ➔ <strong>お送りします / お送りいたします</strong></div>
                  </div>
                </div>

                {/* Kenjougo Cách 2 */}
                <div className="p-3 rounded-xl bg-background border space-y-2">
                  <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Cách 2: Động từ Nhóm 3 (Dạng Danh động từ する)</span>
                  </div>
                  <div className="p-1.5 rounded bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300 text-xs text-center font-mono">
                    ご ＋ Danh từ Hán (bỏ する) ＋ します / いたします
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40 font-mono text-xs space-y-1">
                    <div>• 連絡する ➔ <strong>ご連絡します / ご連絡いたします</strong></div>
                    <div>• 案内する ➔ <strong>ご案内します / ご案内いたします</strong></div>
                    <div>• 説明する ➔ <strong>ご説明します / ご説明いたします</strong></div>
                    <div>• 報告する ➔ <strong>ご報告します / ご報告いたします</strong></div>
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 pt-0.5 font-sans">
                      *Ngoại lệ: 電話する ➔ <strong>お電話いたします</strong>
                    </div>
                  </div>
                </div>

                {/* Kenjougo Cách 3: Moushiageru */}
                <div className="p-3 rounded-xl bg-background border space-y-2">
                  <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Cách 3: Thưa gửi & Báo cáo trang trọng (申し上げる)</span>
                  </div>
                  <div className="p-1.5 rounded bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300 text-xs text-center font-mono">
                    お/ご ＋ ... ＋ 申し上げます
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40 font-mono text-xs space-y-1">
                    <div>• お願い ➔ <strong>よろしくお願い申し上げます</strong></div>
                    <div>• 案内 ➔ <strong>ご案内申し上げます</strong></div>
                    <div>• 報告 ➔ <strong>ご報告申し上げます</strong></div>
                    <div>• お詫び (Xin lỗi) ➔ <strong>心よりお詫び申し上げます</strong></div>
                  </div>
                </div>

                {/* Kenjougo Cách 4: Permissive Saseteitadaku */}
                <div className="p-3 rounded-xl bg-background border space-y-2">
                  <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Cách 4: Xin phép được làm (Permissive Kenjougo)</span>
                  </div>
                  <div className="p-1.5 rounded bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300 text-xs text-center font-mono">
                    V (thể sai khiến させて) ＋ いただきます
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40 font-mono text-xs space-y-1">
                    <div>• 休む ➔ <strong>休ませていただきます</strong></div>
                    <div>• 質問する ➔ <strong>質問させていただきます</strong></div>
                    <div>• 担当する ➔ <strong>担当させていただきます</strong></div>
                    <div>• Hỏi ý: <strong>〜させていただけますでしょうか</strong></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Prefixes O and Go */}
        {activeTab === "prefixes" && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-muted/40 border text-xs text-muted-foreground flex flex-col md:flex-row gap-3 justify-between">
              <div>
                <strong className="text-foreground">🌸 Quy tắc thêm tiền tố「お」(O):</strong> Đi với từ thuần Nhật (Kunyomi) và từ đời sống thân thuộc.
              </div>
              <div>
                <strong className="text-foreground">🏯 Quy tắc thêm tiền tố「ご」(Go):</strong> Đi với từ gốc Hán 2 âm tiết (Onyomi).
              </div>
            </div>

            <div className="max-h-[350px] overflow-y-auto rounded-2xl border border-border/80 bg-card">
              <table className="w-full text-left text-xs border-collapse font-jp">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs border-b border-border text-[11px] font-bold text-muted-foreground z-10">
                  <tr>
                    <th className="p-2.5 font-sans">Từ gốc</th>
                    <th className="p-2.5 font-sans text-rose-600 dark:text-rose-400">Tiền tố</th>
                    <th className="p-2.5 font-sans font-bold text-foreground">Dạng Kính Ngữ</th>
                    <th className="p-2.5 font-sans text-muted-foreground hidden sm:table-cell">Phân loại quy tắc</th>
                    <th className="p-2.5 font-sans text-muted-foreground">Ý nghĩa tiếng Việt</th>
                    <th className="p-2.5 text-right font-sans">Nghe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPrefixes.map((p, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="p-2.5 font-medium text-foreground">{p.word}</td>
                      <td className="p-2.5">
                        <Badge variant={p.prefix === "お" ? "sakura" : "matcha"} size="sm">
                          {p.prefix}
                        </Badge>
                      </td>
                      <td className="p-2.5 font-bold text-primary text-sm font-jp">{p.result}</td>
                      <td className="p-2.5 text-muted-foreground text-[11px] hidden sm:table-cell font-sans">{p.type}</td>
                      <td className="p-2.5 text-foreground font-sans text-xs">{p.meaning}</td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => handleSpeak(p.result)}
                          className="text-muted-foreground hover:text-primary p-1"
                          title="Nghe phát âm"
                        >
                          <Volume2 className={cn("h-3.5 w-3.5", speakingText === p.result && "animate-bounce text-primary")} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Business Pronouns & Time Words */}
        {activeTab === "business" && (
          <div className="space-y-3">
            <div className="max-h-[380px] overflow-y-auto rounded-2xl border border-border/80 bg-card">
              <table className="w-full text-left text-xs border-collapse font-jp">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs border-b border-border text-[11px] font-bold text-muted-foreground z-10">
                  <tr>
                    <th className="p-2.5 font-sans">Từ thông thường</th>
                    <th className="p-2.5 font-sans text-primary">Văn phong công sở (ビジネス語)</th>
                    <th className="p-2.5 font-sans text-muted-foreground hidden sm:table-cell">Nhóm từ</th>
                    <th className="p-2.5 font-sans text-muted-foreground">Ví dụ câu thực tế</th>
                    <th className="p-2.5 text-right font-sans">Nghe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredBusiness.map((b, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="p-2.5 font-medium text-foreground font-sans">{b.plain}</td>
                      <td className="p-2.5 font-bold text-primary text-sm font-jp">{b.biz}</td>
                      <td className="p-2.5 text-muted-foreground text-[11px] hidden sm:table-cell font-sans">
                        <Badge variant="outline" size="sm">{b.category}</Badge>
                      </td>
                      <td className="p-2.5 text-muted-foreground text-xs font-jp">
                        <UniversalFurigana text={b.example} fontSize="sm" />
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => handleSpeak(b.biz.split("/")[0].split("(")[0].trim())}
                          className="text-muted-foreground hover:text-primary p-1"
                          title="Nghe phát âm"
                        >
                          <Volume2 className={cn("h-3.5 w-3.5", speakingText === b.biz.split("/")[0].split("(")[0].trim() && "animate-bounce text-primary")} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Uchi / Soto Principle & Double Keigo */}
        {activeTab === "uchi_soto" && (
          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-rose-500/8 border border-rose-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="sakura" size="sm">Uchi (身内)</Badge>
                  <span className="font-bold text-xs text-rose-700 dark:text-rose-300">Bản thân & Người công ty mình</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bản thân, đồng nghiệp, và khi nói chuyện với đối tác ngoài thì <strong>Giám đốc/Trưởng phòng công ty mình</strong> cũng được tính là người trong nhà (Uchi).
                </p>
                <div className="p-2.5 rounded-xl bg-background/80 border text-xs space-y-1">
                  <span className="font-bold text-primary">Hành động của Uchi ➔ Dùng Khiêm Nhường Ngữ (謙譲語 ↓)</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/8 border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="matcha" size="sm">Soto (他者)</Badge>
                  <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300">Khách hàng & Đối tác ngoài</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Khách hàng, đối tác, người gọi điện từ công ty khác đến đều là người ngoài (Soto).
                </p>
                <div className="p-2.5 rounded-xl bg-background/80 border text-xs space-y-1">
                  <span className="font-bold text-rose-600 dark:text-rose-400">Hành động của Soto ➔ Dùng Tôn Kính Ngữ (尊敬語 ↑)</span>
                </div>
              </div>
            </div>

            {/* Classic Example */}
            <div className="p-4 rounded-2xl bg-amber-500/8 border border-amber-500/20 space-y-3">
              <div className="font-bold text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Building className="h-4 w-4" /> Tình huống kinh điển: Nói về Giám đốc mình với khách hàng ngoài
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
                  <span className="font-bold">❌ Sai lầm:</span>
                  <span>「田中社長はおっしゃいました」(Tôn xưng sếp mình trước mặt khách ngoài)</span>
                </div>
                <div className="flex items-start gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>「社長の田中が申しました」(Bỏ chức danh 'sama/san' và dùng khiêm nhường ngữ 申す)</span>
                </div>
              </div>
            </div>

            {/* Double Keigo */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-2">
              <h4 className="font-bold text-xs text-foreground flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" /> Bẫy Nhị Trùng Kính Ngữ (二重敬語):
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Là lỗi dùng 2 lần kính ngữ trên cùng một động từ, làm câu rườm rà và sai chuẩn mực:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-1 font-jp">
                  <span className="text-rose-600 font-bold">❌ Sai:</span>
                  <div className="line-through text-muted-foreground">おっしゃられる (おっしゃる ＋ られる)</div>
                  <div className="line-through text-muted-foreground">ご覧になられる (ご覧になる ＋ られる)</div>
                  <div className="line-through text-muted-foreground">お召し上がりになられる</div>
                </div>
                <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1 font-jp">
                  <span className="text-emerald-600 font-bold">✅ Chuẩn:</span>
                  <div className="text-foreground font-bold">おっしゃる / 言われる</div>
                  <div className="text-foreground font-bold">ご覧になる / 見られる</div>
                  <div className="text-foreground font-bold">召し上がる</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <Button size="sm" variant="outline" onClick={onClose}>Đóng (Esc)</Button>
        </div>
      </div>
    </Modal>
  );
}
