"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Languages, Search, Volume2, Sparkles } from "lucide-react";
import { speakVietnameseText, speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const VIETGLISH_TABLE: Array<{ pitfall: string; ja: string; example_vi: string; bad: string; good: string; hint: string }> = [
  { pitfall: "Lạm dụng 私は", ja: "主語省略", example_vi: "Tôi đi làm, tôi ăn trưa, tôi về nhà", bad: "私は会社に行きます、私は昼ごはんを食べます", good: "会社に行って、昼ごはん食べて帰るよ", hint: "Lược chủ ngữ, nối て-chain" },
  { pitfall: "SVO kiểu Việt", ja: "語順", example_vi: "Tôi ăn cơm (SVO) → Tôi cơm ăn (SOV)", bad: "食べます ご飯を", good: "ご飯を食べます", hint: "を/に trước động từ — đảo về SOV" },
  { pitfall: "Thiếu trợ từ", ja: "助詞", example_vi: "Bạn đi đâu?", bad: "友達行くどこ", good: "友達はどこに行くの？", hint: "は/が/を/に/で không được bỏ" },
  { pitfall: "です thừa với bạn", ja: "敬体", example_vi: "Ê hôm qua vui ghê!", bad: "昨日はとても楽しかったです", good: "昨日めっちゃ楽しかったよ", hint: "Bạn bè → thể thường + よ/な/じゃん" },
  { pitfall: "Dịch逐字 rồi/mà/thì", ja: "直訳", example_vi: "Xong rồi thì đi nhé", bad: "終わりました、そして行きます", good: "終わったら行こう", hint: "rồi→たら/て, mà→けど/ので" },
  { pitfall: "Counters sai", ja: "助数詞", example_vi: "2 người, 3 cái bàn", bad: "二つ人", good: "二人、三つの机", hint: "人/つ/本/枚/台 đúng counters" },
];

export function InterpretCheatsheetModal({ isOpen, onClose }: Props) {
  const [q, setQ] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const filtered = VIETGLISH_TABLE.filter(
    (r) => !q || (r.pitfall + r.ja + r.example_vi + r.bad + r.good).toLowerCase().includes(q.toLowerCase())
  );

  const playJa = (s: string) => {
    try {
      if (playing === s) {
        stopWebSpeech();
        setPlaying(null);
        return;
      }
      setPlaying(s);
      speakJapaneseText(s, { rate: 0.95, onEnd: () => setPlaying(null), onError: () => setPlaying(null) });
    } catch {}
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bảng Bẫy Vietglish 越日直訳バグ表" description="Lỗi dịch逐字 người Việt hay mắc — bấm để nghe bản đúng" className="max-w-2xl">
      <div className="flex flex-col gap-4 overflow-y-auto">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm: 私は, SVO, trợ từ..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="flex flex-col gap-2">
          {filtered.map((r) => (
            <div key={r.pitfall} className="rounded-2xl border border-border/80 bg-card p-3.5">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm font-bold">
                  {r.pitfall} <span className="font-jp font-normal text-muted-foreground">{r.ja}</span>
                </p>
                <Badge variant="outline" size="sm" className="ml-auto text-[10px]">Vietglish</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">VD Việt: {r.example_vi}</p>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-xl bg-red-500/5 border border-red-500/20 px-3 py-2">
                  <p className="text-[11px] font-bold text-red-600">✗ Sai kiểu Việt</p>
                  <UniversalFurigana text={r.bad} fontSize="sm" />
                </div>
                <button onClick={() => playJa(r.good)} className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 px-3 py-2 text-left hover:bg-emerald-500/10 transition-colors">
                  <p className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                    <Volume2 className={cn("h-3 w-3", playing === r.good && "animate-pulse")} /> ✓ Bản xứ (bấm nghe)
                  </p>
                  <UniversalFurigana text={r.good} fontSize="sm" />
                </button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary shrink-0" />{r.hint}
              </p>
            </div>
          ))}
          {filtered.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Không tìm thấy</p>}
        </div>
        <Button onClick={onClose} className="w-full font-bold">Đóng</Button>
      </div>
    </Modal>
  );
}
