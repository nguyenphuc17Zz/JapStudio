import React from "react";
import { SourceCategory } from "@/lib/types";
import { Newspaper, Terminal, MessageSquare, Compass } from "lucide-react";

interface CategoryPillProps {
  category?: SourceCategory | string;
}

export const CategoryPill: React.FC<CategoryPillProps> = ({ category = "news" }) => {
  const catKey = (category || "news").toLowerCase();

  const meta: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    news: {
      label: "Tin tức",
      icon: <Newspaper className="w-3.5 h-3.5" />,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    },
    tech: {
      label: "Công nghệ",
      icon: <Terminal className="w-3.5 h-3.5" />,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    },
    social: {
      label: "Cộng đồng",
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    },
    culture: {
      label: "Văn hóa",
      icon: <Compass className="w-3.5 h-3.5" />,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    },
  };

  const current = meta[catKey] || {
    label: category,
    icon: <Compass className="w-3.5 h-3.5" />,
    color: "text-slate-500 dark:text-sumi-300 bg-slate-100 dark:bg-sumi-700/30 border-slate-200 dark:border-sumi-600",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${current.color}`}>
      {current.icon}
      {current.label}
    </span>
  );
};
