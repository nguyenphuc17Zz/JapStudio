import React from "react";
import { Mic, PenTool, Globe, Home } from "lucide-react";

export const ModeSwitcher: React.FC = () => {
  return (
    <div className="grid grid-cols-2 gap-1.5 w-full p-1.5 bg-sumi-900/90 border border-sumi-800 rounded-xl backdrop-blur-md shadow-inner">
      <a
        href="http://localhost:3000"
        title="JapStudio Web Hub"
        className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium text-sumi-400 hover:text-sumi-100 hover:bg-sumi-800/60 transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Hub</span>
      </a>

      <a
        href="http://localhost:3000/dashboard"
        title="JapSpeak - Luyện Nói"
        className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium text-sumi-400 hover:text-sumi-100 hover:bg-sumi-800/60 transition-colors"
      >
        <Mic className="w-3.5 h-3.5 text-blue-400" />
        <span>Speak</span>
      </a>

      <a
        href="http://localhost:5173"
        title="JapWrite - Luyện Viết"
        className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium text-sumi-400 hover:text-sumi-100 hover:bg-sumi-800/60 transition-colors"
      >
        <PenTool className="w-3.5 h-3.5 text-emerald-400" />
        <span>Write</span>
      </a>

      <div
        title="JapImmersion - Đang chạy"
        className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold bg-torii-500/15 border border-torii-500/40 text-torii-400 shadow-[0_0_12px_rgba(230,57,70,0.25)]"
      >
        <Globe className="w-3.5 h-3.5 text-torii-400 animate-spin-slow" />
        <span>Immersion</span>
      </div>
    </div>
  );
};
