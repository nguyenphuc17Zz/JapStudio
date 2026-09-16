"use client";

import React, { useState } from "react";
import { RampTaskSpec, RampVocabItem, RampAnswerAngle, RampSentenceFrame, RampSampleAnswer } from "@/services/ramp-api";
import {
  Sparkles,
  Volume2,
  BookOpen,
  Copy,
  Check,
  PlusCircle,
  Database,
  Lightbulb,
  Compass,
  Layers,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { soundFX } from "@/lib/sound-fx";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

interface RampScaffoldPanelProps {
  task: RampTaskSpec;
  supportLevel?: number;
  onRevealHint?: () => void;
  hintRevealed?: boolean;
  onInsertText?: (text: string) => void;
}

type TabKey = "all" | "angles" | "vocab" | "frames" | "samples";

export function RampScaffoldPanel({
  task,
  supportLevel = 3,
  onRevealHint,
  hintRevealed = true,
  onInsertText,
}: RampScaffoldPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showModelAnswer, setShowModelAnswer] = useState<boolean>(true);

  const scaffold = task.scaffold || ({} as any);

  const handlePlayText = (text: string) => {
    stopWebSpeech();
    soundFX.playFurin();
    speakJapaneseText(text);
  };

  const handleCopy = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    toast.success("Đã sao chép vào bộ nhớ tạm!");
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleInsert = (text: string) => {
    soundFX.playTaiko();
    if (onInsertText) {
      onInsertText(text);
      toast.success("Đã chèn vào ô phát ngôn!");
    } else {
      handleCopy(text, "quick");
    }
  };

  // Provenance Badge
  const source = task.source || "bank";

  // 1. Answer Angles (Fallback if not provided)
  const defaultAngles: RampAnswerAngle[] = [
    {
      title: "Góc nhìn 1: Bày tỏ ý kiến cá nhân",
      hint_jp: "〜と思います。なぜなら〜からです。",
      hint_vi: "Nêu quan điểm rõ ràng của bạn và giải thích lý do ngắn gọn.",
    },
    {
      title: "Góc nhìn 2: Kể kinh nghiệm / Thói quen",
      hint_jp: "普段は〜することが多いです。",
      hint_vi: "Chia sẻ trải nghiệm gần đây hoặc thói quen thường ngày của bạn.",
    },
    {
      title: "Góc nhìn 3: Đưa ra sở thích hoặc lựa chọn",
      hint_jp: "特に〜が好きで、よく〜します。",
      hint_vi: "Nói về điểm bạn yêu thích nhất và tần suất thực hiện.",
    },
  ];
  const answerAngles: RampAnswerAngle[] =
    scaffold.answer_angles && scaffold.answer_angles.length > 0
      ? scaffold.answer_angles
      : defaultAngles;

  // 2. Vocab Items (Fallback to keywords if vocab_items not present)
  const vocabList: RampVocabItem[] =
    scaffold.vocab_items && scaffold.vocab_items.length > 0
      ? scaffold.vocab_items
      : (scaffold.keywords || task.keywords_for_production || []).map((kw: string) => ({
          word: kw,
          meaning_vi: "Từ vựng trọng tâm",
        }));

  // 3. Sentence Frames (Fallback if not provided)
  const defaultFrames: RampSentenceFrame[] = [
    { pattern: "〜と思います", meaning_vi: "Tôi nghĩ rằng... (Bày tỏ quan điểm tự nhiên)" },
    { pattern: "なぜなら、〜からです", meaning_vi: "Bởi vì... (Bổ sung lý do thuyết phục)" },
    { pattern: "例えば、〜などがあります", meaning_vi: "Ví dụ như là... (Đưa dẫn chứng cụ thể)" },
    { pattern: "〜たり、〜たりします", meaning_vi: "Nào là... nào là... (Liệt kê hành động)" },
  ];
  const sentenceFrames: RampSentenceFrame[] =
    scaffold.sentence_frames && scaffold.sentence_frames.length > 0
      ? scaffold.sentence_frames
      : defaultFrames;

  // 4. Model Answers
  const sampleAnswers: RampSampleAnswer[] =
    scaffold.sample_answers && scaffold.sample_answers.length > 0
      ? scaffold.sample_answers
      : scaffold.example_response
      ? [
          {
            style: "polite",
            style_label: "Mẫu câu tham khảo",
            japanese: scaffold.example_response,
            vietnamese: scaffold.translation_reference || "Câu trả lời chuẩn tự nhiên theo ngữ cảnh",
          },
        ]
      : [];

  return (
    <div className="rounded-3xl border border-border/80 bg-card washi-texture shadow-xs flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header: AI Speaking Coach identity */}
      <div className="p-3.5 sm:p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-foreground">
                Sensei AI • Trợ Lý Gợi Ý
              </span>
              {source === "ai" ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="h-2.5 w-2.5" /> AI Dynamic
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-sky-500/15 border border-sky-500/30 text-[9px] font-bold text-sky-700 dark:text-sky-300">
                  <Database className="h-2.5 w-2.5" /> Thư viện chuẩn
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              Gợi ý ý tưởng, từ vựng và khung câu hỗ trợ bạn bật phản xạ
            </p>
          </div>
        </div>

        {/* Support Level Badge */}
        <Badge
          variant="outline"
          size="sm"
          className="text-[10px] font-semibold border-primary/30 text-primary bg-primary/5 shrink-0"
        >
          Coach Lv.{supportLevel}
        </Badge>
      </div>

      {/* Navigation Filter Pills */}
      <div className="px-3.5 py-2 border-b border-border/40 bg-muted/10 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={cn(
            "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0",
            activeTab === "all"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          Tất cả
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("angles")}
          className={cn(
            "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 flex items-center gap-1",
            activeTab === "angles"
              ? "bg-amber-500 text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Lightbulb className="h-3 w-3" /> Ý tưởng
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("vocab")}
          className={cn(
            "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 flex items-center gap-1",
            activeTab === "vocab"
              ? "bg-emerald-600 text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <BookOpen className="h-3 w-3" /> Từ vựng
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("frames")}
          className={cn(
            "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 flex items-center gap-1",
            activeTab === "frames"
              ? "bg-indigo-600 text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Layers className="h-3 w-3" /> Khung câu
        </button>
        {sampleAnswers.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("samples")}
            className={cn(
              "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 flex items-center gap-1",
              activeTab === "samples"
                ? "bg-purple-600 text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <Sparkles className="h-3 w-3" /> Câu mẫu
          </button>
        )}
      </div>

      {/* Body: Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-3 sm:p-4 space-y-3.5">
        {/* SECTION 1: Ý TƯỞNG TRẢ LỜI (ANSWER ANGLES) */}
        {(activeTab === "all" || activeTab === "angles") && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                Gợi Ý Hướng Trả Lời (Ideas):
              </span>
              <span className="text-[10px] text-muted-foreground">Chọn 1 góc nhìn</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {answerAngles.map((angle, idx) => (
                <div
                  key={idx}
                  className="p-2.5 sm:p-3 rounded-2xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/25 transition-all shadow-2xs space-y-1.5 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1">
                      <span className="h-4 w-4 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      {angle.title}
                    </span>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePlayText(angle.hint_jp)}
                        className="h-6 px-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs gap-1"
                        title="Nghe phát âm chuẩn Tokyo"
                      >
                        <Volume2 className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInsert(angle.hint_jp)}
                        className="h-6 px-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs gap-1"
                        title="Chèn mẫu câu vào ô nhập"
                      >
                        <PlusCircle className="h-3 w-3" />
                        <span className="text-[10px]">Chèn</span>
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-foreground font-jp leading-relaxed">
                    「<UniversalFurigana text={angle.hint_jp} />」
                  </div>
                  {angle.hint_vi && (
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      👉 {angle.hint_vi}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 2: TỪ VỰNG & CỤM TỪ TRỌNG TÂM (KEY VOCABULARY) */}
        {(activeTab === "all" || activeTab === "vocab") && vocabList.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Từ Vựng & Cụm Từ Hữu Ích:
              </span>
              <span className="text-[10px] text-muted-foreground">Loa để nghe, Click để chèn</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {vocabList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-card border border-border/80 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all shadow-2xs flex items-center justify-between gap-2 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-jp font-bold text-xs sm:text-sm text-foreground">
                      <UniversalFurigana text={item.word} />
                    </div>
                    {item.meaning_vi && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.meaning_vi}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePlayText(item.word)}
                      className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-emerald-600 transition-colors"
                      title="Nghe phát âm Tokyo"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsert(item.word)}
                      className="h-6 px-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-0.5 transition-colors"
                      title="Chèn từ này vào ô nói"
                    >
                      <PlusCircle className="h-3 w-3" />
                      <span>Chèn</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 3: KHUNG SƯỜN CÂU NỐI (SENTENCE FRAMES) */}
        {(activeTab === "all" || activeTab === "frames") && sentenceFrames.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-500" />
                Khung Sườn Câu & Liên Từ Nối:
              </span>
              <span className="text-[10px] text-muted-foreground">Tạo câu mượt mà</span>
            </div>

            <div className="space-y-1.5">
              {sentenceFrames.map((frame, idx) => (
                <div
                  key={idx}
                  className="p-2 sm:p-2.5 rounded-xl bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 transition-all flex items-center justify-between gap-2 shadow-2xs group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold font-jp text-foreground">
                      <UniversalFurigana text={frame.pattern} />
                    </div>
                    {frame.meaning_vi && (
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        {frame.meaning_vi}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePlayText(frame.pattern)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-indigo-600"
                      title="Nghe"
                    >
                      <Volume2 className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleInsert(frame.pattern)}
                      className="h-6 px-1.5 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 text-[10px] font-bold gap-0.5"
                      title="Chèn khung câu này"
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

        {/* SECTION 4: CÂU MẪU THAM KHẢO (MODEL ANSWERS) */}
        {(activeTab === "all" || activeTab === "samples") && sampleAnswers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                Câu Mẫu Tham Khảo (Model Answers):
              </span>
              <button
                type="button"
                onClick={() => setShowModelAnswer(!showModelAnswer)}
                className="text-[10px] text-purple-600 hover:underline flex items-center gap-0.5 font-semibold"
              >
                {showModelAnswer ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Thu gọn
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> Mở xem
                  </>
                )}
              </button>
            </div>

            {showModelAnswer && (
              <div className="space-y-2 animate-in fade-in duration-150">
                {sampleAnswers.map((sample, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/25 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        size="sm"
                        className="text-[10px] font-bold border-purple-500/30 text-purple-700 dark:text-purple-300 bg-purple-500/10"
                      >
                        {sample.style_label || (sample.style === "casual" ? "Thường ngày" : "Lịch sự")}
                      </Badge>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlayText(sample.japanese)}
                          className="h-6 px-1.5 text-purple-700 dark:text-purple-300 hover:bg-purple-500/15 text-xs gap-1"
                          title="Nghe phát âm Tokyo"
                        >
                          <Volume2 className="h-3 w-3" />
                          <span className="text-[10px]">Nghe</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(sample.japanese, `sample_${idx}`)}
                          className="h-6 px-1.5 text-muted-foreground hover:text-foreground text-xs gap-1"
                          title="Sao chép"
                        >
                          {copiedKey === `sample_${idx}` ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span className="text-[10px]">Chép</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInsert(sample.japanese)}
                          className="h-6 px-1.5 text-purple-700 dark:text-purple-300 hover:bg-purple-500/15 text-xs gap-1 font-bold"
                          title="Chèn toàn bộ câu mẫu"
                        >
                          <PlusCircle className="h-3 w-3" />
                          <span className="text-[10px]">Chèn</span>
                        </Button>
                      </div>
                    </div>

                    <div className="font-jp font-bold text-xs sm:text-sm text-foreground leading-relaxed">
                      「<UniversalFurigana text={sample.japanese} />」
                    </div>

                    {sample.vietnamese && (
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {sample.vietnamese}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
