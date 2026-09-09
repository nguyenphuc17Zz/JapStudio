"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { SourceForm } from "@/components/sources/SourceForm";
import { AutoDetectModal } from "@/components/sources/AutoDetectModal";
import { ChevronLeft, Plus, Sparkles } from "lucide-react";

export default function NewSourcePage() {
  const [isDetectOpen, setIsDetectOpen] = useState(false);
  const [prefillData, setPrefillData] = useState<any>(null);

  const handleApplyDetected = (detected: any) => {
    setPrefillData(detected);
  };

  return (
    <div className="min-h-screen flex flex-col bg-sumi-950 text-sumi-100">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-sumi-400">
          <Link href="/sources" className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span>Quay lại Quản lý Nguồn</span>
          </Link>
          <span>/</span>
          <span className="text-slate-700 dark:text-sumi-200">Đăng ký nguồn mới</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-torii-500/20 border border-torii-500/30 flex items-center justify-center text-torii-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Đăng Ký Nguồn Nội Dung Mới
              </h1>
              <p className="text-xs text-slate-500 dark:text-sumi-400">
                Định cấu hình điểm cuối, giao thức Universal Connector, và thông tin xác thực an toàn.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDetectOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all self-start sm:self-auto"
          >
            <Sparkles className="w-4 h-4" />
            <span>Tự Động Phát Hiện (Auto-Detect)</span>
          </button>
        </div>

        {/* Source Form */}
        <SourceForm isEdit={false} prefillData={prefillData} />
      </main>

      <AutoDetectModal
        isOpen={isDetectOpen}
        onClose={() => setIsDetectOpen(false)}
        onApplyDetected={handleApplyDetected}
      />
    </div>
  );
}
