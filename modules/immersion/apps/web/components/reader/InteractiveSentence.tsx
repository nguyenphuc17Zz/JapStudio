"use client";

import React from "react";
import { AnnotatedSentence, ContentVocabulary, ContentGrammar, FuriganaMode } from "@/lib/types";

interface InteractiveSentenceProps {
  sentence: AnnotatedSentence;
  isActive: boolean;
  furiganaMode: FuriganaMode;
  showTranslation: boolean;
  onSentenceClick: (sentence: AnnotatedSentence) => void;
  onVocabClick: (vocab: ContentVocabulary) => void;
  onGrammarClick: (grammar: ContentGrammar) => void;
}

export const InteractiveSentence: React.FC<InteractiveSentenceProps> = ({
  sentence,
  isActive,
  furiganaMode,
  showTranslation,
  onSentenceClick,
  onVocabClick,
  onGrammarClick,
}) => {
  // Render tokens with ruby furigana and highlights if vocabularies match substrings
  const renderSentenceTokens = () => {
    const text = sentence.text;
    const vocabs = sentence.vocabularies || [];

    // ── 1. Comprehensive Engine: Use backend morphological Furigana tokens if available ──
    if (sentence.furigana_tokens && sentence.furigana_tokens.length > 0) {
      let charPos = 0;
      const elements: React.ReactNode[] = [];

      sentence.furigana_tokens.forEach((token, idx) => {
        const tokenStart = charPos;
        const tokenEnd = charPos + token.text.length;
        charPos = tokenEnd;

        // Check if this token intersects with any extracted AI vocabulary
        const matchedVocab = vocabs.find((v) => {
          if (!v.surface_form) return false;
          let p = text.indexOf(v.surface_form);
          while (p !== -1) {
            const vEnd = p + v.surface_form.length;
            if (Math.max(tokenStart, p) < Math.min(tokenEnd, vEnd)) {
              return true;
            }
            p = text.indexOf(v.surface_form, p + 1);
          }
          return false;
        });

        const hasRuby = Boolean(token.reading && token.is_kanji);

        if (matchedVocab) {
          elements.push(
            <span
              key={`vocab-tok-${idx}`}
              onClick={(e) => {
                e.stopPropagation();
                onVocabClick(matchedVocab);
              }}
              className="clickable-token vocab-highlight"
              title={`${matchedVocab.surface_form}${matchedVocab.reading ? ` (${matchedVocab.reading})` : ""}: ${matchedVocab.meaning_in_context}`}
            >
              {hasRuby ? (
                <ruby>
                  {token.text}
                  <rt>{token.reading}</rt>
                </ruby>
              ) : (
                token.text
              )}
            </span>
          );
        } else if (hasRuby) {
          elements.push(
            <ruby key={`ruby-tok-${idx}`}>
              {token.text}
              <rt>{token.reading}</rt>
            </ruby>
          );
        } else {
          elements.push(
            <span key={`plain-tok-${idx}`}>{token.text}</span>
          );
        }
      });

      return elements;
    }

    // ── 2. Fallback: Substring matching for vocabulary-only furigana ──
    type Slice = {
      start: number;
      end: number;
      vocab?: ContentVocabulary;
      grammar?: ContentGrammar;
      text: string;
    };

    const matches: Slice[] = [];

    // Find vocabulary positions
    for (const v of vocabs) {
      if (!v.surface_form) continue;
      let pos = text.indexOf(v.surface_form);
      while (pos !== -1) {
        matches.push({
          start: pos,
          end: pos + v.surface_form.length,
          vocab: v,
          text: v.surface_form,
        });
        pos = text.indexOf(v.surface_form, pos + 1);
      }
    }

    // Sort matches by start position and length (longer first)
    matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

    // Filter overlapping matches
    const nonOverlapping: Slice[] = [];
    let lastEnd = 0;
    for (const m of matches) {
      if (m.start >= lastEnd) {
        nonOverlapping.push(m);
        lastEnd = m.end;
      }
    }

    // Assemble text segments
    const elements: React.ReactNode[] = [];
    let currentIndex = 0;

    for (let i = 0; i < nonOverlapping.length; i++) {
      const m = nonOverlapping[i];
      if (m.start > currentIndex) {
        elements.push(
          <span key={`plain-${currentIndex}`}>
            {text.slice(currentIndex, m.start)}
          </span>
        );
      }

      const v = m.vocab;
      const hasReading = v?.reading && v.reading !== v.surface_form;

      elements.push(
        <span
          key={`token-${m.start}-${i}`}
          onClick={(e) => {
            e.stopPropagation();
            if (v) onVocabClick(v);
          }}
          className="clickable-token vocab-highlight"
          title={v ? `${v.surface_form} (${v.reading || ""}): ${v.meaning_in_context}` : ""}
        >
          {hasReading ? (
            <ruby>
              {v!.surface_form}
              <rt>{v!.reading}</rt>
            </ruby>
          ) : (
            m.text
          )}
        </span>
      );

      currentIndex = m.end;
    }

    if (currentIndex < text.length) {
      elements.push(
        <span key={`plain-${currentIndex}`}>
          {text.slice(currentIndex)}
        </span>
      );
    }

    return elements;
  };

  return (
    <span
      onClick={() => onSentenceClick(sentence)}
      data-sentence-index={sentence.sentence_index}
      className={`reader-sentence ${isActive ? "sentence-active" : ""}`}
    >
      <span className="inline">{renderSentenceTokens()}</span>
      {/* If global or sentence-level translation is visible */}
      {showTranslation && sentence.translation_vi && (
        <span className="block text-xs font-sans text-emerald-800 dark:text-emerald-400/90 font-normal my-1 pl-2 border-l-2 border-emerald-500/60 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20 py-0.5 rounded-r">
          {sentence.translation_vi}
        </span>
      )}
    </span>
  );
};
