import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { RouteProgressBar } from "@/components/layout/RouteProgressBar";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalToast } from "@/components/ui/global-toast";
import { VocabularyLookupProvider } from "@/features/vocabulary-lookup";

import { AgentationDev } from "@/components/AgentationWrapper";

// Fonts loaded via system fallback to avoid build-time Google fetch in offline env.
// CSS variables --font-jp / --font-display fallback to Noto Sans JP stack defined in globals.css
const zenMaru = { variable: "" } as const;
const notoSansJP = { variable: "" } as const;
const shippori = { variable: "" } as const;

export const metadata: Metadata = {
  title: "Hanasu AI — Luyện nói tiếng Nhật cùng AI",
  description:
    "Nền tảng luyện nói tiếng Nhật với hội thoại thời gian thực, Phản xạ tức thì và Shadowing YouTube.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function shouldIgnore(err) {
                  var str = (err && (err.stack || err.message)) || String(err || '');
                  return str.indexOf('chrome-extension://') !== -1 ||
                         str.indexOf('moz-extension://') !== -1 ||
                         str.indexOf('bkkbcggnhapdmkeljlodobbkopceiche') !== -1 ||
                         str.indexOf('injectScriptAdjust') !== -1 ||
                         str.indexOf('page-toolbar-css') !== -1 ||
                         str.indexOf('4747') !== -1;
                }
                window.addEventListener('unhandledrejection', function(event) {
                  if (shouldIgnore(event.reason)) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                  }
                }, true);
                window.addEventListener('error', function(event) {
                  if (shouldIgnore(event.error) || (event.filename && (event.filename.indexOf('chrome-extension://') !== -1 || event.filename.indexOf('moz-extension://') !== -1))) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                  }
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider>
          <Suspense fallback={null}>
            <RouteProgressBar />
          </Suspense>
          <VocabularyLookupProvider>
            <AppShell>{children}</AppShell>
            <GlobalToast />
          </VocabularyLookupProvider>
          <AgentationDev />
        </ThemeProvider>
      </body>
    </html>
  );
}
