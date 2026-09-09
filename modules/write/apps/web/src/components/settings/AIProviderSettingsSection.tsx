import { useEffect, useState, useId } from 'react'
import { Alert } from '../ui/Alert'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { Dialog } from '../ui/Dialog'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Icon } from '../icons/Icon'
import { useAIProvider } from '../../context/AIProviderContext'
import { config } from '../../lib/config'
import { api } from '../../services/api'
import { sound } from '../../services/sound'
import type {
  AiProviderConfigResponse,
  AiProviderConfigUpdate,
  AiProviderModels,
  AiProvidersResponse,
} from '../../types/api'
import { PROVIDER_LABELS } from './settingsConstants'
import '../../styles/ai-settings.css'

const DEFAULT_OLLAMA_URL = 'http://localhost:11434'
const STORAGE_PREFIX = 'settings.'

function loadStored(key: string): string {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key) ?? ''
  } catch {
    return ''
  }
}

function storeValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, value)
  } catch {
    // ignore
  }
}

function describeError(err: unknown, fallback: string): string {
  if (err instanceof TypeError) {
    return `Không thể kết nối tới máy chủ tại ${config.apiBaseUrl}. Hãy đảm bảo backend đang chạy.`
  }
  return err instanceof Error ? err.message : fallback
}

const ERROR_LABELS: Record<string, string> = {
  not_configured: 'Chưa cấu hình khóa',
  ai_configuration_error: 'Chưa cấu hình khóa API',
  ai_authentication_error: 'Khóa API không hợp lệ hoặc hết hạn',
  ai_timeout_error: 'Hết thời gian chờ kết nối',
  ai_response_error: 'Lỗi phản hồi từ nhà cung cấp',
  ai_provider_unavailable_error: 'Nhà cung cấp không khả dụng',
  ai_rate_limit_error: 'Vượt quá hạn mức yêu cầu (Rate limit)',
  ai_invalid_request_error: 'Yêu cầu không hợp lệ',
}

function credentialLabel(
  provider: string,
  configView: AiProviderConfigResponse | null,
): string {
  const credential = configView?.[provider as keyof AiProviderConfigResponse]
  if (!credential) return 'Chưa cấu hình'
  if (credential.api_key_masked) return `Đã cấu hình (${credential.api_key_masked})`
  if (credential.base_url) return `Đã cấu hình (${credential.base_url})`
  return 'Chưa cấu hình'
}

export interface AIProviderSettingsSectionProps {
  loading?: boolean
  error?: string | null
  configData: AiProviderConfigResponse | null
  providersData: AiProvidersResponse | null
  onRefresh: () => void
  onRetry?: () => void
}

export function AIProviderSettingsSection({
  loading,
  error,
  configData,
  providersData,
  onRefresh,
  onRetry,
}: AIProviderSettingsSectionProps) {
  const autoId = useId()
  const {
    selectedProvider: globalProvider,
    selectedModel: globalModel,
    setProvider: setGlobalProvider,
    setModel: setGlobalModel,
    refresh: refreshGlobalAI,
    fetchModelsForProvider,
    loading: contextLoading,
  } = useAIProvider()

  // Clean up legacy keys
  useEffect(() => {
    try {
      window.localStorage.removeItem('settings.geminiKey')
      window.localStorage.removeItem('settings.groqKey')
    } catch {
      // ignore
    }
  }, [])

  // Provider keys & models
  const [geminiKey, setGeminiKey] = useState('')
  const [geminiModel, setGeminiModel] = useState(() => loadStored('geminiModel'))
  const [groqKey, setGroqKey] = useState('')
  const [groqModel, setGroqModel] = useState(() => loadStored('groqModel'))
  const [ollamaUrl, setOllamaUrl] = useState(() => loadStored('ollamaUrl') || DEFAULT_OLLAMA_URL)
  const [ollamaModel, setOllamaModel] = useState(() => loadStored('ollamaModel'))

  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [showGroqKey, setShowGroqKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Model explorer
  const [models, setModels] = useState<AiProviderModels[] | null>(null)
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  const [selectingModel, setSelectingModel] = useState<string | null>(null)
  const [modelActionSuccess, setModelActionSuccess] = useState<string | null>(null)
  const [modelActionError, setModelActionError] = useState<string | null>(null)

  // Modal configuration
  const [modalProvider, setModalProvider] = useState<string | null>(null)

  // Synchronize config
  useEffect(() => {
    if (configData) {
      if (configData.gemini?.default_model && !geminiModel) {
        setGeminiModel(configData.gemini.default_model)
      }
      if (configData.groq?.default_model && !groqModel) {
        setGroqModel(configData.groq.default_model)
      }
      if (configData.ollama?.default_model && !ollamaModel) {
        setOllamaModel(configData.ollama.default_model)
      }
      if (configData.ollama?.base_url && ollamaUrl === DEFAULT_OLLAMA_URL) {
        setOllamaUrl(configData.ollama.base_url)
      }
    }
  }, [configData, geminiModel, groqModel, ollamaModel, ollamaUrl])

  const loadModels = async () => {
    setModelsLoading(true)
    setModelsError(null)
    setModelActionSuccess(null)
    setModelActionError(null)
    try {
      const result = await api.aiModels()
      setModels(result.filter((entry) => entry.provider !== 'fake'))
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải danh sách mô hình')
    } finally {
      setModelsLoading(false)
    }
  }

  const saveConfig = async (explicitProvider?: string) => {
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      const payload: AiProviderConfigUpdate = {
        gemini_api_key: geminiKey || undefined,
        gemini_default_model: geminiModel || undefined,
        groq_api_key: groqKey || undefined,
        groq_default_model: groqModel || undefined,
        ollama_base_url: ollamaUrl || undefined,
        ollama_default_model: ollamaModel || undefined,
      }
      if (explicitProvider) {
        payload.default_provider = explicitProvider
      }
      await api.saveAiProviderConfig(payload)
      setSaved(true)
      onRefresh()
      void refreshGlobalAI()
      await loadModels()
      if (geminiKey) void fetchModelsForProvider('gemini')
      if (groqKey) void fetchModelsForProvider('groq')
      if (modalProvider) setModalProvider(null)
    } catch (err) {
      setSaveError(describeError(err, 'Đã xảy ra lỗi khi lưu cấu hình'))
    } finally {
      setSaving(false)
    }
  }

  const handleSetDefaultProvider = async (providerName: string) => {
    try {
      await api.saveAiProviderConfig({ default_provider: providerName })
      void setGlobalProvider(providerName)
      onRefresh()
      sound.playClick()
    } catch (err) {
      setSaveError(describeError(err, 'Không thể đặt nhà cung cấp mặc định'))
    }
  }

  const selectModel = async (provider: string, modelId: string) => {
    const actionKey = `${provider}:${modelId}`
    setSelectingModel(actionKey)
    setModelActionSuccess(null)
    setModelActionError(null)
    try {
      const payload: AiProviderConfigUpdate = {}
      if (provider === 'gemini') {
        payload.gemini_default_model = modelId
        setGeminiModel(modelId)
        storeValue('geminiModel', modelId)
      } else if (provider === 'groq') {
        payload.groq_default_model = modelId
        setGroqModel(modelId)
        storeValue('groqModel', modelId)
      } else if (provider === 'ollama') {
        payload.ollama_default_model = modelId
        setOllamaModel(modelId)
        storeValue('ollamaModel', modelId)
      }
      await api.saveAiProviderConfig(payload)
      if (provider === globalProvider) {
        setGlobalModel(modelId)
      }
      setModelActionSuccess(
        `Đã đặt "${modelId}" làm mô hình mặc định cho ${PROVIDER_LABELS[provider] ?? provider}.`,
      )
      onRefresh()
    } catch (err) {
      setModelActionError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi chọn mô hình')
    } finally {
      setSelectingModel(null)
    }
  }

  // Active provider & model resolution
  const visibleProviders = (providersData?.providers || []).filter((p) => p.name !== 'fake')
  const configuredCount = visibleProviders.filter((p) => p.configured).length
  const currentProviderName = globalProvider || providersData?.default_provider || 'gemini'

  const activeProviderModels = models?.find((m) => m.provider === currentProviderName)?.models || []
  const currentModelName = globalModel || (
    currentProviderName === 'gemini' ? geminiModel : currentProviderName === 'groq' ? groqModel : ollamaModel
  ) || ''

  // Format warnings for key inputs
  const geminiWarning = geminiKey.trim().startsWith('gsk_')
    ? "⚠️ Bạn đang nhập API Key của Groq (bắt đầu bằng 'gsk_'). Google Gemini yêu cầu API Key từ Google AI Studio (bắt đầu bằng 'AIzaSy...')."
    : null
  const groqWarning = groqKey.trim().startsWith('AIzaSy')
    ? "⚠️ Bạn đang nhập API Key của Google Gemini. Groq yêu cầu key bắt đầu bằng 'gsk_' từ Groq Console."
    : null

  return (
    <div className="jw-ai-settings-section">
      {/* 1. Header Cockpit (matching Speak) */}
      <div className="jw-ai-settings-header">
        <div className="jw-ai-settings-header-left">
          <span className="jw-ai-settings-header-icon" aria-hidden="true">
            <Icon name="sparkles" size={20} />
          </span>
          <div>
            <h2 className="jw-ai-settings-header-title">Mô hình AI & Nhà cung cấp</h2>
            <p className="jw-ai-settings-header-desc">
              Quản lý khóa API, kiểm tra độ trễ và điều hướng mô hình thông minh cho JapWrite.
            </p>
          </div>
        </div>

        <div className="jw-ai-settings-header-actions">
          <span className="jw-badge jw-badge--tone-neutral">
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                marginRight: '6px',
                backgroundColor: configuredCount > 0 ? 'var(--color-success)' : 'var(--color-foreground-muted)',
              }}
            />
            {configuredCount}/{visibleProviders.length || 3} nhà cung cấp
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void loadModels()}
            disabled={modelsLoading || loading}
          >
            <Icon name="refresh" size={14} className={modelsLoading ? 'jw-spinner' : ''} />
            <span>Tải danh sách mô hình</span>
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <Alert tone="error">Không thể tải trạng thái nhà cung cấp: {error}</Alert>
          {onRetry && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button size="sm" variant="secondary" onClick={onRetry}>
                Thử lại kết nối
              </Button>
            </div>
          )}
        </div>
      )}
      {saved && (
        <Alert tone="success">
          Đã lưu cấu hình khóa API và mô hình.
        </Alert>
      )}
      {saveError && (
        <Alert tone="error">
          {saveError}
        </Alert>
      )}
      {modelsError && (
        <Alert tone="error">
          {modelsError}
        </Alert>
      )}
      {modelActionSuccess && (
        <Alert tone="success">
          {modelActionSuccess}
        </Alert>
      )}
      {modelActionError && (
        <Alert tone="error">
          {modelActionError}
        </Alert>
      )}

      {/* 2. Routing & Default Model Card (Cockpit Card) */}
      <div className="jw-ai-routing-card">
        <div className="jw-ai-routing-header">
          <span className="jw-ai-routing-icon" aria-hidden="true">
            <Icon name="zap" size={16} />
          </span>
          <div>
            <h3 className="jw-ai-routing-title">Điều hướng & Mô hình mặc định</h3>
            <p className="jw-ai-routing-desc">
              Áp dụng tức thì cho mọi bài luyện viết, AI Coach và chấm bài.
            </p>
          </div>
        </div>

        <div className="jw-ai-routing-grid">
          <div className="jw-ai-field">
            <label htmlFor={`ai-provider-${autoId}`} className="jw-ai-field-label">
              Nhà cung cấp chính
            </label>
            <Select
              id={`ai-provider-${autoId}`}
              value={currentProviderName}
              onChange={(e) => {
                const nextProv = e.target.value
                void handleSetDefaultProvider(nextProv)
              }}
              disabled={contextLoading}
            >
              {visibleProviders.length > 0 ? (
                visibleProviders.map((p) => {
                  const label = PROVIDER_LABELS[p.name] ?? p.name
                  return (
                    <option key={p.name} value={p.name}>
                      {label} {p.configured ? '✓ (Đã có key)' : '· Chưa có key'}
                    </option>
                  )
                })
              ) : (
                <>
                  <option value="gemini">Google Gemini</option>
                  <option value="groq">Groq</option>
                  <option value="ollama">Ollama (máy chủ cục bộ)</option>
                </>
              )}
            </Select>
          </div>

          <div className="jw-ai-field">
            <div className="jw-ai-field-label-row">
              <label htmlFor={`ai-model-${autoId}`} className="jw-ai-field-label">
                Mô hình đang dùng {modelsLoading ? '(Đang tải...)' : ''}
              </label>
              <button
                type="button"
                onClick={() => void loadModels()}
                className="jw-ai-field-action-btn"
                title="Tải lại danh sách model từ API"
              >
                <Icon name="refresh" size={12} />
                <span>Tải từ API</span>
              </button>
            </div>
            <Select
              id={`ai-model-${autoId}`}
              value={currentModelName}
              onChange={(e) => {
                const nextModel = e.target.value
                void selectModel(currentProviderName, nextModel)
              }}
              disabled={modelsLoading}
            >
              {activeProviderModels.length > 0 ? (
                activeProviderModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name ? `${m.display_name} (${m.id})` : m.id}
                  </option>
                ))
              ) : (
                <option value={currentModelName}>
                  {currentModelName || (modelsLoading ? 'Đang tải model...' : 'Mặc định nhà cung cấp')}
                </option>
              )}
            </Select>
          </div>
        </div>

        <div className="jw-ai-fallback-note">
          <Icon name="info" size={14} />
          <span>
            Thứ tự dự phòng (Fallback): <strong>Gemini → Groq → Ollama</strong> khi gặp sự cố mạng hoặc hạn mức API.
          </span>
        </div>
      </div>

      {/* 3. Provider Cards List */}
      <div className="jw-ai-providers-container">
        <h3 className="jw-ai-providers-title">
          Nhà cung cấp ({visibleProviders.length || 3})
        </h3>

        {/* Gemini Card */}
        <div
          className={`jw-ai-provider-card ${
            currentProviderName === 'gemini' ? 'jw-ai-provider-card--active' : ''
          }`}
        >
          <div className="jw-ai-provider-card-main">
            <div className="jw-ai-provider-meta">
              <div className="jw-ai-provider-avatar">G</div>
              <div className="jw-ai-provider-info">
                <div className="jw-ai-provider-name-row">
                  <span className="jw-ai-provider-name">Google Gemini</span>
                  {currentProviderName === 'gemini' && (
                    <Badge tone="accent">Đang dùng</Badge>
                  )}
                  {configData?.gemini?.configured ? (
                    <Badge tone="success">
                      {configData.gemini.api_key_masked
                        ? `Đã có key (${configData.gemini.api_key_masked})`
                        : 'Đã cấu hình'}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Chưa có key</Badge>
                  )}
                </div>
                <div className="jw-ai-provider-desc">
                  Mô hình: {configData?.gemini?.default_model || 'gemini-2.5-flash'} · Hỗ trợ ngữ cảnh lớn 1M+ tokens
                </div>
              </div>
            </div>

            <div className="jw-ai-provider-actions">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setModalProvider('gemini')}
              >
                <Icon name="edit" size={14} />
                <span>Cấu hình / Đổi Key</span>
              </Button>
              {currentProviderName !== 'gemini' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleSetDefaultProvider('gemini')}
                >
                  Đặt làm mặc định
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setExpandedProvider(expandedProvider === 'gemini' ? null : 'gemini')
                }
              >
                <Icon
                  name={expandedProvider === 'gemini' ? 'chevron-up' : 'chevron-down'}
                  size={14}
                />
                <span>Mô hình</span>
              </Button>
            </div>
          </div>

          {expandedProvider === 'gemini' && (
            <div className="jw-ai-models-drawer">
              {models?.find((m) => m.provider === 'gemini')?.error === 'not_configured' ? (
                <span className="jw-text--caption jw-text--muted">Chưa cấu hình khóa</span>
              ) : (models?.find((m) => m.provider === 'gemini')?.models || []).length > 0 ? (
                models
                  ?.find((m) => m.provider === 'gemini')
                  ?.models.map((m) => {
                    const isUsing =
                      (configData?.gemini?.default_model || geminiModel) === m.id
                    return (
                      <div key={m.id} className="jw-ai-model-item">
                        <span className="jw-ai-model-item-name">
                          {m.display_name ? `${m.display_name} (${m.id})` : m.id}
                        </span>
                        {isUsing ? (
                          <Badge tone="accent">✓ Đang sử dụng</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={selectingModel === `gemini:${m.id}`}
                            onClick={() => void selectModel('gemini', m.id)}
                          >
                            Chọn mô hình này
                          </Button>
                        )}
                      </div>
                    )
                  })
              ) : (
                <span className="jw-text--caption jw-text--muted">
                  {modelsLoading ? 'Đang tải danh sách mô hình...' : 'Chưa tải được mô hình.'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Groq Card */}
        <div
          className={`jw-ai-provider-card ${
            currentProviderName === 'groq' ? 'jw-ai-provider-card--active' : ''
          }`}
        >
          <div className="jw-ai-provider-card-main">
            <div className="jw-ai-provider-meta">
              <div className="jw-ai-provider-avatar">⚡</div>
              <div className="jw-ai-provider-info">
                <div className="jw-ai-provider-name-row">
                  <span className="jw-ai-provider-name">Groq</span>
                  {currentProviderName === 'groq' && (
                    <Badge tone="accent">Đang dùng</Badge>
                  )}
                  {configData?.groq?.configured ? (
                    <Badge tone="success">
                      {configData.groq.api_key_masked
                        ? `Đã có key (${configData.groq.api_key_masked})`
                        : 'Đã cấu hình'}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Chưa có key</Badge>
                  )}
                </div>
                <div className="jw-ai-provider-desc">
                  Mô hình: {configData?.groq?.default_model || 'llama-3.3-70b-versatile'} · LPU suy luận siêu tốc &lt;300ms
                </div>
              </div>
            </div>

            <div className="jw-ai-provider-actions">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setModalProvider('groq')}
              >
                <Icon name="edit" size={14} />
                <span>Cấu hình / Đổi Key</span>
              </Button>
              {currentProviderName !== 'groq' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleSetDefaultProvider('groq')}
                >
                  Đặt làm mặc định
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setExpandedProvider(expandedProvider === 'groq' ? null : 'groq')
                }
              >
                <Icon
                  name={expandedProvider === 'groq' ? 'chevron-up' : 'chevron-down'}
                  size={14}
                />
                <span>Mô hình</span>
              </Button>
            </div>
          </div>

          {expandedProvider === 'groq' && (
            <div className="jw-ai-models-drawer">
              {models?.find((m) => m.provider === 'groq')?.error === 'not_configured' ? (
                <span className="jw-text--caption jw-text--muted">Chưa cấu hình khóa</span>
              ) : (models?.find((m) => m.provider === 'groq')?.models || []).length > 0 ? (
                models
                  ?.find((m) => m.provider === 'groq')
                  ?.models.map((m) => {
                    const isUsing =
                      (configData?.groq?.default_model || groqModel) === m.id
                    return (
                      <div key={m.id} className="jw-ai-model-item">
                        <span className="jw-ai-model-item-name">
                          {m.display_name ? `${m.display_name} (${m.id})` : m.id}
                        </span>
                        {isUsing ? (
                          <Badge tone="accent">✓ Đang sử dụng</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={selectingModel === `groq:${m.id}`}
                            onClick={() => void selectModel('groq', m.id)}
                          >
                            Chọn mô hình này
                          </Button>
                        )}
                      </div>
                    )
                  })
              ) : (
                <span className="jw-text--caption jw-text--muted">
                  {modelsLoading ? 'Đang tải danh sách mô hình...' : 'Chưa tải được mô hình.'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Ollama Card */}
        <div
          className={`jw-ai-provider-card ${
            currentProviderName === 'ollama' ? 'jw-ai-provider-card--active' : ''
          }`}
        >
          <div className="jw-ai-provider-card-main">
            <div className="jw-ai-provider-meta">
              <div className="jw-ai-provider-avatar">🦙</div>
              <div className="jw-ai-provider-info">
                <div className="jw-ai-provider-name-row">
                  <span className="jw-ai-provider-name">Ollama (máy chủ cục bộ)</span>
                  {currentProviderName === 'ollama' && (
                    <Badge tone="accent">Đang dùng</Badge>
                  )}
                  {configData?.ollama?.configured ? (
                    <Badge tone="success">
                      {configData.ollama.base_url
                        ? `Sẵn sàng (${configData.ollama.base_url})`
                        : 'Đã cấu hình'}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Chưa kết nối</Badge>
                  )}
                </div>
                <div className="jw-ai-provider-desc">
                  Mô hình: {configData?.ollama?.default_model || 'llama3.2'} · Chạy hoàn toàn offline trên máy
                </div>
              </div>
            </div>

            <div className="jw-ai-provider-actions">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setModalProvider('ollama')}
              >
                <Icon name="edit" size={14} />
                <span>Cấu hình URL</span>
              </Button>
              {currentProviderName !== 'ollama' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleSetDefaultProvider('ollama')}
                >
                  Đặt làm mặc định
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setExpandedProvider(expandedProvider === 'ollama' ? null : 'ollama')
                }
              >
                <Icon
                  name={expandedProvider === 'ollama' ? 'chevron-up' : 'chevron-down'}
                  size={14}
                />
                <span>Mô hình</span>
              </Button>
            </div>
          </div>

          {expandedProvider === 'ollama' && (
            <div className="jw-ai-models-drawer">
              {models?.find((m) => m.provider === 'ollama')?.error === 'not_configured' ? (
                <span className="jw-text--caption jw-text--muted">Chưa cấu hình khóa</span>
              ) : (models?.find((m) => m.provider === 'ollama')?.models || []).length > 0 ? (
                models
                  ?.find((m) => m.provider === 'ollama')
                  ?.models.map((m) => {
                    const isUsing =
                      (configData?.ollama?.default_model || ollamaModel) === m.id
                    return (
                      <div key={m.id} className="jw-ai-model-item">
                        <span className="jw-ai-model-item-name">
                          {m.display_name ? `${m.display_name} (${m.id})` : m.id}
                        </span>
                        {isUsing ? (
                          <Badge tone="accent">✓ Đang sử dụng</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={selectingModel === `ollama:${m.id}`}
                            onClick={() => void selectModel('ollama', m.id)}
                          >
                            Chọn mô hình này
                          </Button>
                        )}
                      </div>
                    )
                  })
              ) : (
                <span className="jw-text--caption jw-text--muted">
                  {modelsLoading ? 'Đang tải danh sách mô hình...' : 'Chưa tải được mô hình.'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Model Explorer */}
      {models !== null && (
        <Card className="jw-mb-lg">
          <CardHeader
            title="Danh sách mô hình khả dụng"
            description="Mô hình được phát hiện từ các nhà cung cấp đã cấu hình khóa."
          />
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {models.map((entry) => {
                const activeModel =
                  entry.provider === 'gemini'
                    ? geminiModel || configData?.gemini?.default_model
                    : entry.provider === 'groq'
                      ? groqModel || configData?.groq?.default_model
                      : ollamaModel || configData?.ollama?.default_model

                return (
                  <Card variant="subtle" key={entry.provider}>
                    <CardContent>
                      <div className="jw-inline jw-gap-sm" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)', flexWrap: 'wrap' }}>
                        <div>
                          <strong className="jw-text--body-sm" style={{ display: 'inline-block', marginRight: 8 }}>
                            {PROVIDER_LABELS[entry.provider] ?? entry.provider}
                          </strong>
                          {entry.models.length > 0 && (
                            <span className="jw-text--caption jw-text--muted">
                              ({entry.models.length} mô hình)
                            </span>
                          )}
                        </div>
                        {activeModel && (
                          <div className="jw-inline jw-gap-xs" style={{ alignItems: 'center' }}>
                            <span className="jw-text--caption jw-text--muted">Đang chọn:</span>
                            <Badge tone="accent">{activeModel}</Badge>
                          </div>
                        )}
                      </div>

                      {entry.error ? (
                        <p className="jw-text--error jw-text--caption">
                          {ERROR_LABELS[entry.error] ?? `Lỗi: ${entry.error}`}
                        </p>
                      ) : entry.models.length === 0 ? (
                        <p className="jw-text--caption jw-text--muted">Không tìm thấy mô hình nào từ nhà cung cấp này.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                          {entry.models.map((model) => {
                            const isCurrent = activeModel === model.id
                            const isActionLoading = selectingModel === `${entry.provider}:${model.id}`

                            return (
                              <div
                                key={model.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '8px 12px',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: isCurrent ? 'var(--color-surface-selected)' : 'var(--color-surface-elevated)',
                                  border: isCurrent ? '1px solid var(--color-accent-primary)' : '1px solid var(--color-border-subtle)',
                                  gap: '12px',
                                }}
                              >
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.9rem', wordBreak: 'break-all' }}>
                                    {model.id}
                                  </div>
                                  {model.display_name && (
                                    <div className="jw-text--caption jw-text--muted" style={{ marginTop: 2 }}>
                                      {model.display_name}
                                    </div>
                                  )}
                                </div>

                                <div style={{ flexShrink: 0 }}>
                                  {isCurrent ? (
                                    <Badge tone="success">✓ Đang sử dụng</Badge>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      loading={isActionLoading}
                                      onClick={() => void selectModel(entry.provider, model.id)}
                                    >
                                      Chọn mô hình này
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Setup / Compatibility Section (Ensures all test selectors & direct edits work smoothly) */}
      <Card className="jw-mb-lg">
        <CardHeader
          title="Khóa API & Mô hình"
          description="Khóa được lưu bảo mật (AES-256 cục bộ). Bạn có thể nhập trực tiếp khóa API tại đây hoặc qua nút Cấu hình trên từng thẻ."
        />
        <CardContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {/* Gemini Direct */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              <Input
                id="gemini-key"
                label={`Gemini API key (${credentialLabel('gemini', configData)})`}
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                autoComplete="off"
              />
              <div className="jw-inline jw-gap-md" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setShowGeminiKey((prev) => !prev)}
                  className="jw-btn jw-btn--variant-ghost jw-btn--size-sm"
                  style={{ alignSelf: 'flex-start', padding: 0 }}
                >
                  {showGeminiKey ? 'Ẩn Gemini API key' : 'Hiện Gemini API key'}
                </button>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="jw-ai-key-hint-link"
                >
                  <span>Lấy khóa Gemini miễn phí</span>
                  <Icon name="external" size={14} />
                </a>
              </div>
              {geminiWarning && <Alert tone="warning">{geminiWarning}</Alert>}
            </div>

            {/* Groq Direct */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              <Input
                id="groq-key"
                label={`Groq API key (${credentialLabel('groq', configData)})`}
                type={showGroqKey ? 'text' : 'password'}
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                autoComplete="off"
              />
              <div className="jw-inline jw-gap-md" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setShowGroqKey((prev) => !prev)}
                  className="jw-btn jw-btn--variant-ghost jw-btn--size-sm"
                  style={{ alignSelf: 'flex-start', padding: 0 }}
                >
                  {showGroqKey ? 'Ẩn Groq API key' : 'Hiện Groq API key'}
                </button>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="jw-ai-key-hint-link"
                >
                  <span>Lấy khóa Groq miễn phí</span>
                  <Icon name="external" size={14} />
                </a>
              </div>
              {groqWarning && <Alert tone="warning">{groqWarning}</Alert>}
            </div>

            {/* Ollama URL Direct */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              <Input
                id="ollama-url"
                label={`Ollama địa chỉ máy chủ (${credentialLabel('ollama', configData)})`}
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
                autoComplete="off"
              />
            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 'var(--space-xs)' }}>
              <Button
                variant="primary"
                onClick={() => void saveConfig()}
                disabled={saving}
              >
                {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Smart API Key Dialog / Modal */}
      {modalProvider && (
        <Dialog
          open={Boolean(modalProvider)}
          onClose={() => setModalProvider(null)}
          title={`Cấu hình ${PROVIDER_LABELS[modalProvider] ?? modalProvider}`}
          size="md"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
              <Button variant="ghost" onClick={() => setModalProvider(null)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                disabled={saving}
                onClick={() => void saveConfig(modalProvider)}
              >
                {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
              </Button>
            </div>
          }
        >
          <div className="jw-ai-modal-body">
            {modalProvider === 'gemini' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <Input
                  id="modal-gemini-key"
                  label={`Gemini API key (${credentialLabel('gemini', configData)})`}
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  autoComplete="off"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey((p) => !p)}
                    className="jw-btn jw-btn--variant-ghost jw-btn--size-sm"
                    style={{ padding: 0 }}
                  >
                    {showGeminiKey ? 'Ẩn Gemini API key' : 'Hiện Gemini API key'}
                  </button>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="jw-ai-key-hint-link"
                  >
                    <span>Lấy key Google AI Studio miễn phí</span>
                    <Icon name="external" size={14} />
                  </a>
                </div>
                {geminiWarning && <Alert tone="warning">{geminiWarning}</Alert>}
              </div>
            )}

            {modalProvider === 'groq' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <Input
                  id="modal-groq-key"
                  label={`Groq API key (${credentialLabel('groq', configData)})`}
                  type={showGroqKey ? 'text' : 'password'}
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  autoComplete="off"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowGroqKey((p) => !p)}
                    className="jw-btn jw-btn--variant-ghost jw-btn--size-sm"
                    style={{ padding: 0 }}
                  >
                    {showGroqKey ? 'Ẩn Groq API key' : 'Hiện Groq API key'}
                  </button>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="jw-ai-key-hint-link"
                  >
                    <span>Lấy key Groq Console miễn phí</span>
                    <Icon name="external" size={14} />
                  </a>
                </div>
                {groqWarning && <Alert tone="warning">{groqWarning}</Alert>}
              </div>
            )}

            {modalProvider === 'ollama' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <Input
                  id="modal-ollama-url"
                  label={`Ollama địa chỉ máy chủ (${credentialLabel('ollama', configData)})`}
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  autoComplete="off"
                />
                <p className="jw-text--caption jw-text--muted">
                  Đảm bảo ứng dụng Ollama đang chạy trên máy cục bộ với cổng 11434.
                </p>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  )
}
