import React from "react";
import { SourceStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: SourceStatus;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
  const configs: Record<SourceStatus, { label: string; bg: string; text: string; dot: string }> = {
    active: {
      label: "Hoạt động",
      bg: "bg-emerald-500/10 border-emerald-500/30",
      text: "text-emerald-400",
      dot: "bg-emerald-400",
    },
    paused: {
      label: "Tạm dừng",
      bg: "bg-amber-500/10 border-amber-500/30",
      text: "text-amber-400",
      dot: "bg-amber-400",
    },
    error: {
      label: "Lỗi kết nối",
      bg: "bg-rose-500/10 border-rose-500/30",
      text: "text-rose-400",
      dot: "bg-rose-400 animate-ping",
    },
    disabled: {
      label: "Vô hiệu",
      bg: "bg-slate-100 dark:bg-sumi-700/40 border-slate-300 dark:border-sumi-600",
      text: "text-slate-500 dark:text-sumi-400",
      dot: "bg-slate-400 dark:bg-sumi-500",
    },
  };

  const config = configs[status] || configs.disabled;
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs font-medium";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${config.text} ${padding}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
