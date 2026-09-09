"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  BookOpen,
  Award,
  BarChart3,
  Layers,
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Flame,
  Globe,
  Tag,
  Hash,
  BrainCircuit,
  Lightbulb,
} from "lucide-react";
import { EnrichmentDetail, ReEnrichRequest } from "../../lib/types";
import { api } from "../../lib/api";

interface ContentEnrichmentModalProps {
  contentId: number | null;
  onClose: () => void;
}

export const ContentEnrichmentModal: React.FC<ContentEnrichmentModalProps> = ({
  contentId,
  onClose,
}) => {
  const [detail, setDetail] = useState<EnrichmentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "difficulty" | "vocab" | "grammar" | "sentences">("summary");
  const [reEnriching, setReEnriching] = useState(false);
  const [selectedTask, setSelectedTask] = useState("ALL");
  const [highlightedSentenceIndex, setHighlightedSentenceIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!contentId) return;
    loadDetail();
  }, [contentId]);

  const loadDetail = async () => {
    if (!contentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getContentEnrichment(contentId);
      setDetail(res);
    } catch (err: any) {
      setError(err.message || "Failed to load content intelligence data");
    } finally {
      setLoading(false);
    }
  };

  const handleReEnrich = async () => {
    if (!contentId) return;
    setReEnriching(true);
    setError(null);
    try {
      const res = await api.reEnrichContent(contentId, {
        task: selectedTask,
        force: true,
      });
      setDetail(res);
    } catch (err: any) {
      setError(err.message || "Re-enrichment failed");
    } finally {
      setReEnriching(false);
    }
  };

  if (!contentId) return null;

  const enrichment = detail?.enrichment;

  // JLPT level color mapping
  const getJlptBadgeColor = (level?: string) => {
    switch (level) {
      case "N5": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "N4": return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
      case "N3": return "bg-blue-500/20 text-blue-300 border-blue-500/40";
      case "N2": return "bg-purple-500/20 text-purple-300 border-purple-500/40";
      case "N1": return "bg-torii-500/20 text-torii-300 border-torii-500/40";
      case "N1+": return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      default: return "bg-sumi-800 text-sumi-300 border-sumi-700";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sumi-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-sumi-900 border border-sumi-750 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sumi-800 bg-sumi-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-kintsugi-500 to-amber-600 flex items-center justify-center shadow-lg shadow-kintsugi-500/20">
              <BrainCircuit className="w-5 h-5 text-sumi-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white truncate max-w-xl">
                  {detail?.title || "Phân Tích Trí Tuệ Nội Dung AI"}
                </h2>
                {enrichment && (
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getJlptBadgeColor(enrichment.estimated_jlpt)}`}>
                    {enrichment.estimated_jlpt} (Ước lượng)
                  </span>
                )}
                {enrichment?.learning_ready && (
                  <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Learning Ready ({enrichment.learning_readiness_score}%)
                  </span>
                )}
              </div>
              <p className="text-xs text-sumi-400 flex items-center gap-2 mt-0.5">
                <span>Nguồn: {detail?.source_name}</span>
                <span>•</span>
                <span className="truncate max-w-sm">{detail?.canonical_url}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Re-enrich task button */}
            <div className="flex items-center gap-1 bg-sumi-800/80 p-1 rounded-lg border border-sumi-700">
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="bg-transparent text-xs text-sumi-200 outline-none px-2 py-1"
                disabled={reEnriching}
              >
                <option value="ALL" className="bg-sumi-900">Toàn bộ (All Stages)</option>
                <option value="VOCABULARY" className="bg-sumi-900">Chỉ Từ vựng</option>
                <option value="GRAMMAR" className="bg-sumi-900">Chỉ Ngữ pháp</option>
                <option value="SUMMARY" className="bg-sumi-900">Chỉ Tóm tắt</option>
                <option value="DIFFICULTY" className="bg-sumi-900">Chỉ Độ khó JLPT</option>
              </select>

              <button
                onClick={handleReEnrich}
                disabled={reEnriching}
                className="flex items-center gap-1.5 px-3 py-1 bg-kintsugi-500 hover:bg-kintsugi-600 disabled:opacity-50 text-sumi-950 font-semibold text-xs rounded-md shadow transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reEnriching ? "animate-spin" : ""}`} />
                {reEnriching ? "Đang xử lý..." : "Re-Enrich"}
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-sumi-400 hover:text-white rounded-lg hover:bg-sumi-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-sumi-800 bg-sumi-950/20 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab("summary")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-medium transition-all ${
              activeTab === "summary"
                ? "border-kintsugi-400 text-kintsugi-400 bg-kintsugi-500/5"
                : "border-transparent text-sumi-400 hover:text-sumi-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Tóm tắt & Chủ đề
          </button>

          <button
            onClick={() => setActiveTab("difficulty")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-medium transition-all ${
              activeTab === "difficulty"
                ? "border-kintsugi-400 text-kintsugi-400 bg-kintsugi-500/5"
                : "border-transparent text-sumi-400 hover:text-sumi-200"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Độ khó & Đánh giá
          </button>

          <button
            onClick={() => setActiveTab("vocab")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-medium transition-all ${
              activeTab === "vocab"
                ? "border-kintsugi-400 text-kintsugi-400 bg-kintsugi-500/5"
                : "border-transparent text-sumi-400 hover:text-sumi-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Từ vựng chọn lọc ({detail?.vocabularies?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab("grammar")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-medium transition-all ${
              activeTab === "grammar"
                ? "border-kintsugi-400 text-kintsugi-400 bg-kintsugi-500/5"
                : "border-transparent text-sumi-400 hover:text-sumi-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Ngữ pháp & Cụm từ ({detail?.grammars?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab("sentences")}
            className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-medium transition-all ${
              activeTab === "sentences"
                ? "border-kintsugi-400 text-kintsugi-400 bg-kintsugi-500/5"
                : "border-transparent text-sumi-400 hover:text-sumi-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Văn bản gốc ({detail?.sentences?.length || 0} câu)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-sumi-400 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-kintsugi-400" />
              <p className="text-sm">Đang nạp phân tích trí tuệ nhân tạo...</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-torii-950/40 border border-torii-800 text-torii-300 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !enrichment && (
            <div className="text-center py-16 bg-sumi-950/30 rounded-xl border border-sumi-800 text-sumi-400">
              <Sparkles className="w-12 h-12 mx-auto text-sumi-600 mb-3" />
              <h3 className="text-base font-semibold text-white">Bài viết chưa được xử lý AI</h3>
              <p className="text-xs text-sumi-400 mt-1 mb-4">
                Bấm nút "Re-Enrich" bên trên để chạy pipeline phân tích nội dung tiếng Nhật ngay lập tức.
              </p>
            </div>
          )}

          {!loading && enrichment && (
            <>
              {/* TAB 1: SUMMARY & TOPICS */}
              {activeTab === "summary" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Micro Summary Callout */}
                  {enrichment.micro_summary && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-kintsugi-500/10 to-amber-500/5 border border-kintsugi-500/30">
                      <div className="flex items-center gap-2 text-kintsugi-400 text-xs font-semibold uppercase tracking-wider mb-1">
                        <Lightbulb className="w-4 h-4" />
                        Micro Summary (1 Câu Nòng Cốt)
                      </div>
                      <p className="text-base font-medium text-white font-serif leading-relaxed">
                        {enrichment.micro_summary}
                      </p>
                    </div>
                  )}

                  {/* Short Summary */}
                  {enrichment.short_summary && (
                    <div className="p-5 rounded-xl bg-sumi-950/40 border border-sumi-800">
                      <h4 className="text-xs font-semibold text-sumi-400 uppercase tracking-wider mb-2">
                        Tóm Tắt Tổng Thể (Short Summary)
                      </h4>
                      <p className="text-sm text-sumi-200 leading-relaxed">
                        {enrichment.short_summary}
                      </p>
                    </div>
                  )}

                  {/* Detailed Bullets */}
                  {enrichment.detailed_summary && enrichment.detailed_summary.length > 0 && (
                    <div className="p-5 rounded-xl bg-sumi-950/40 border border-sumi-800">
                      <h4 className="text-xs font-semibold text-sumi-400 uppercase tracking-wider mb-3">
                        Luận Điểm Chính (Structured Bullets)
                      </h4>
                      <ul className="space-y-2 text-sm text-sumi-200">
                        {enrichment.detailed_summary.map((bullet, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-kintsugi-400 mt-2 flex-shrink-0" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Classification & Topics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-sumi-950/40 border border-sumi-800 space-y-3">
                      <h4 className="text-xs font-semibold text-sumi-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-blue-400" />
                        Chủ Đề & Thể Loại
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2.5 py-1 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-semibold">
                          Chính: {enrichment.primary_topic}
                        </span>
                        {enrichment.secondary_topics?.map((topic, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-sumi-800 text-sumi-300 border border-sumi-700 text-xs">
                            {topic}
                          </span>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-sumi-800/80 flex items-center gap-3 text-xs text-sumi-400">
                        <span>Thể loại: <strong className="text-white">{enrichment.primary_type}</strong></span>
                        <span>•</span>
                        <span>Role: <strong className="text-white">{enrichment.content_role}</strong></span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-sumi-950/40 border border-sumi-800 space-y-3">
                      <h4 className="text-xs font-semibold text-sumi-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-emerald-400" />
                        Từ Khóa & Thực Thể (Entities)
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {enrichment.keywords?.map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
                            #{kw}
                          </span>
                        ))}
                      </div>
                      {enrichment.entities && enrichment.entities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-sumi-800/80">
                          {enrichment.entities.map((ent, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-sumi-850 text-sumi-300 border border-sumi-750 text-[11px]">
                              {ent.name} <span className="text-[10px] text-sumi-400">({ent.type})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DIFFICULTY & REGISTER */}
              {activeTab === "difficulty" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Multi-dimensional Difficulty Bars */}
                    <div className="p-5 rounded-xl bg-sumi-950/40 border border-sumi-800 space-y-4">
                      <h4 className="text-xs font-semibold text-sumi-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Chỉ Số Độ Khó Đa Chiều (1-10)</span>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold border ${getJlptBadgeColor(enrichment.estimated_jlpt)}`}>
                          JLPT: {enrichment.estimated_jlpt}
                        </span>
                      </h4>

                      <div className="space-y-3 pt-2">
                        {[
                          { label: "Tổng quan (Overall)", val: enrichment.overall_difficulty },
                          { label: "Từ vựng (Vocabulary)", val: enrichment.vocabulary_difficulty },
                          { label: "Chữ Hán (Kanji)", val: enrichment.kanji_difficulty },
                          { label: "Ngữ pháp (Grammar)", val: enrichment.grammar_difficulty },
                          { label: "Cấu trúc câu (Sentence Complexity)", val: enrichment.sentence_complexity },
                          { label: "Khái niệm tư duy (Conceptual)", val: enrichment.conceptual_difficulty },
                        ].map((dim, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-sumi-300">{dim.label}</span>
                              <span className="font-semibold text-kintsugi-400">{dim.val}/10</span>
                            </div>
                            <div className="w-full h-1.5 bg-sumi-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-kintsugi-400 rounded-full"
                                style={{ width: `${(dim.val / 10) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quality & Readiness */}
                    <div className="p-5 rounded-xl bg-sumi-950/40 border border-sumi-800 space-y-4">
                      <h4 className="text-xs font-semibold text-sumi-400 uppercase tracking-wider">
                        Chất Lượng & Mức Độ Sẵn Sàng (Readiness)
                      </h4>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="p-3.5 rounded-lg bg-sumi-900 border border-sumi-800">
                          <span className="text-[11px] text-sumi-400 block">Chất lượng nội dung</span>
                          <span className="text-2xl font-bold text-white mt-1 block">
                            {enrichment.quality_score}
                            <span className="text-xs text-sumi-400 font-normal">/100</span>
                          </span>
                        </div>

                        <div className="p-3.5 rounded-lg bg-sumi-900 border border-sumi-800">
                          <span className="text-[11px] text-sumi-400 block">Sẵn sàng học (Learning Ready)</span>
                          <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                            {enrichment.learning_readiness_score}
                            <span className="text-xs text-sumi-400 font-normal">/100</span>
                          </span>
                        </div>
                      </div>

                      {/* Register & Formality */}
                      <div className="pt-3 border-t border-sumi-800 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-sumi-400">Văn phong (Register):</span>
                          <span className="font-semibold text-white">{enrichment.register}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sumi-400">Trang trọng (Formality):</span>
                          <span className="text-sumi-200">{enrichment.formality_score}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sumi-400">Thân mật / Đời thường:</span>
                          <span className="text-sumi-200">{enrichment.casualness_score}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sumi-400">Slang / Ngôn ngữ mạng:</span>
                          <span className="text-sumi-200">{enrichment.internet_slang_score}%</span>
                        </div>
                      </div>

                      {enrichment.difficulty_reasons && enrichment.difficulty_reasons.length > 0 && (
                        <div className="pt-3 border-t border-sumi-800 space-y-1">
                          <span className="text-[11px] text-sumi-400 font-medium">Lý do nhận định độ khó:</span>
                          <ul className="text-xs text-sumi-300 space-y-1 pl-4 list-disc">
                            {enrichment.difficulty_reasons.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: HIGH-VALUE VOCABULARY */}
              {activeTab === "vocab" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs text-sumi-400">
                    <span>
                      Đã lọc trích xuất <strong>{detail.vocabularies.length}</strong> từ vựng giá trị cao (loại bỏ từ vụn vặt và ảo giác).
                    </span>
                    <span className="text-kintsugi-400">Sắp xếp theo độ ưu tiên học (Learning Priority)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {detail.vocabularies.map((vocab) => (
                      <div
                        key={vocab.id}
                        className="p-4 rounded-xl bg-sumi-950/50 border border-sumi-800 hover:border-kintsugi-500/40 transition-all flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <ruby className="text-xl font-bold text-white font-serif group-hover:text-kintsugi-300 transition-colors">
                                {vocab.surface_form}
                                <rt className="text-xs text-kintsugi-400 font-sans">{vocab.reading}</rt>
                              </ruby>
                              <span className="text-[11px] px-2 py-0.5 ml-2 rounded bg-sumi-800 text-sumi-300 border border-sumi-700">
                                {vocab.part_of_speech}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-xs font-bold text-kintsugi-400">
                                Priority {vocab.learning_priority}
                              </span>
                              <span className="text-[10px] text-sumi-400 block">Độ khó: {vocab.difficulty}/10</span>
                            </div>
                          </div>

                          <p className="text-xs font-medium text-sumi-200 mt-2.5 mb-2 bg-sumi-900/80 p-2 rounded-lg border border-sumi-800">
                            💡 <strong className="text-white">Nghĩa theo ngữ cảnh:</strong> {vocab.meaning_in_context}
                          </p>
                        </div>

                        {vocab.source_sentence_id && (
                          <button
                            onClick={() => {
                              const sent = detail.sentences.find(s => s.id === vocab.source_sentence_id);
                              if (sent) {
                                setHighlightedSentenceIndex(sent.sentence_index);
                                setActiveTab("sentences");
                              }
                            }}
                            className="mt-2 text-[11px] text-sumi-400 hover:text-kintsugi-300 flex items-center gap-1 transition-colors self-start"
                          >
                            <span>Xem câu chứa từ này trong văn bản</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: GRAMMAR & EXPRESSIONS */}
              {activeTab === "grammar" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Grammar Patterns */}
                  <div>
                    <h4 className="text-xs font-semibold text-sumi-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      Mẫu Ngữ Pháp Nhận Diện Được ({detail.grammars.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {detail.grammars.map((gram) => (
                        <div key={gram.id} className="p-4 rounded-xl bg-sumi-950/40 border border-sumi-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-base font-bold text-purple-300 font-serif">{gram.pattern}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              {gram.category}
                            </span>
                          </div>
                          <p className="text-xs text-sumi-200 bg-sumi-900/60 p-2 rounded border border-sumi-800">
                            {gram.meaning_in_context}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expressions / Collocations */}
                  {detail.expressions && detail.expressions.length > 0 && (
                    <div className="pt-4 border-t border-sumi-800">
                      <h4 className="text-xs font-semibold text-sumi-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        Cụm Diễn Đạt & Collocations ({detail.expressions.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {detail.expressions.map((expr) => (
                          <div key={expr.id} className="p-4 rounded-xl bg-sumi-950/40 border border-sumi-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-amber-300 font-serif">{expr.expression}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                {expr.type}
                              </span>
                            </div>
                            <p className="text-xs text-sumi-200 bg-sumi-900/60 p-2 rounded border border-sumi-800">
                              {expr.meaning_in_context}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: SENTENCES & ANCHORS */}
              {activeTab === "sentences" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs text-sumi-400">
                    <span>
                      Văn bản đã được phân đoạn thành <strong>{detail.sentences.length}</strong> câu với chỉ mục ký tự (Character Offsets).
                    </span>
                    {highlightedSentenceIndex && (
                      <button
                        onClick={() => setHighlightedSentenceIndex(null)}
                        className="text-kintsugi-400 hover:underline"
                      >
                        Bỏ highlight
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {detail.sentences.map((sent) => {
                      const isHighlighted = highlightedSentenceIndex === sent.sentence_index;
                      return (
                        <div
                          key={sent.id}
                          className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                            isHighlighted
                              ? "bg-kintsugi-500/15 border-kintsugi-500/50 shadow-lg shadow-kintsugi-500/10"
                              : "bg-sumi-950/30 border-sumi-800 hover:border-sumi-700"
                          }`}
                        >
                          <span className={`text-[11px] font-mono px-2 py-0.5 rounded flex-shrink-0 ${
                            isHighlighted ? "bg-kintsugi-500 text-sumi-950 font-bold" : "bg-sumi-800 text-sumi-400"
                          }`}>
                            #{sent.sentence_index}
                          </span>

                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-serif text-sumi-100 leading-relaxed">
                              {sent.text}
                            </p>
                            {sent.has_high_learning_value && (
                              <span className="inline-block text-[10px] text-kintsugi-400 font-sans">
                                ★ Câu có cấu trúc ngữ pháp và từ vựng phong phú
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-sumi-800 bg-sumi-950/60 text-xs text-sumi-400">
          <div className="flex items-center gap-4">
            {enrichment && (
              <>
                <span>Model: <strong className="text-sumi-200">{enrichment.model_name}</strong></span>
                <span>•</span>
                <span>Prompt: <strong className="text-sumi-200">{enrichment.prompt_version}</strong></span>
                <span>•</span>
                <span>Version: <strong className="text-sumi-200">v{enrichment.enrichment_version}</strong></span>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-sumi-800 hover:bg-sumi-700 text-white font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
