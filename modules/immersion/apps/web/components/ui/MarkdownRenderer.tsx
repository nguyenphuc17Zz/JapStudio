"use client";

import React from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownRendererProps {
  content?: string | null;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = "",
}) => {
  if (!content) return null;

  return (
    <div className={`prose-sm max-w-none text-inherit leading-relaxed ${className}`}>
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed font-sans">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-amber-800 dark:text-amber-300">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-700 dark:text-sumi-300">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="my-2 space-y-1 list-disc list-outside pl-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 space-y-1 list-decimal list-outside pl-4">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          code: ({ children }) => {
            return (
              <code className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-900 dark:text-indigo-300 font-mono text-[11px] font-semibold border border-indigo-200 dark:border-indigo-500/30">
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="my-2 pl-3 border-l-2 border-amber-500/70 dark:border-amber-400/60 italic text-slate-700 dark:text-sumi-300 bg-amber-500/5 py-1 rounded-r-lg">
              {children}
            </blockquote>
          ),
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-slate-900 dark:text-white mt-3 mb-1.5">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-2.5 mb-1">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-bold text-amber-800 dark:text-amber-400 mt-2 mb-1 flex items-center gap-1">
              {children}
            </h3>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
