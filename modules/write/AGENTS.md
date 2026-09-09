# Japanese Writing Studio — Developer & Agent Instructions

This document defines the **mandatory standards and architecture rules** for any AI agent or developer working on the Japanese Writing Studio codebase.

---

## 🎨 Mandatory UI Design System & Synchronization Rules

Every time you add, modify, or extend any user interface in `apps/web`:

### 1. Mandatory UI Primitives Reuse (DO NOT reinvent form controls)
You **must always reuse** the core UI primitives from `apps/web/src/components/ui/` and `src/components/ai/`:

| UI Component | Path | How to Use |
| :--- | :--- | :--- |
| **Dropdown / Select** | `src/components/ui/Select.tsx` | **NEVER use raw HTML `<select>`.** Always use `<Select id="..." label="...">` which includes floating glassmorphism menus, sound effects, and full accessibility. |
| **Buttons** | `src/components/ui/Button.tsx` | Use `<Button variant="primary|secondary|ghost|danger" icon="..." size="sm|md|lg">`. |
| **Cards & Panels** | `src/components/ui/Card.tsx` | Use `<Card>`, `<CardHeader title="..." actions="...">`, `<CardContent>`, `<CardFooter>`. For AI features, use `<Card variant="ai">`. |
| **Text Inputs** | `src/components/ui/Input.tsx`, `Textarea.tsx` | Use `<Input label="..." id="..." />`, `<Textarea label="..." id="..." />`. |
| **AI Model Selector** | `src/components/ai/AIModelPicker.tsx` | Use `<AIModelPicker variant="compact|inline|card">` for all AI-powered features. |
| **Alerts & Messages** | `src/components/ui/Alert.tsx` | Use `<Alert tone="info|success|warning|error" title="...">`. |
| **Spinners & Empty** | `src/components/ui/Spinner.tsx`, `EmptyState.tsx` | Use standard `<Spinner size="sm|md|lg">` and `<EmptyState>`. |

### 2. Strict CSS Tokens Usage (`tokens.css`, `ui.css`, `ai.css`)
**Zero arbitrary HEX colors or ad-hoc inline styles.** Always reference the existing design tokens:
- **Surfaces**: `var(--color-surface)`, `var(--color-surface-subtle)`, `var(--color-surface-elevated)`
- **Borders**: `var(--color-border)`, `var(--color-border-hover)`, `var(--glass-border)`
- **Foreground / Text**: `var(--color-foreground)`, `var(--color-foreground-secondary)`, `var(--color-foreground-muted)`
- **Brand & Accent**: `var(--color-primary)`, `var(--color-accent)`, `var(--color-ai)`, `var(--color-ai-glow)`
- **Typography**: `var(--font-sans)` (`Inter`), `var(--text-micro)` (11px), `var(--text-caption)` (12px), `var(--text-body-sm)` (14px), `var(--text-title)` (18px)
- **Border Radius**: `var(--radius-sm)` (4px), `var(--radius-md)` (8px), `var(--radius-lg)` (12px), `var(--radius-full)` (9999px)

### 3. TopBar & Header Controls Consistency
All actions in the TopBar (`AppShell.tsx`) must follow the unified button aesthetic:
- Height: `32px`, padding: `0 10px`, border-radius: `8px` (`var(--radius-md)`)
- Background: `rgba(255, 255, 255, 0.04)`, border: `1px solid var(--glass-border)`
- Dropdowns must open a floating glassmorphic popover (`background: var(--glass-bg)`, `backdropFilter: var(--glass-blur)`).

### 4. Form Layout & Action Placement
- Place form fields in standard grids: `.jw-inline.jw-gap-md` or `.jw-grid.jw-grid--2`.
- Place submit/generate buttons in a dedicated bottom row aligned to the right:
  `<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-xs)' }}>`
- Keep `<AIModelPicker variant="inline">` as a standard form row with full-width grid matching neighboring fields.

---

## 🤖 AI Provider & Model Integration Rules

1. **100% Dynamic Model Fetching (Zero Hardcoded Models)**:
   - Models must **never** be hardcoded as static lists in the client or backend code.
   - All models must be fetched 100% dynamically from the live AI provider API (`GET /api/v1/ai/models?provider=<name>` or `fetchModelsForProvider(provider)`).
   - If a provider is not yet configured or the API key is missing, display clear status indicators rather than generating fake or hardcoded model lists.
2. **No Fake AI Provider**: The `fake` provider is strictly for internal testing. It must NEVER be shown or selected in the UI. Only display **Google Gemini**, **Groq Cloud**, and **Ollama**.
3. **Payload Propagation**: All AI endpoints in backend and frontend accept optional `provider` and `model`. Only include them in request bodies when non-empty.

---

## ✅ Pre-Completion Quality Checklist

Before completing any task:
1. Run `npm run build` in `apps/web` (`tsc -b && vite build`) to ensure 0 TypeScript errors and 0 build warnings.
2. Run relevant tests in `apps/web` with `npx vitest run <test_files>`.
3. In `apps/api`, run pytest using `.venv\Scripts\pytest.exe`.
4. Ensure all interactive elements have valid `aria-label` or `<label htmlFor="...">`.
