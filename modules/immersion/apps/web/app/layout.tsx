import type { Metadata } from "next";
import "./globals.css";
import { AgentationProvider } from "@/components/AgentationProvider";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/context/ThemeContext";
import { NotificationProvider, ToastContainer, ConfirmModal } from "@/components/ui";

export const metadata: Metadata = {
  title: "JapImmersion — Source Manager | JapStudio",
  description: "Japanese Content Ingestion & Extensible Connector Engine for Japanese Language Immersion.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC script for seamless theme restoration before hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var key = 'japstudio_immersion_theme';
                var theme = localStorage.getItem(key) || 'system';
                var resolved = theme;
                if (theme === 'system') {
                  resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                var root = document.documentElement;
                root.classList.remove('light', 'dark');
                root.classList.add(resolved);
                root.setAttribute('data-theme', resolved);
              } catch (e) {}
            })()`,
          }}
        />
      </head>
      <body className="bg-sumi-950 text-sumi-200 min-h-screen antialiased selection:bg-torii-500 selection:text-white transition-colors duration-200">
        <ThemeProvider>
          <NotificationProvider>
            <AppShell>
              {children}
            </AppShell>
            <ToastContainer />
            <ConfirmModal />
          </NotificationProvider>
          <AgentationProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
