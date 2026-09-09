"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  Brain,
  Repeat,
  Library,
  BookOpen,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  Award,
  Layers,
  Sparkles,
  ArrowRight,
  Flame,
  Clock,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import { KnowledgeStats, KnowledgeGapsResponse } from "@/lib/types";

export default function KnowledgeDashboardPage() {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [gapsData, setGapsData] = useState<KnowledgeGapsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKnowledgeData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [s, g] = await Promise.all([api.getKnowledgeStats(), api.getKnowledgeGaps()]);
      setStats(s);
      setGapsData(g);
    } catch (err: any) {
      setError(err?.message || "Không thể tải hồ sơ tri thức.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledgeData();
  }, []);

  return (
    <div className="min-h-screen bg-sumi-950 text-sumi-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sumi-800/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Hồ Sơ Tri Thức Tiếng Nhật
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  Adaptive Profile
                </span>
              </div>
              <p className="text-sm text-sumi-400">
                Theo dõi tiến trình tích lũy từ vựng, ngữ pháp và phân tích điểm mù ngôn ngữ từ bài đọc thực tế
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/immersion/review"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
            >
              <Repeat className="w-4 h-4" />
              Ôn tập Spaced Review ({stats?.review_due_count ?? 0})
            </Link>
            <Link
              href="/immersion/library"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-sumi-900 hover:bg-sumi-800 text-sumi-300 hover:text-white border border-sumi-800 transition-colors"
            >
              <Library className="w-4 h-4" /> Thư viện
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-sumi-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-400" />
            Đang phân tích hồ sơ tri thức...
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-torii-500/10 border border-torii-500/30 text-torii-300 text-sm">
            {error}
          </div>
        ) : stats ? (
          <>
            {/* Top Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-sumi-900/70 border border-sumi-800/80 space-y-1">
                <span className="text-xs text-sumi-400 block font-medium">Tổng từ vựng tích lũy</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white font-mono">{stats.total_vocabulary}</span>
                  <span className="text-xs text-emerald-400 font-mono">+{stats.recent_growth.vocab_added_week} tuần này</span>
                </div>
                <div className="text-[11px] text-sumi-500">Gặp qua bài báo & tin tức thực tế</div>
              </div>

              <div className="p-4 rounded-xl bg-sumi-900/70 border border-sumi-800/80 space-y-1">
                <span className="text-xs text-sumi-400 block font-medium">Đã đạt Thành thạo (Master)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-400 font-mono">{stats.mastered_vocabulary}</span>
                  <span className="text-xs text-sumi-400">/ {stats.total_vocabulary}</span>
                </div>
                <div className="text-[11px] text-sumi-500">Độ tin cậy &gt; 85% qua SRS</div>
              </div>

              <div className="p-4 rounded-xl bg-sumi-900/70 border border-sumi-800/80 space-y-1">
                <span className="text-xs text-sumi-400 block font-medium">Collocations & Cụm từ</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-amber-400 font-mono">{stats.total_expressions}</span>
                  <span className="text-xs text-sumi-400 font-mono">cụm</span>
                </div>
                <div className="text-[11px] text-sumi-500">Cụm từ chuẩn ngữ cảnh người Nhật</div>
              </div>

              <div className="p-4 rounded-xl bg-sumi-900/70 border border-sumi-800/80 space-y-1">
                <span className="text-xs text-sumi-400 block font-medium">Mẫu Ngữ pháp đã nạp</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-indigo-400 font-mono">{stats.total_grammar}</span>
                  <span className="text-xs text-sumi-400 font-mono">mẫu</span>
                </div>
                <div className="text-[11px] text-sumi-500">Được trích xuất từ câu văn đọc</div>
              </div>
            </div>

            {/* Middle Section: Mastery Breakdown & Recall vs Recognition */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: Status Distribution */}
              <div className="p-6 rounded-2xl bg-sumi-900/80 border border-sumi-800 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    Phân bố Trạng thái Từ vựng
                  </h3>
                  <span className="text-xs text-sumi-400 font-mono">TB: {stats.avg_vocabulary_mastery}%</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-emerald-400 font-medium">Thành thạo (Mastered)</span>
                      <span className="font-mono text-sumi-300">
                        {stats.mastered_vocabulary} ({stats.total_vocabulary ? Math.round((stats.mastered_vocabulary / stats.total_vocabulary) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-sumi-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${stats.total_vocabulary ? (stats.mastered_vocabulary / stats.total_vocabulary) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-blue-400 font-medium">Quen thuộc (Familiar)</span>
                      <span className="font-mono text-sumi-300">
                        {stats.familiar_vocabulary} ({stats.total_vocabulary ? Math.round((stats.familiar_vocabulary / stats.total_vocabulary) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-sumi-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${stats.total_vocabulary ? (stats.familiar_vocabulary / stats.total_vocabulary) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-amber-400 font-medium">Đang học & Cần củng cố (Learning)</span>
                      <span className="font-mono text-sumi-300">
                        {stats.learning_vocabulary} ({stats.total_vocabulary ? Math.round((stats.learning_vocabulary / stats.total_vocabulary) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-sumi-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${stats.total_vocabulary ? (stats.learning_vocabulary / stats.total_vocabulary) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-sumi-950/70 border border-sumi-800 text-xs text-sumi-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Thẻ sẵn sàng ôn tập Spaced Review ngay bây giờ:</span>
                  </div>
                  <span className="font-bold font-mono text-emerald-400 text-sm">{stats.review_due_count} thẻ</span>
                </div>
              </div>

              {/* Card 2: Recognition vs Recall Active Gap */}
              <div className="p-6 rounded-2xl bg-sumi-900/80 border border-sumi-800 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Brain className="w-4 h-4 text-cyan-400" />
                    Năng Lực Nhận Diện vs Gợi Nhớ Chủ Động
                  </h3>
                  <span className="text-xs text-cyan-400 font-mono">Cognitive Balance</span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-blue-400 font-semibold">Khả năng Nhận diện khi đọc (Passive Reading)</span>
                      <span className="font-mono text-white font-bold">{stats.recognition_vs_recall.recognition}%</span>
                    </div>
                    <div className="h-3 w-full bg-sumi-950 rounded-full overflow-hidden p-0.5 border border-sumi-800">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, stats.recognition_vs_recall.recognition))}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-400 font-semibold">Khả năng Gợi nhớ chủ động (Active Recall)</span>
                      <span className="font-mono text-white font-bold">{stats.recognition_vs_recall.recall}%</span>
                    </div>
                    <div className="h-3 w-full bg-sumi-950 rounded-full overflow-hidden p-0.5 border border-sumi-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, stats.recognition_vs_recall.recall))}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-200 leading-relaxed">
                  💡 <strong>Khoảng chênh lệch (Gap):</strong>{" "}
                  {Math.round(Math.abs(stats.recognition_vs_recall.recognition - stats.recognition_vs_recall.recall))}%
                  . Chênh lệch giữa nhận diện mặt chữ và khả năng nhớ ra từ khi không có gợi ý là điều hoàn toàn tự nhiên.
                  Hãy làm các bài tập dạng Active Recall (Điền từ vào chỗ trống) để thu hẹp khoảng cách này.
                </div>
              </div>
            </div>

            {/* Bottom Section: Linguistic Blindspots & Knowledge Gaps */}
            {gapsData && (
              <div className="p-6 rounded-2xl bg-sumi-900/80 border border-sumi-800 space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      Phát Hiện Điểm Mù Ngôn Ngữ & Kiến Nghị Cải Thiện
                    </h3>
                  </div>
                  <p className="text-xs text-sumi-400 mt-1">{gapsData.summary}</p>
                </div>

                {gapsData.gaps.length === 0 ? (
                  <div className="p-6 text-center bg-sumi-950/50 rounded-xl border border-sumi-800/60">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <div className="text-sm font-semibold text-white">Chưa phát hiện điểm mù nào đáng kể</div>
                    <div className="text-xs text-sumi-400 mt-0.5">Tiếp tục đọc thêm bài viết để AI có thêm mẫu dữ liệu tương tác.</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {gapsData.gaps.map((gap, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-sumi-950/80 border border-sumi-800/90 space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            {gap.type}
                          </span>
                          <h4 className="text-sm font-bold text-white">{gap.title}</h4>
                          <p className="text-xs text-sumi-300 leading-relaxed">{gap.description}</p>

                          {gap.examples && gap.examples.length > 0 && (
                            <div className="space-y-1 pt-1">
                              <span className="text-[10px] text-sumi-500 uppercase font-semibold">Ví dụ cụ thể:</span>
                              <div className="flex flex-wrap gap-1">
                                {gap.examples.map((ex, i) => (
                                  <span key={i} className="text-xs px-2 py-0.5 rounded bg-sumi-900 text-amber-300 border border-sumi-800">
                                    {ex}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-sumi-800/60 text-xs text-emerald-400/90 leading-relaxed font-medium">
                          🎯 <strong>Khuyên dùng:</strong> {gap.suggested_action}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
