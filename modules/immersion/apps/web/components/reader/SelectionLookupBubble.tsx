"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, BookOpen } from "lucide-react";

interface SelectionLookupBubbleProps {
  /** Ref of the article container; selections outside it are ignored. */
  scopeRef: React.RefObject<HTMLElement | null>;
  /** Tra từ: page decides match-first vs AI lookup. */
  onLookup: (query: string, context: string) => void;
  /** Mở sheet câu chứa đoạn bôi đen (ảnh user gửi). Null = selection không thuộc câu nào. */
  onOpenSentence: (sentenceIndex: number | null, query: string) => void;
}

interface BubbleState {
  query: string;
  context: string;
  sentenceIndex: number | null;
  top: number;
  left: number;
}

const MIN_LEN = 2;
const MAX_LEN = 80;

function findBlockText(node: Node | null): string {
  let el = node instanceof Element ? node : node?.parentElement;
  const block = el?.closest?.("p, div, li, blockquote, article, section, td, th, h1, h2, h3, h4");
  const text = (block?.textContent || "").replace(/\s+/g, " ").trim();
  // Ngữ cảnh tối thiểu: chỉ cần câu chứa từ (~300 ký tự), không gửi cả bài
  return text.slice(0, 300);
}

export const SelectionLookupBubble: React.FC<SelectionLookupBubbleProps> = ({ scopeRef, onLookup, onOpenSentence }) => {
  const [bubble, setBubble] = useState<BubbleState | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const onLookupRef = useRef(onLookup);
  onLookupRef.current = onLookup;
  const onOpenSentenceRef = useRef(onOpenSentence);
  onOpenSentenceRef.current = onOpenSentence;

  const captureSelection = useCallback(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    const active = document.activeElement;
    let text = "";
    let rect: DOMRect | null = null;
    let anchorNode: Node | null = null;

    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      if (!scope.contains(active)) return;
      const { selectionStart, selectionEnd, value } = active;
      if (selectionStart == null || selectionEnd == null || selectionEnd <= selectionStart) return;
      text = value.substring(selectionStart, selectionEnd).trim();
      const r = active.getBoundingClientRect();
      rect = r;
      anchorNode = active;
    } else {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
      anchorNode = sel.anchorNode;
      // Only react to selections inside the article scope
      const anchorEl = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement;
      if (!anchorEl || !scope.contains(anchorEl)) return;
      text = sel.toString().replace(/\s+/g, " ").trim();
      try {
        rect = sel.getRangeAt(0).getBoundingClientRect();
      } catch {
        return;
      }
    }

    if (text.length < MIN_LEN || text.length > MAX_LEN) return;
    if (!rect || (rect.width === 0 && rect.height === 0)) return;

    // Which analyzed sentence owns this selection (for the "Xem câu" action)?
    const ownerEl = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement;
    const sentenceEl = ownerEl?.closest?.("[data-sentence-index]");
    const sentenceIndex = sentenceEl
      ? Number(sentenceEl.getAttribute("data-sentence-index"))
      : null;

    const top = Math.max(8, rect.top - 44);
    const left = Math.min(Math.max(110, rect.left + rect.width / 2), window.innerWidth - 110);
    setBubble({
      query: text,
      context: findBlockText(anchorNode),
      sentenceIndex: sentenceIndex && sentenceIndex > 0 ? sentenceIndex : null,
      top,
      left,
    });
  }, [scopeRef]);

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(captureSelection, 80);
    };

    const handleMouseUp = () => schedule();
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift" || e.key.startsWith("Arrow")) schedule();
    };
    const handleSelectionChange = () => {
      // Touch selections on mobile fire selectionchange without mouseup
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) schedule();
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        setBubble(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setBubble(null);
        window.getSelection()?.removeAllRanges();
      }
    };
    const handleScroll = () => setBubble(null);

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    scopeRef.current?.addEventListener("scroll", handleScroll);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      if (debounce) clearTimeout(debounce);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
      scopeRef.current?.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [captureSelection, scopeRef]);

  if (!bubble) return null;

  const label = bubble.query.length > 18 ? `${bubble.query.slice(0, 18)}…` : bubble.query;

  return createPortal(
    <div
      ref={bubbleRef}
      className="fixed z-[9990] -translate-x-1/2 flex items-center gap-1.5"
      style={{ top: bubble.top, left: bubble.left }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => {
          onLookupRef.current(bubble.query, bubble.context);
          setBubble(null);
          window.getSelection()?.removeAllRanges();
        }}
        className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full bg-gradient-to-r from-torii-500 to-amber-500 text-white text-xs font-bold shadow-xl shadow-torii-500/30 hover:scale-105 active:scale-95 transition-transform whitespace-nowrap"
        title={`Tra từ "${bubble.query}" trong ngữ cảnh câu`}
      >
        <Search className="w-3.5 h-3.5" />
        <span>Tra「{label}」</span>
      </button>
      {bubble.sentenceIndex != null && (
        <button
          onClick={() => {
            onOpenSentenceRef.current(bubble.sentenceIndex, bubble.query);
            setBubble(null);
            window.getSelection()?.removeAllRanges();
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-sumi-900/95 border border-sumi-700 text-sumi-200 text-xs font-semibold shadow-xl hover:border-torii-500/50 hover:text-white hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
          title="Mở bảng thao tác của câu chứa đoạn bôi đen"
        >
          <BookOpen className="w-3.5 h-3.5 text-torii-400" />
          <span>Xem câu</span>
        </button>
      )}
    </div>,
    document.body
  );
};
