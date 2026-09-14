"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ear, Search, Volume2, Sparkles } from "lucide-react";
import { speakJapaneseText, stopWebSpeech } from "@/features/speaking/services/web-speech";
import { UniversalFurigana } from "@/components/japanese/UniversalFurigana";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const BC_TABLE: Array<{ type: string; ja: string; samples: string[]; when: string; register: string }> = [
  { type: "Ngạc nhiên", ja: "驚き", samples: ["へー", "えー", "マジで？", "そうなんだ"], when: "NPC kể chuyện bất ngờ", register: "Bạn bè" },
  { type: "Đồng cảm", ja: "共感", samples: ["確かに", "だよね", "大変だね", "それは最悪だね"], when: "NPC than vãn / khoe", register: "Cả hai" },
  { type: "Giữ mạch", ja: "継続", samples: ["うん", "うんうん", "はい", "なるほど"], when: "NPC đang kể dở, cần tín hiệu nghe", register: "はい cho công sở, うん cho bạn bè" },
  { type: "Đẩy chuyện", ja: "展開", samples: ["それで？", "で、どうしたの？", "その後は？"], when: "Muốn NPC kể tiếp", register: "Cả hai" },
  { type: "Chen lịch sự", ja: "割り込み", samples: ["すみません、ちょっとよろしいでしょうか", "ちょっと待って！"], when: "NPC nói dài, cần chen vào", register: "すみません〜 cho công sở" },
];

const ANTI_PATTERNS = [
  "うん × 5 liên tiếp → bị cap variety (xoay vòng ít nhất 3-4 loại)",
  "はい với bạn bè → nghe xa cách, dùng うん/へー/マジで",
  "うん・マジで với khách/sếp → thất lễ, dùng はい/なるほど/確かに",
  "Chen giữa chữ NPC → rude overlap 0 điểm timing, hãy đợi pause",
  "Im lặng quá 1 window → miss, NPC cụt hứng",
];

export function AizuchiCheatsheetModal({ isOpen, onClose }: Props) {
  const [q, setQ] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const filtered = BC_TABLE.filter(
    (r) => !q || (r.type + r.ja + r.samples.join(" ") + r.when).toLowerCase().includes(q.toLowerCase())
  );

  const playSample = (s: string) => {
    try {
      if (playing === s) {
        stopWebSpeech();
        setPlaying(null);
        return;
      }
      setPlaying(s);
      speakJapaneseText(s, { rate: 1.0, onEnd: () => setPlaying(null), onError: () => setPlaying(null) });
    } catch {}
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bảng Aizuchi Mẫu 相づち早見表" description="Chêm gì, khi nào, với ai — bấm để nghe mẫu" className="max-w-2xl">
      <div className="flex flex-col gap-4 overflow-y-auto">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm: ngạc nhiên, đồng cảm, chen ngang..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="flex flex-col gap-2">
          {filtered.map((r) => (
            <div key={r.type} className="rounded-2xl border border-border/80 bg-card p-3.5">
              <div className="flex items-center gap-2">
                <Ear className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm font-bold">
                  {r.type} <span className="font-jp font-normal text-muted-foreground">{r.ja}</span>
                </p>
                <Badge variant="outline" size="sm" className="ml-auto text-[10px]">{r.register}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{r.when}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.samples.map((s) => (
                  <button
                    key={s}
                    onClick={() => playSample(s)}
                    className={cn(
                      "font-jp flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                      playing === s ? "border-primary bg-primary/15 text-primary" : "border-border hover:bg-muted/60"
                    )}
                  >
                    <Volume2 className="h-3 w-3" />{s}
                  </button>
                ))}
              </div>
              <div className="font-jp mt-1.5 text-xs text-muted-foreground">
                <UniversalFurigana text={r.samples[0]} fontSize="sm" />
              </div>
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
