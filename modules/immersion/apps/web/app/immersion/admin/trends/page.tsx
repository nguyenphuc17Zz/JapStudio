"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Flame,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api";
import { AdminTrendsResponse, AdminTrendItem } from "@/lib/types";
import { notify } from "@/components/ui";

export default function AdminTrendsPage() {
  const [data, setData] = useState<AdminTrendsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchTrends = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAdminTrends();
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh sách xu hướng quản trị.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  const handleToggleModeration = async (topicId: number, currentStatus: string) => {
    try {
      setUpdatingId(topicId);
      const newStatus = currentStatus === "VISIBLE" ? "HIDDEN" : "VISIBLE";
      await api.moderateTopic(topicId, newStatus);
      if (data) {
        setData({
          ...data,
          trends: data.trends.map((t) =>
            t.topic_id === topicId ? { ...t, moderation_status: newStatus } : t
          ),
        });
      }
      notify.success(`Đã cập nhật trạng thái kiểm duyệt thành: ${newStatus === "VISIBLE" ? "Hiện" : "Ẩn"}`);
    } catch (err: any) {
      notify.error(err?.message || "Không thể cập nhật trạng thái kiểm duyệt.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-sumi-950 text-sumi-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sumi-800/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Quản Trị Xu Hướng & Phân Cụm (Admin Trends)
              </h1>
              <p className="text-xs text-sumi-400">
                Theo dõi điểm số xu hướng, độ đa dạng nguồn và kiểm duyệt hiển thị các chủ đề tiếng Nhật
              </p>
            </div>
          </div>

          <button
            onClick={fetchTrends}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sumi-800 hover:bg-sumi-700 text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Làm mới
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-sumi-400">Đang tải bảng theo dõi xu hướng...</div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-torii-500/10 border border-torii-500/30 text-torii-300 text-xs">
            {error}
          </div>
        ) : data ? (
          <div className="bg-sumi-900/80 border border-sumi-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-sumi-950 text-sumi-400 border-b border-sumi-800 font-mono uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Chủ đề (Topic)</th>
                    <th className="py-3.5 px-4">Danh mục</th>
                    <th className="py-3.5 px-4 text-center">Trend Score</th>
                    <th className="py-3.5 px-4 text-center">Momentum</th>
                    <th className="py-3.5 px-4 text-center">Số bài</th>
                    <th className="py-3.5 px-4 text-center">Đa dạng nguồn</th>
                    <th className="py-3.5 px-4 text-center">Vòng đời</th>
                    <th className="py-3.5 px-4 text-center">Kiểm duyệt</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sumi-800/60">
                  {data.trends.map((item) => (
                    <tr key={item.topic_id} className="hover:bg-sumi-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{item.name}</div>
                        <div className="text-[10px] text-sumi-500 font-mono">{item.slug}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-mono uppercase text-[10px] bg-sumi-800 text-sumi-300">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-orange-400">
                        {item.trend_score}
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-emerald-400">
                        +{Math.round(item.momentum)}%
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-sumi-300">
                        {item.volume}
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-cyan-400">
                        {item.source_diversity}%
                      </td>

                      <td className="py-3 px-4 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === "PEAK"
                            ? "bg-torii-500/20 text-torii-300"
                            : item.status === "RISING"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-blue-500/20 text-blue-300"
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.moderation_status === "VISIBLE"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-sumi-800 text-sumi-400"
                        }`}>
                          {item.moderation_status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        <Link
                          href={`/immersion/topics/${item.slug}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sumi-800 hover:bg-sumi-700 text-sumi-200 transition-colors"
                        >
                          <Eye className="w-3 h-3" /> Xem
                        </Link>
                        <button
                          disabled={updatingId === item.topic_id}
                          onClick={() => handleToggleModeration(item.topic_id, item.moderation_status)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sumi-800 hover:bg-torii-500/20 hover:text-torii-300 text-sumi-300 transition-colors"
                        >
                          {item.moderation_status === "VISIBLE" ? (
                            <>
                              <EyeOff className="w-3 h-3" /> Ẩn
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" /> Hiện
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
