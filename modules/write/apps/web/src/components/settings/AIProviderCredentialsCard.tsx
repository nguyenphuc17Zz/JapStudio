import { useEffect, useState } from 'react'
import { Alert } from '../ui/Alert'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { Input } from '../ui/Input'
import { LoadingSpinner } from '../LoadingSpinner'
import { useAIProvider } from '../../context/AIProviderContext'
import { config } from '../../lib/config'
import { api } from '../../services/api'
import type {
  AiProviderConfigResponse,
  AiProviderConfigUpdate,
  AiProviderModels,
  AiProvidersResponse,
} from '../../types/api'
import { PROVIDER_LABELS } from './settingsConstants'

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
    // storage unavailable
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

interface AIProviderCredentialsCardProps {
  configData: AiProviderConfigResponse | null
  providersData: AiProvidersResponse | null
  onRefresh: () => void
}

export function AIProviderCredentialsCard({
  configData,
  providersData,
  onRefresh,
}: AIProviderCredentialsCardProps) {
  const { refresh: refreshGlobalAI, fetchModelsForProvider } = useAIProvider()

  // Clean up any legacy sensitive keys stored in localStorage
  useEffect(() => {
    try {
      window.localStorage.removeItem('settings.geminiKey')
      window.localStorage.removeItem('settings.groqKey')
    } catch {
      // ignore
    }
  }, [])

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

  const [models, setModels] = useState<AiProviderModels[] | null>(null)
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [modelSearch, setModelSearch] = useState('')
  const [selectingModel, setSelectingModel] = useState<string | null>(null)
  const [modelActionSuccess, setModelActionSuccess] = useState<string | null>(null)
  const [modelActionError, setModelActionError] = useState<string | null>(null)

  // Synchronize stored/active models & base URLs when config data loads
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

  const updateGeminiKey = (value: string) => {
    setGeminiKey(value)
  }

  const updateGeminiModel = (value: string) => {
    setGeminiModel(value)
    storeValue('geminiModel', value)
  }

  const updateGroqKey = (value: string) => {
    setGroqKey(value)
  }

  const updateGroqModel = (value: string) => {
    setGroqModel(value)
    storeValue('groqModel', value)
  }

  const updateOllamaUrl = (value: string) => {
    setOllamaUrl(value)
    storeValue('ollamaUrl', value)
  }

  const updateOllamaModel = (value: string) => {
    setOllamaModel(value)
    storeValue('ollamaModel', value)
  }

  const loadModels = async () => {
    setModelsLoading(true)
    setModelsError(null)
    setModelActionSuccess(null)
    setModelActionError(null)
    try {
      const result = await api.aiModels()
      // Filter out fake provider completely
      setModels(result.filter((entry) => entry.provider !== 'fake'))
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải danh sách mô hình')
    } finally {
      setModelsLoading(false)
    }
  }

  const saveConfig = async () => {
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      await api.saveAiProviderConfig({
        gemini_api_key: geminiKey || undefined,
        gemini_default_model: geminiModel || undefined,
        groq_api_key: groqKey || undefined,
        groq_default_model: groqModel || undefined,
        ollama_base_url: ollamaUrl || undefined,
        ollama_default_model: ollamaModel || undefined,
      })
      setSaved(true)
      onRefresh()
      void refreshGlobalAI()
      await loadModels()
      if (geminiKey) void fetchModelsForProvider('gemini')
      if (groqKey) void fetchModelsForProvider('groq')
    } catch (err) {
      setSaveError(describeError(err, 'Đã xảy ra lỗi khi lưu cấu hình'))
    } finally {
      setSaving(false)
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
        updateGeminiModel(modelId)
      } else if (provider === 'groq') {
        payload.groq_default_model = modelId
        updateGroqModel(modelId)
      } else if (provider === 'ollama') {
        payload.ollama_default_model = modelId
        updateOllamaModel(modelId)
      }
      await api.saveAiProviderConfig(payload)
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

  const getActiveModelForProvider = (providerName: string): string => {
    const fromProvider = providersData?.providers?.find((p) => p.name === providerName)?.default_model
    if (fromProvider) return fromProvider
    if (providerName === 'gemini' && geminiModel) return geminiModel
    if (providerName === 'groq' && groqModel) return groqModel
    if (providerName === 'ollama' && ollamaModel) return ollamaModel
    return ''
  }

  return (
    <>
      {/* API Keys Configuration */}
      <Card className="jw-mb-lg">
        <CardHeader
          title="Khóa API & Mô hình"
          description="Khóa được lưu bảo mật. Bạn có thể nhập khóa và chỉ định mô hình mặc định cho từng nhà cung cấp."
        />
        <CardContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {/* Gemini */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              <Input
                id="gemini-key"
                label={`Gemini API key (${credentialLabel('gemini', configData)})`}
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(event) => updateGeminiKey(event.target.value)}
                placeholder="AIza..."
                autoComplete="off"
              />
              <div className="jw-inline jw-gap-md" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="jw-text--caption jw-text--accent"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => setShowGeminiKey((v) => !v)}
                >
                  {showGeminiKey ? 'Ẩn Gemini API key' : 'Hiện Gemini API key'}
                </button>
              </div>
              <Input
                id="gemini-model"
                label="Gemini mô hình mặc định"
                type="text"
                value={geminiModel}
                onChange={(event) => updateGeminiModel(event.target.value)}
                placeholder="gemini-2.5-flash"
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-subtle)', margin: 'var(--space-xs) 0' }} />

            {/* Groq */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              <Input
                id="groq-key"
                label={`Groq API key (${credentialLabel('groq', configData)})`}
                type={showGroqKey ? 'text' : 'password'}
                value={groqKey}
                onChange={(event) => updateGroqKey(event.target.value)}
                placeholder="gsk_..."
                autoComplete="off"
              />
              <div className="jw-inline jw-gap-md" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="jw-text--caption jw-text--accent"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => setShowGroqKey((v) => !v)}
                >
                  {showGroqKey ? 'Ẩn Groq API key' : 'Hiện Groq API key'}
                </button>
              </div>
              <Input
                id="groq-model"
                label="Groq mô hình mặc định"
                type="text"
                value={groqModel}
                onChange={(event) => updateGroqModel(event.target.value)}
                placeholder="llama-3.3-70b-versatile"
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-subtle)', margin: 'var(--space-xs) 0' }} />

            {/* Ollama */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              <Input
                id="ollama-url"
                label={`Ollama địa chỉ máy chủ (${credentialLabel('ollama', configData)})`}
                type="text"
                value={ollamaUrl}
                onChange={(event) => updateOllamaUrl(event.target.value)}
                placeholder={DEFAULT_OLLAMA_URL}
              />
              <Input
                id="ollama-model"
                label="Ollama mô hình mặc định"
                type="text"
                value={ollamaModel}
                onChange={(event) => updateOllamaModel(event.target.value)}
                placeholder="llama3.2"
              />
            </div>

            {saved && <Alert tone="success">Đã lưu cấu hình khóa API và mô hình.</Alert>}
            {saveError && <Alert tone="error">{saveError}</Alert>}

            <div className="jw-mt-xs">
              <Button onClick={saveConfig} loading={saving} icon="save">
                Lưu cấu hình
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model List with Direct Model Selection */}
      <Card className="jw-mb-lg">
        <CardHeader
          title="Danh sách mô hình & Chọn mô hình"
          description="Tải các mô hình từ nhà cung cấp đã cấu hình và bấm 'Chọn' để đặt mô hình đó làm mặc định sử dụng."
        />
        <CardContent>
          {modelActionSuccess && <Alert tone="success" className="jw-mb-md">{modelActionSuccess}</Alert>}
          {modelActionError && <Alert tone="error" className="jw-mb-md">{modelActionError}</Alert>}

          {modelsLoading ? (
            <LoadingSpinner label="Đang tải danh sách mô hình từ các nhà cung cấp..." />
          ) : modelsError ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <Alert tone="error">{modelsError}</Alert>
              <div>
                <Button variant="secondary" size="sm" icon="refresh" onClick={() => void loadModels()}>
                  Thử lại
                </Button>
              </div>
            </div>
          ) : models ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {/* Search filter for models */}
              <div style={{ maxWidth: 360 }}>
                <Input
                  id="search-models"
                  label="Tìm kiếm nhanh mô hình"
                  value={modelSearch}
                  onChange={(event) => setModelSearch(event.target.value)}
                  placeholder="Lọc theo tên mô hình (vd: qwen, gemma, llama...)"
                />
              </div>

              {models.map((entry) => {
                const activeModel = getActiveModelForProvider(entry.provider)
                const query = modelSearch.trim().toLowerCase()
                const filteredModels = query
                  ? entry.models.filter(
                      (m) =>
                        m.id.toLowerCase().includes(query) ||
                        (m.display_name && m.display_name.toLowerCase().includes(query)),
                    )
                  : entry.models

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
                              ({filteredModels.length}/{entry.models.length} mô hình)
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
                      ) : filteredModels.length === 0 ? (
                        <p className="jw-text--caption jw-text--muted">Không có mô hình nào khớp với từ khóa &ldquo;{modelSearch}&rdquo;.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                          {filteredModels.map((model) => {
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
                                  transition: 'all 0.15s ease',
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

              <div className="jw-inline jw-gap-sm jw-mt-xs">
                <Button variant="ghost" size="sm" icon="refresh" onClick={() => void loadModels()}>
                  Làm mới danh sách mô hình
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" size="sm" icon="refresh" onClick={() => void loadModels()}>
              Tải danh sách mô hình
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}
