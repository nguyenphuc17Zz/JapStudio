"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Blocks, Search, Volume2, Sparkles } from "lucide-react";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SKILL_TABLE: Array<{ skill: string; ja: string; markers: string[]; example: string; tip: string }> = [
  { skill: "Nối て-chain", ja: "て形接続", markers: ["て", "で", "くて", "ちゃって"], example: "映画を見て、めっちゃ面白かったよ", tip: "Vて+V nối hành động, くて/で nối tính từ" },
  { skill: "Mệnh đề quan hệ", ja: "関係節", markers: ["昨日買った本", "駅前にできた店"], example: "昨日買った本が面白くて読んでる", tip: "Động từ thể thường + danh từ, không cần の" },
  { skill: "Điều kiện", ja: "条件", markers: ["たら", "ば", "なら"], example: "安かったら買うけど、高かったらやめとく", tip: "たら vạn năng, ば cho điều kiện chung" },
  { skill: "Danh từ hóa", ja: "名詞化", markers: ["ので", "わけ", "んです", "ため"], example: "会議が長いので疲れちゃった", tip: "ので lý do-kết quả, んです giải thích" },
  { skill: "Contraction", ja: "縮約", markers: ["てる", "ちゃう", "じゃん", "っけ"], example: "見てる、食べちゃった、知ってるじゃん", tip: "ている→てる, てしまう→ちゃう + sentence-end よ/な" },
];

const ANTI_PATTERNS = [
  "Câu cụt lủn 1 mệnh đề → thêm て/ので/relative clause",
  "私は mở đầu mọi câu → lược chủ ngữ như bản xứ",
"です/ます với bạn bè → thể thường + よ/な/じゃん",
  "Dịch逐字 trật tự Việt → đảo về SOV + trợ từ đúng",
  "Quên keywords → giữ ý trước, chau chuốt sau (coverage 35đ)",
];

export function BuilderCheatsheetModal({ isOpen, onClose }: Props) {
  const [q, setQ] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const filtered = SKILL_TABLE.filter(
    (r) => !q || (r.skill + r.ja + r.markers.join(" ") + r.example).toLowerCase().includes(q.toLowerCase())
  );

  const playSample = (s: string) => {
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
    <Modal isOpen={isOpen} onClose={onClose} title="Bảng Mẫu Nối Câu 文立て早見表" description="Markers nối theo kỹ năng — bấm để nghe mẫu" className="max-w-2xl">
      <div className="flex flex-col gap-4 overflow-y-auto">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm: て-chain, quan hệ, điều kiện..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="flex flex-col gap-2">
          {filtered.map((r) => (
            <div key={r.skill} className="rounded-2xl border border-border/80 bg-card p-3.5">
              <div className="flex items-center gap-2">
                <Blocks className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm font-bold">
                  {r.skill} <span className="font-jp font-normal text-muted-foreground">{r.ja}</span>
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.markers.map((m) => (
                  <Badge key={m} variant="outline" size="sm" className="font-jp text-xs">{m}</Badge>
                ))}
              </div>
              <button onClick={() => playSample(r.example)} className="mt-2 flex items-center gap-1.5 text-left text-xs text-primary hover:underline">
                <Volume2 className={cn("h-3.5 w-3.5 shrink-0", playing === r.example && "animate-pulse")} />
                <UniversalFurigana text={r.example} fontSize="sm" />
              </button>
              <p className="mt-1 text-xs text-muted-foreground">{r.tip}</p>
            </div>
          ))}
          {filtered.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Không tìm thấy</p>}
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5">
          <p className="flex items-center gap-1.5 text-sm font-bold text-amber-600">
            <Sparkles className="h-4 w-4" /> 5 bẫy trừ điểm
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">
            {ANTI_PATTERNS.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
        <Button onClick={onClose} className="w-full font-bold">Đóng</Button>
      </div>
    </Modal>
  );
}
