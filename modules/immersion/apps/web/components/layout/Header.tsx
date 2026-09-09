import React from "react";
import { Sparkles, Download } from "lucide-react";

interface HeaderProps {
  onOpenPresets?: () => void;
  onOpenImportExport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenPresets, onOpenImportExport }) => {
  // If no action buttons are provided, Sidebar already handles navigation and brand identity
  if (!onOpenPresets && !onOpenImportExport) {
    return null;
  }

  return (
    <div className="border-b border-sumi-800/60 bg-sumi-950/60 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-end gap-2.5">
        {onOpenPresets && (
          <button
            onClick={onOpenPresets}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-kintsugi-400 hover:text-kintsugi-300 hover:bg-kintsugi-500/10 border border-kintsugi-500/20 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kho Preset</span>
          </button>
        )}

        {onOpenImportExport && (
          <button
            onClick={onOpenImportExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sumi-300 hover:text-white hover:bg-sumi-800/60 transition-colors border border-sumi-800"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Import / Export</span>
          </button>
        )}
      </div>
    </div>
  );
};
