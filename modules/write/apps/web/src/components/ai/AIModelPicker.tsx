import { useState, useRef, useEffect, useId } from 'react'
import { useAIProvider } from '../../context/AIProviderContext'
import type { AiModelInfo } from '../../types/api'
import { Select } from '../ui/Select'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { sound } from '../../services/sound'

export interface AIModelPickerProps {
  value?: { provider?: string; model?: string }
  onChange?: (selection: { provider: string; model: string }) => void
  variant?: 'compact' | 'inline' | 'card'
  showLabel?: boolean
  label?: string
  disabled?: boolean
  className?: string
}

const PROVIDER_NAMES: Record<
  string,
  { label: string; shortLabel: string; icon: string; tagClass: string }
> = {
  gemini: {
    label: 'Google Gemini',
    shortLabel: 'Gemini',
    icon: '✨',
    tagClass: 'jw-ai-provider-tag--gemini',
  },
  groq: {
    label: 'Groq Cloud',
    shortLabel: 'Groq',
    icon: '⚡',
    tagClass: 'jw-ai-provider-tag--groq',
  },
  ollama: {
    label: 'Ollama (Local)',
    shortLabel: 'Ollama',
    icon: '🦙',
    tagClass: 'jw-ai-provider-tag--ollama',
  },
}

export function AIModelPicker({
  value,
  onChange,
  variant = 'compact',
  showLabel = true,
  label = 'Mô hình AI',
  disabled = false,
  className = '',
}: AIModelPickerProps) {
  const autoId = useId()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const {
    providers,
    selectedProvider: globalProvider,
    selectedModel: globalModel,
    setProvider: setGlobalProvider,
    setModel: setGlobalModel,
    getAvailableModels,
    fetchModelsForProvider,
    loading,
    modelsLoading,
  } = useAIProvider()

  const currentProvider = value?.provider || globalProvider || ''
  const currentModel = value?.model || globalModel || ''

  const availableModels: AiModelInfo[] = getAvailableModels(currentProvider)

  // Strict dynamic: never show hardcoded fallback list — show spinner/empty while loading
  const providerOptions = providers.filter((p) => p.name !== 'fake')

  // Fetch models dynamically when popover opens if not loaded
  useEffect(() => {
    if (open && availableModels.length === 0) {
      void fetchModelsForProvider(currentProvider)
    }
  }, [open, availableModels.length, currentProvider, fetchModelsForProvider])

  // Close floating compact menu on outside click
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleProviderSelect = async (nextProv: string) => {
    const modelsForProv = await fetchModelsForProvider(nextProv)
    const providerObj = providers.find((p) => p.name === nextProv)
    let nextModel = providerObj?.default_model || (modelsForProv.length > 0 ? modelsForProv[0].id : '')
    if (modelsForProv.length > 0 && !modelsForProv.some((m) => m.id === nextModel)) {
      nextModel = modelsForProv[0].id
    }

    if (onChange) {
      onChange({ provider: nextProv, model: nextModel })
    } else {
      void setGlobalProvider(nextProv)
    }
    sound.playClick()
  }

  const handleModelSelect = (nextModel: string) => {
    if (onChange) {
      onChange({ provider: currentProvider, model: nextModel })
    } else {
      setGlobalModel(nextModel)
    }
    setOpen(false)
    sound.playClick()
  }

  const providerMeta = PROVIDER_NAMES[currentProvider] || {
    label: currentProvider,
    shortLabel: currentProvider,
    icon: '✨',
    tagClass: 'jw-ai-provider-tag--gemini',
  }

  const activeModelObj = availableModels.find((m) => m.id === currentModel)
  const displayModelName =
    activeModelObj?.display_name?.replace(/\s*\(.*?\)/, '') || currentModel || 'Mặc định'

  // Card Variant (For Settings & Large Setup Panes)
  if (variant === 'card') {
    if (loading && providerOptions.length === 0) {
      return (
        <Card variant="ai" className={`jw-ai-picker-card ${className}`}>
          <CardContent>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-md)', color: 'var(--color-foreground-muted)', fontSize: 'var(--text-body-sm)' }}>
              <span className="jw-spinner jw-spinner--sm" aria-hidden="true" />
              <span>Đang tải danh sách nhà cung cấp...</span>
            </div>
          </CardContent>
        </Card>
      )
    }
    return (
      <Card variant="ai" className={`jw-ai-picker-card ${className}`}>
        <CardHeader
          title={
            <div className="jw-ai-picker-card-title">
              <span>{providerMeta.icon}</span>
              <span>{label}</span>
            </div>
          }
          actions={
            <span className={`jw-ai-provider-tag ${providerMeta.tagClass}`}>
              {providerMeta.label}
            </span>
          }
        />
        <CardContent>
          <div className="jw-ai-picker-grid">
            <Select
              id={`ai-picker-provider-${autoId}`}
              label="Nhà cung cấp"
              aria-label="Nhà cung cấp"
              value={currentProvider}
              onChange={(e) => void handleProviderSelect(e.target.value)}
              disabled={disabled || loading}
            >
              {providerOptions.length > 0 ? (
                providerOptions.map((p) => {
                  const meta = PROVIDER_NAMES[p.name] || { label: p.name, icon: '🤖' }
                  return (
                    <option key={p.name} value={p.name}>
                      {meta.icon} {meta.label} {p.configured ? '(Sẵn sàng)' : ''}
                    </option>
                  )
                })
              ) : (
                <option value="">Chưa có provider</option>
              )}
            </Select>

            <Select
              id={`ai-picker-model-${autoId}`}
              label={`Mô hình ${modelsLoading ? '(Đang tải...)' : ''}`}
              aria-label="Mô hình"
              value={currentModel}
              onChange={(e) => handleModelSelect(e.target.value)}
              disabled={disabled || loading || modelsLoading || availableModels.length === 0}
            >
              {availableModels.length > 0 ? (
                availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name || m.id}
                  </option>
                ))
              ) : (
                <option value={currentModel}>
                  {currentModel || (modelsLoading ? 'Đang tải model...' : 'Chưa có model')}
                </option>
              )}
            </Select>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Inline Variant (For Form Rows & Studio Panels)
  if (variant === 'inline') {
    if (loading && providerOptions.length === 0) {
      return (
        <div className={`jw-ai-picker-inline-wrapper ${className}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--color-foreground-muted)', fontSize: 'var(--text-caption)' }}>
            <span className="jw-spinner jw-spinner--sm" aria-hidden="true" />
            <span>Đang tải provider...</span>
          </div>
        </div>
      )
    }
    return (
      <div className={`jw-ai-picker-inline-wrapper ${className}`}>
        {showLabel && (
          <div className="jw-ai-picker-inline-label">
            <span>{providerMeta.icon}</span>
            <span>{label}</span>
          </div>
        )}
        <div className="jw-ai-picker-grid">
          <Select
            id={`ai-picker-provider-${autoId}`}
            label="Nhà cung cấp"
            aria-label="Nhà cung cấp"
            value={currentProvider}
            onChange={(e) => void handleProviderSelect(e.target.value)}
            disabled={disabled || loading}
          >
            {providerOptions.length > 0 ? (
              providerOptions.map((p) => {
                const meta = PROVIDER_NAMES[p.name] || { label: p.name, icon: '🤖' }
                return (
                  <option key={p.name} value={p.name}>
                    {meta.icon} {meta.label}
                  </option>
                )
              })
            ) : (
              <option value="">Chưa có provider</option>
            )}
          </Select>

          <Select
            id={`ai-picker-model-${autoId}`}
            label={`Mô hình ${modelsLoading ? '(Đang tải...)' : ''}`}
            aria-label="Mô hình"
            value={currentModel}
            onChange={(e) => handleModelSelect(e.target.value)}
            disabled={disabled || loading || modelsLoading || availableModels.length === 0}
          >
            {availableModels.length > 0 ? (
              availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name || m.id}
                </option>
              ))
            ) : (
              <option value={currentModel}>
                {currentModel || (modelsLoading ? 'Đang tải...' : 'Mặc định')}
              </option>
            )}
          </Select>
        </div>
      </div>
    )
  }

  // Compact Variant (TopBar & Action Bars)
  return (
    <div
      ref={menuRef}
      className={`jw-ai-picker-compact-container ${className}`}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`AI: ${providerMeta.label} · ${displayModelName}`}
        aria-label={`Chọn mô hình AI: ${providerMeta.label} · ${displayModelName}`}
        disabled={disabled || loading}
        className="jw-ai-compact-trigger-btn"
      >
        <span className="jw-ai-compact-icon" role="img" aria-hidden="true">
          {providerMeta.icon}
        </span>
        <span className="jw-ai-compact-provider-text">{providerMeta.shortLabel}</span>
        <span className="jw-ai-compact-divider">/</span>
        <span className="jw-ai-compact-model-text">{displayModelName}</span>
        <span className="jw-ai-compact-arrow">▾</span>
      </button>

      {/* Accessible hidden selects for screen readers — no hardcoded fallback */}
      <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <select
          id={`ai-picker-provider-${autoId}-sr`}
          aria-label="Nhà cung cấp"
          value={currentProvider}
          onChange={(e) => void handleProviderSelect(e.target.value)}
          tabIndex={-1}
        >
          {providerOptions.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          id={`ai-picker-model-${autoId}-sr`}
          aria-label="Mô hình"
          value={currentModel}
          onChange={(e) => handleModelSelect(e.target.value)}
          tabIndex={-1}
        >
          {availableModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id}
            </option>
          ))}
        </select>
      </div>

      {open && (
        <div className="jw-ai-compact-popover">
          <div className="jw-ai-popover-header">
            <div className="jw-ai-popover-title">
              <span>{providerMeta.icon}</span>
              <span>Chọn Nhà Cung Cấp & Model</span>
            </div>
            {modelsLoading && (
              <span className="jw-ai-popover-loading">Đang tải...</span>
            )}
          </div>

          {/* Provider Tabs */}
          <div className="jw-ai-popover-provider-tabs">
            {providerOptions.map((p) => {
              const meta = PROVIDER_NAMES[p.name] || { label: p.name, shortLabel: p.name, icon: '🤖' }
              const active = p.name === currentProvider
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => void handleProviderSelect(p.name)}
                  className={`jw-ai-popover-tab ${active ? 'jw-ai-popover-tab--active' : ''}`}
                >
                  <span>{meta.icon}</span>
                  <span>{meta.shortLabel}</span>
                </button>
              )
            })}
          </div>

          {/* Model List */}
          <div className="jw-ai-popover-models-list">
            <div className="jw-ai-popover-section-label">Mô hình khả dụng</div>
            {availableModels.length > 0 ? (
              availableModels.map((m) => {
                const active = m.id === currentModel
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleModelSelect(m.id)}
                    className={`jw-ai-popover-model-item ${active ? 'jw-ai-popover-model-item--active' : ''}`}
                  >
                    <div className="jw-ai-popover-model-info">
                      <span className="jw-ai-popover-model-name">
                        {m.display_name || m.id}
                      </span>
                      {m.owned_by && (
                        <span className="jw-ai-popover-model-sub">
                          {m.owned_by} · {m.id}
                        </span>
                      )}
                    </div>
                    {active && <span className="jw-ai-popover-check">✓</span>}
                  </button>
                )
              })
            ) : (
              <div className="jw-ai-popover-empty">
                {modelsLoading
                  ? 'Đang tải danh sách mô hình...'
                  : 'Chưa tìm thấy mô hình cho nhà cung cấp này.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
