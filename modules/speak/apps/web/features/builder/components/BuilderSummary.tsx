"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BuilderResult } from "../services/builder-api";

export function BuilderSummary({
  results,
  onRestart,
  onToPlan,
}: {
  results: BuilderResult[];
  onRestart?: () => void;
  onToPlan?: () => void;
}) {
  const total = results.length;
  const ok = results.filter((r) => r.success).length;
  const acc = total ? Math.round((ok / total) * 100) : 0;
  const skills = Array.from(new Set(results.map((r) => r.focusSkill).filter(Boolean)));
  if (!total) return null;
  const grade =
    acc >= 90
      ? { text: "S", label: "Xuất sắc", stamp: "最高", color: "text-amber-500 border-amber-500 bg-amber-500/10" }
      : acc >= 75
      ? { text: "A", label: "Rất tốt", stamp: "上手", color: "text-emerald-600 border-emerald-600 bg-emerald-500/10" }
      : acc >= 50
      ? { text: "B", label: "Đạt yêu cầu", stamp: "合格", color: "text-sky-600 border-sky-600 bg-sky-500/10" }
      : { text: "C", label: "Cần rèn thêm", stamp: "頑張れ", color: "text-rose-600 border-rose-600 bg-rose-500/10" };
  return (
    <div className="p-6 md:p-8 rounded-3xl border border-border bg-card washi-texture shadow-lg space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold">Tổng kết buổi xây câu</h2>
          <p className="text-sm text-muted-foreground">{ok}/{total} câu thành công · {grade.label}</p>
        </div>
        <div className={cn("hanko-badge shrink-0 self-start sm:self-center px-4 py-2 rounded-2xl border-2 rotate-[-4deg] text-center shadow-sm", grade.color)}>
          <div className="text-[10px] font-extrabold tracking-widest uppercase">HANKO STAMP</div>
          <div className="text-sm font-black font-jp">{grade.stamp}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-muted/50 px-3 py-2"><p className="text-[11px] text-muted-foreground">Thành công</p><p className="text-sm font-extrabold">{ok}/{total}</p></div>
        <div className="rounded-xl bg-muted/50 px-3 py-2"><p className="text-[11px] text-muted-foreground">Kỹ năng đã luyện</p><p className="text-sm font-extrabold">{skills.length}</p></div>
        <div className="rounded-xl bg-muted/50 px-3 py-2"><p className="text-[11px] text-muted-foreground">Perfect</p><p className="text-sm font-extrabold">{results.filter((r) => r.isPerfect).length}</p></div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onRestart} className="flex-1 font-bold">Xây tiếp</Button>
        <Button onClick={onToPlan} variant="outline" className="flex-1 font-semibold">Về kế hoạch học</Button>
      </div>
    </div>
  );
}
