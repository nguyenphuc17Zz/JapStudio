# UI Design System & Synchronization Rules

Every time you build, edit, or extend any user interface in `apps/web`:

## 1. Mandatory UI Primitives Reuse
You must strictly reuse existing UI primitives from `apps/web/src/components/ui/` and `src/components/ai/`:

- **Dropdown / Select**: ALWAYS use `<Select id="..." label="...">` from `src/components/ui/Select.tsx`. NEVER write raw unstyled HTML `<select>`.
- **Buttons**: ALWAYS use `<Button variant="..." icon="...">` from `src/components/ui/Button.tsx`.
- **Cards / Containers**: ALWAYS use `<Card variant="default|ai">`, `<CardHeader>`, `<CardContent>` from `src/components/ui/Card.tsx`.
- **Inputs**: ALWAYS use `<Input>`, `<Textarea>`, `<FormField>` from `src/components/ui/`.
- **AI Model Selector**: ALWAYS use `<AIModelPicker variant="compact|inline|card">` from `src/components/ai/AIModelPicker.tsx`.
- **Alerts / Notifications**: ALWAYS use `<Alert tone="...">` from `src/components/ui/Alert.tsx`.

## 2. Design Tokens (Zero Arbitrary Styles)
- Use tokens from `tokens.css`, `ui.css`, `ai.css`:
  - `var(--color-surface)`, `var(--color-surface-elevated)`
  - `var(--color-border)`, `var(--glass-border)`
  - `var(--color-foreground)`, `var(--color-foreground-secondary)`, `var(--color-foreground-muted)`
  - `var(--color-primary)`, `var(--color-ai)`, `var(--color-ai-glow)`
  - `var(--font-sans)` (`Inter`)
  - `var(--radius-sm)` (4px), `var(--radius-md)` (8px), `var(--radius-lg)` (12px), `var(--radius-full)` (9999px)

## 3. TopBar & Header Item Aesthetic
All header buttons must match the Japanese Wabi-Sabi TopBar standard:
- Height: 32px, padding: `0 10px`, border-radius: 8px (`var(--radius-md)`)
- Background: `rgba(255, 255, 255, 0.04)`, border: `1px solid var(--glass-border)`
- Dropdown menus must render as floating glassmorphic popovers.

## 4. Form Layouts
- Organize form fields in `.jw-inline.jw-gap-md` or `.jw-grid.jw-grid--2`.
- Form actions must be right-aligned in `<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-xs)' }}>`.

## 5. Dynamic AI & No Fake Provider
- **100% Dynamic Model Fetching**: Never hardcode AI models. All models must be fetched directly from the live provider API via `fetchModelsForProvider(provider)` / `/api/v1/ai/models`.
- Never show the Fake AI Provider in the UI.

## 6. Validation
- Run `npm run build` (`tsc -b && vite build`) and ensure 0 errors.
