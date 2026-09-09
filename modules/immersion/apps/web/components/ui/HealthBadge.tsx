import React from "react";
import { HealthStatus } from "@/lib/types";

interface HealthBadgeProps {
  status: HealthStatus | string;
  responseTimeMs?: number;
}

export const HealthBadge: React.FC<HealthBadgeProps> = ({ status, responseTimeMs }) => {
  const normalized = (status || "unknown").toLowerCase();

  const configs: Record<string, { label: string; text: string; bg: string; dot: string }> = {
    healthy: {
      label: "Healthy",
      text: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    },
    warning: {
      label: "Warning",
      text: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]",
    },
    degraded: {
      label: "Degraded",
      text: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]",
    },
    down: {
      label: "Down",
      text: "text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/20",
      dot: "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
    },
    error: {
      label: "Error",
      text: "text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/20",
      dot: "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
    },
    unknown: {
      label: "Unknown",
      text: "text-slate-500 dark:text-sumi-400",
      bg: "bg-slate-100 dark:bg-sumi-800/40 border-slate-200 dark:border-sumi-700",
      dot: "bg-slate-400 dark:bg-sumi-500",
    },
  };

  const config = configs[normalized] || configs.unknown;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${config.bg} ${config.text} px-2 py-0.5 text-xs font-mono`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
      {responseTimeMs !== undefined && responseTimeMs !== null && (
        <span className="text-[10px] opacity-75">({Math.round(responseTimeMs)}ms)</span>
      )}
    </span>
  );
};
