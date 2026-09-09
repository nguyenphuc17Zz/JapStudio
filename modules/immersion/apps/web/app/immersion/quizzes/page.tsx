"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Brain,
  Layers,
  Award,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Eye,
  Search,
  Filter,
  BarChart3,
  BookOpen,
} from "lucide-react";
import { api } from "@/lib/api";
import { QuizAdminStats, ReadingQuiz, QuizAdminItem } from "@/lib/types";
import { notify, confirmDialog } from "@/components/ui";

export default function AdminQuizzesPage() {
  const [stats, setStats] = useState<QuizAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Inspect Modal
  const [inspectQuiz, setInspectQuiz] = useState<ReadingQuiz | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Regenerate state
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getQuizAdminStats();
      setStats(data);
    } catch (err: any) {
      setError(err?.message || "Không thể tải số liệu thống kê Quiz.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleInspect = async (quizId: number) => {
    try {
      setInspectLoading(true);
      const q = await api.getQuizById(quizId);
      setInspectQuiz(q);
    } catch (err: any) {
      notify.error("Lỗi khi tải chi tiết quiz: " + err?.message);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleRegenerate = async (contentId: number) => {
    const confirmed = await confirmDialog({
      title: "Yêu cầu AI sinh lại Quiz",
      message: "Bạn có chắc chắn muốn yêu cầu AI tạo mới toàn bộ câu hỏi kiểm tra cho bài đọc này không?",
      variant: "warning",
      confirmText: "Sinh lại Quiz",
    });
    if (!confirmed) return;

    const regenToast = notify.loading("AI đang phân tích bài viết và tạo bộ câu hỏi mới...");
    try {
      setRegeneratingId(contentId);
      await api.getOrCreateQuiz(contentId, true);
      notify.update(regenToast, {
        type: "success",
        message: "Đã sinh lại quiz thành công!",
        duration: 4000,
      });
      fetchStats();
    } catch (err: any) {
      notify.update(regenToast, {
        type: "error",
        message: "Lỗi khi sinh lại quiz: " + err?.message,
        duration: 5000,
      });
    } finally {
      setRegeneratingId(null);
    }
  };

  const filteredQuizzes = (stats?.quizzes_list || []).filter((q) => {
    const matchesSearch =
      q.content_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.id.toString().includes(searchQuery);
    const matchesDiff = difficultyFilter === "ALL" || q.difficulty === difficultyFilter;
    const matchesStatus = statusFilter === "ALL" || q.status === statusFilter;
    return matchesSearch && matchesDiff && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Brain className="w-4 h-4" /> Phase 6: Assessment Studio
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Quản Trị Hệ Thống Đọc Hiểu & AI Quiz
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Giám sát chất lượng bộ câu hỏi tự động sinh, tỷ lệ chính xác của học viên và độ căn cứ bài viết.
            </p>
          </div>

          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Làm mới
          </button>
        </div>

        {/* KPI Metrics Grid */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Tổng số Quiz</span>
                <Brain className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{stats.total_quizzes}</div>
              <div className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {stats.ready_quizzes} Sẵn sàng
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Điểm Chất Lượng TB</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-extrabold text-amber-300">
                {stats.avg_quality_score}/100
              </div>
              <div className="text-xs text-zinc-500">Đạt chuẩn sư phạm & căn cứ</div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Tổng Lượt Làm Bài</span>
                <Layers className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-3xl font-extrabold text-white">{stats.total_attempts}</div>
              <div className="text-xs text-zinc-400">
                {stats.completed_attempts} lượt hoàn thành
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Độ Chính Xác TB</span>
                <BarChart3 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-emerald-400">
                {stats.avg_accuracy_percentage}%
              </div>
              <div className="text-xs text-zinc-500">Toàn bộ học viên</div>
            </div>
          </div>
        )}

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/80">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề bài đọc hoặc ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
            >
              <option value="ALL">Mọi độ khó</option>
              <option value="EASY">EASY</option>
              <option value="STANDARD">STANDARD</option>
              <option value="CHALLENGING">CHALLENGING</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
            >
              <option value="ALL">Mọi trạng thái</option>
              <option value="READY">READY</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
        </div>

        {/* Quizzes Table */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">ID / Phiên bản</th>
                  <th className="py-3.5 px-4">Bài Đọc</th>
                  <th className="py-3.5 px-4">Độ Khó</th>
                  <th className="py-3.5 px-4">Số Câu</th>
                  <th className="py-3.5 px-4">Chất Lượng</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredQuizzes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500">
                      Chưa có bài quiz nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredQuizzes.map((q) => (
                    <tr key={q.id} className="hover:bg-zinc-850/50 transition">
                      <td className="py-3.5 px-4 font-mono text-zinc-400">
                        #{q.id} <span className="text-zinc-600">(v{q.quiz_version})</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate font-medium text-white">
                        <Link
                          href={`/immersion/content/${q.content_id}`}
                          className="hover:text-indigo-400 transition"
                        >
                          {q.content_title}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-mono">
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">{q.question_count} câu</td>
                      <td className="py-3.5 px-4">
                        <span className="text-amber-400 font-semibold font-mono">
                          {q.quality_score}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            q.status === "READY"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleInspect(q.id)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition text-[11px] font-medium flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Chi tiết
                          </button>
                          <button
                            disabled={regeneratingId === q.content_id}
                            onClick={() => handleRegenerate(q.content_id)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 transition text-[11px] font-medium flex items-center gap-1"
                          >
                            <RotateCcw className={`w-3 h-3 ${regeneratingId === q.content_id ? "animate-spin" : ""}`} />
                            Sinh lại
                          </button>
                          <Link
                            href={`/immersion/content/${q.content_id}/quiz`}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition text-[11px] font-medium flex items-center gap-1"
                          >
                            Làm bài <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inspect Modal */}
        {inspectQuiz && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Kiểm Tra Dữ Liệu Quiz #{inspectQuiz.id}</h3>
                  <p className="text-xs text-zinc-400">
                    Độ khó: {inspectQuiz.difficulty} &bull; Chất lượng: {inspectQuiz.quality_score}/100 &bull; v{inspectQuiz.quiz_version}
                  </p>
                </div>
                <button
                  onClick={() => setInspectQuiz(null)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white text-xs"
                >
                  Đóng
                </button>
              </div>

              <div className="space-y-4">
                {inspectQuiz.questions.map((q, idx) => (
                  <div key={q.id} className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800/80 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-300">Câu {idx + 1} ({q.skill_type})</span>
                      <span className="text-zinc-500">Dẫn chứng: {q.source_sentence_id || "Toàn bài"}</span>
                    </div>
                    <p className="font-medium text-white text-sm font-japanese">{q.prompt}</p>
                    {q.prompt_vi && <p className="text-zinc-400 italic">{q.prompt_vi}</p>}

                    <div className="space-y-1 pt-1">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={opt.id}
                          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800/60 flex items-center gap-2"
                        >
                          <span className="w-5 h-5 rounded-md bg-zinc-800 flex items-center justify-center font-mono text-[10px] text-zinc-400">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span className="font-japanese text-zinc-200">{opt.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
