/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function cspMetaPlugin(): Plugin {
  return {
    name: 'inject-csp-meta',
    apply: 'build',
    transformIndexHtml(html) {
      const csp =
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; " +
        "base-uri 'self'; form-action 'self'"
      return html.replace(
        '<meta name="viewport"',
        `<meta http-equiv="Content-Security-Policy" content="${csp}" />\n    <meta name="viewport"`,
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cspMetaPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('joyoKanjiData')) return 'joyo-kanji'
          if (id.includes('systemGuide')) return 'guide'
          if (id.includes('kanjiService') || id.includes('kanjiStrokeEngine')) return 'kanji-engine'
          if (id.includes('AIVocabularyLookupBox') || id.includes('SelectionLookupBubble') || id.includes('vocabulary')) return 'vocabulary'
          if (id.includes('WritingIntelligence') || id.includes('WritingMastery') || id.includes('AdaptiveCurriculum') || id.includes('ExpressionBank') || id.includes('BossAssessment')) return 'writing-intelligence'
          if (id.includes('PracticePage') || id.includes('PracticeModeSelector') || id.includes('TopicQuickPills')) return 'practice'
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    testTimeout: 15000,
  },
})