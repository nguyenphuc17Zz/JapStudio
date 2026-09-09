"use client";

import React from "react";
import { useTheme, Theme } from "@/context/ThemeContext";
import { Sun, Moon, Laptop } from "lucide-react";

interface ThemeSwitcherProps {
  compact?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ compact = false }) => {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const options: { value: Theme; label: string; icon: React.ReactNode; tooltip: string }[] = [
    {
      value: "light",
      label: "Sáng",
      icon: <Sun className="w-3.5 h-3.5" />,
      tooltip: "Giao diện sáng Clean Modern",
    },
    {
      value: "system",
      label: "Hệ thống",
      icon: <Laptop className="w-3.5 h-3.5" />,
      tooltip: "Theo thiết bị hệ điều hành",
    },
    {
      value: "dark",
      label: "Tối",
      icon: <Moon className="w-3.5 h-3.5" />,
      tooltip: "Giao diện tối Sumi Ink",
    },
  ];

  if (compact) {
    return (
      <button
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        className="p-1.5 rounded-lg text-sumi-400 hover:text-sumi-100 hover:bg-sumi-850/80 transition-colors border border-sumi-800"
        title={resolvedTheme === "dark" ? "Chuyển sang giao diện Sáng" : "Chuyển sang giao diện Tối"}
      >
        {resolvedTheme === "dark" ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-500" />
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center p-1 bg-sumi-900/90 border border-sumi-800 rounded-xl backdrop-blur-md shadow-inner gap-0.5 w-full">
      {options.map((opt) => {
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            title={opt.tooltip}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? "bg-sumi-800 text-sumi-100 shadow-sm font-semibold border border-sumi-700"
                : "text-sumi-400 hover:text-sumi-200 hover:bg-sumi-850/50"
            }`}
          >
            <span className={isActive ? (opt.value === "light" ? "text-amber-500" : opt.value === "dark" ? "text-indigo-400" : "text-sky-400") : ""}>
              {opt.icon}
            </span>
            <span className="text-[11px]">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
