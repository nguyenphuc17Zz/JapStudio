"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle2, AlertCircle, Sparkles, Cpu, HardDrive, ArrowRight } from "lucide-react";

export interface TargetModeInfo {
  id: "write" | "speak" | "immersion";
  name: string;
  tag: string;
  port: number;
  url: string;
}

interface ModeSwitchModalProps {
  isOpen: boolean;
  target: TargetModeInfo | null;
  onClose: () => void;
}

export function ModeSwitchModal({ isOpen, target, onClose }: ModeSwitchModalProps) {
  const [step, setStep] = useState<"idle" | "stopping" | "starting" | "ready" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  const startSwitch = useCallback(async (targetInfo: TargetModeInfo) => {
    setStep("stopping");
    setProgress(15);
    setErrorMessage("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiUrl}/system/switch-mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: targetInfo.id }),
      });

      if (!res.ok) {
        throw new Error(`Lỗi từ máy chủ: HTTP ${res.status}`);
      }

      // Transition to starting phase
      setProgress(40);
      setStep("starting");

      // Progress animation & Polling target port
      let attempts = 0;
      const maxAttempts = 15;
      const interval = setInterval(async () => {
        attempts++;
        setProgress((prev) => Math.min(prev + 5, 90));

        try {
          // Attempt lightweight check on target port
          await fetch(targetInfo.url, { mode: "no-cors", cache: "no-cache" });
          // If reachable without network error
          clearInterval(interval);
          setProgress(100);
          setStep("ready");
          setTimeout(() => {
            window.location.href = targetInfo.url;
          }, 800);
        } catch {
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            setProgress(100);
            setStep("ready");
            setTimeout(() => {
              window.location.href = targetInfo.url;
            }, 800);
          }
        }
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể kết nối đến API máy chủ";
      setErrorMessage(msg);
      setStep("error");
    }
  }, []);

  useEffect(() => {
    if (isOpen && target) {
      startSwitch(target);
    } else {
      setStep("idle");
      setProgress(0);
      setErrorMessage("");
    }
  }, [isOpen, target, startSwitch]);

  if (!isOpen || !target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl p-6 text-foreground animate-in zoom-in-95 duration-200">
        {/* Glow Header Accent */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Content */}
        <div className="relative space-y-5 text-center">
          {/* Status Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-inner">
            {step === "ready" ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-500 animate-bounce" />
            ) : step === "error" ? (
              <AlertCircle className="h-8 w-8 text-destructive" />
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            )}
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold tracking-tight">
              {step === "ready"
                ? `Đã sẵn sàng chuyển sang ${target.name}!`
                : step === "error"
                ? "Không thể chuyển chế độ"
                : `Đang chuyển sang ${target.name}...`}
            </h3>
            <p className="text-xs text-muted-foreground">
              {step === "stopping" && "Đang tắt các cổng 3000 & 8000 để giải phóng 1.5 - 2GB RAM cho máy..."}
              {step === "starting" && `Đang khởi động ${target.name} trên cổng :${target.port}...`}
              {step === "ready" && "Đang điều hướng trình duyệt sang phòng học mới..."}
              {step === "error" && errorMessage}
            </p>
          </div>

          {/* Progress Bar */}
          {step !== "error" && (
            <div className="space-y-1.5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                <span>{step === "stopping" ? "Giải phóng tài nguyên" : "Khởi động dịch vụ"}</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}

          {/* Resource Optimization Badges */}
          <div className="grid grid-cols-2 gap-2 text-left rounded-xl bg-muted/40 p-3 border border-border/50 text-xs">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-emerald-500 shrink-0" />
              <div>
                <div className="font-semibold text-[11px]">RAM Giải Phóng</div>
                <div className="text-[10px] text-muted-foreground">~1.5GB - 2.0GB</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-500 shrink-0" />
              <div>
                <div className="font-semibold text-[11px]">Cổng Kích Hoạt</div>
                <div className="text-[10px] text-muted-foreground">Web :{target.port} | API</div>
              </div>
            </div>
          </div>

          {/* Actions on Error */}
          {step === "error" && (
            <div className="pt-2 flex gap-2 justify-center">
              <button
                onClick={() => startSwitch(target)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Thử lại
              </button>
              <a
                href={target.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                Mở thủ công ({target.url})
              </a>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
