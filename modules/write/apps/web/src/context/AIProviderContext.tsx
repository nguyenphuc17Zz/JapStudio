import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { api } from '../services/api'
import type { AiModelInfo, AiProviderStatus } from '../types/api'

export interface AIProviderContextValue {
  providers: AiProviderStatus[]
  configuredProviders: AiProviderStatus[]
  modelsByProvider: Record<string, AiModelInfo[]>
  selectedProvider: string
  selectedModel: string
  loading: boolean
  modelsLoading: boolean
  setProvider: (provider: string) => Promise<void>
  setModel: (model: string) => void
  refresh: () => Promise<void>
  fetchModelsForProvider: (provider: string) => Promise<AiModelInfo[]>
  getProviderStatus: (provider: string) => AiProviderStatus | undefined
  getAvailableModels: (provider?: string) => AiModelInfo[]
}

const AIProviderContext = createContext<AIProviderContextValue | null>(null)

const PROVIDER_STORAGE_KEY = 'jw:ai_selected_provider'
const MODEL_STORAGE_KEY = 'jw:ai_selected_model'
const MODEL_MAP_STORAGE_KEY = 'jw:ai_model_per_provider'

export function AIProviderProvider({ children }: { children: ReactNode }) {
  const [providers, setProviders] = useState<AiProviderStatus[]>([])
  const [modelsByProvider, setModelsByProvider] = useState<Record<string, AiModelInfo[]>>({})
  const [selectedProvider, setSelectedProviderState] = useState<string>(() => {
    try {
      const v = localStorage.getItem(PROVIDER_STORAGE_KEY)
      return v && v !== 'fake' ? v : ''
    } catch {
      return ''
    }
  })
  const [selectedModel, setSelectedModelState] = useState<string>(() => {
    try {
      return localStorage.getItem(MODEL_STORAGE_KEY) || ''
    } catch {
      return ''
    }
  })
  const [loading, setLoading] = useState(true)
  const [modelsLoading, setModelsLoading] = useState(false)

  const getSavedModelForProvider = useCallback((provider: string): string => {
    try {
      const raw = localStorage.getItem(MODEL_MAP_STORAGE_KEY)
      if (raw) {
        const map = JSON.parse(raw)
        if (map[provider]) return map[provider]
      }
    } catch {
      // ignore
    }
    return ''
  }, [])

  const saveModelForProvider = useCallback((provider: string, model: string) => {
    try {
      const raw = localStorage.getItem(MODEL_MAP_STORAGE_KEY)
      const map = raw ? JSON.parse(raw) : {}
      map[provider] = model
      localStorage.setItem(MODEL_MAP_STORAGE_KEY, JSON.stringify(map))
    } catch {
      // ignore
    }
  }, [])

  const fetchModelsForProvider = useCallback(
    async (providerName: string): Promise<AiModelInfo[]> => {
      try {
        setModelsLoading(true)
        const res = await api.aiModels({ provider: providerName })
        const providerItem = res.find((r) => r.provider === providerName)
        const liveModels = providerItem?.models || []
        
        setModelsByProvider((prev) => ({
          ...prev,
          [providerName]: liveModels,
        }))
        return liveModels
      } catch (err) {
        console.warn(`Could not load models dynamically for provider: ${providerName}`, err)
        return []
      } finally {
        setModelsLoading(false)
      }
    },
    [],
  )

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [providersRes, modelsRes] = await Promise.allSettled([
        api.aiProviders(),
        api.aiModels(),
      ])

      let loadedProviders: AiProviderStatus[] = []
      let defaultProvider = ''

      if (providersRes.status === 'fulfilled') {
        // Exclude fake provider completely — strict dynamic
        loadedProviders = providersRes.value.providers.filter((p) => p.name !== 'fake')
        const rawDefault = providersRes.value.default_provider
        defaultProvider = rawDefault && rawDefault !== 'fake' ? rawDefault : ''
        // Fallback to first configured/available provider if backend default is empty/fake
        if (!defaultProvider && loadedProviders.length > 0) {
          const firstConfigured = loadedProviders.find((p) => p.configured)
          defaultProvider = firstConfigured ? firstConfigured.name : loadedProviders[0].name
        }
        setProviders(loadedProviders)
      }

      const modelsMap: Record<string, AiModelInfo[]> = {}
      if (modelsRes.status === 'fulfilled') {
        for (const item of modelsRes.value) {
          if (item.provider !== 'fake' && item.models) {
            modelsMap[item.provider] = item.models
          }
        }
        setModelsByProvider(modelsMap)
      }

      // Determine initial active provider
      const currentSavedProvider = localStorage.getItem(PROVIDER_STORAGE_KEY)
      let activeProvider = (currentSavedProvider && currentSavedProvider !== 'fake') ? currentSavedProvider : defaultProvider

      const firstConfigured = loadedProviders.find((p) => p.configured)
      const isCurrentValid = loadedProviders.some((p) => p.name === activeProvider)
      if (!isCurrentValid && loadedProviders.length > 0) {
        activeProvider = firstConfigured ? firstConfigured.name : loadedProviders[0].name
      } else {
        const currentObj = loadedProviders.find((p) => p.name === activeProvider)
        if (currentObj && !currentObj.configured && firstConfigured) {
          activeProvider = firstConfigured.name
        }
      }

      setSelectedProviderState(activeProvider)
      try {
        localStorage.setItem(PROVIDER_STORAGE_KEY, activeProvider)
      } catch {
        // ignore
      }


      // Determine model for active provider
      const currentSavedModel = localStorage.getItem(MODEL_STORAGE_KEY)
      const savedForProv = getSavedModelForProvider(activeProvider)
      const providerObj = loadedProviders.find((p) => p.name === activeProvider)
      const providerModels = modelsMap[activeProvider] || []

      let activeModel = savedForProv || currentSavedModel || providerObj?.default_model || ''
      if (providerModels.length > 0 && !providerModels.some((m) => m.id === activeModel)) {
        activeModel = providerModels[0].id
      } else if (!activeModel && providerModels.length > 0) {
        activeModel = providerModels[0].id
      }

      setSelectedModelState(activeModel)
      if (activeModel) {
        try {
          localStorage.setItem(MODEL_STORAGE_KEY, activeModel)
          saveModelForProvider(activeProvider, activeModel)
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error('Failed to load AI providers / models', err)
    } finally {
      setLoading(false)
    }
  }, [getSavedModelForProvider, saveModelForProvider])

  useEffect(() => {
    loadData()
  }, [loadData])

  const setProvider = useCallback(
    async (provider: string) => {
      if (provider === 'fake') return
      setSelectedProviderState(provider)
      try {
        localStorage.setItem(PROVIDER_STORAGE_KEY, provider)
      } catch {
        // ignore
      }

      // Fetch dynamic live models directly from the provider via API
      const currentProviderModels = await fetchModelsForProvider(provider)

      const savedModel = getSavedModelForProvider(provider)
      const providerObj = providers.find((p) => p.name === provider)

      let targetModel = savedModel || providerObj?.default_model || ''
      if (currentProviderModels.length > 0 && !currentProviderModels.some((m) => m.id === targetModel)) {
        targetModel = currentProviderModels[0].id
      } else if (!targetModel && currentProviderModels.length > 0) {
        targetModel = currentProviderModels[0].id
      }

      setSelectedModelState(targetModel)
      if (targetModel) {
        try {
          localStorage.setItem(MODEL_STORAGE_KEY, targetModel)
          saveModelForProvider(provider, targetModel)
        } catch {
          // ignore
        }
      }
    },
    [fetchModelsForProvider, getSavedModelForProvider, providers, saveModelForProvider],
  )

  const setModel = useCallback(
    (model: string) => {
      setSelectedModelState(model)
      try {
        localStorage.setItem(MODEL_STORAGE_KEY, model)
        saveModelForProvider(selectedProvider, model)
      } catch {
        // ignore
      }
    },
    [saveModelForProvider, selectedProvider],
  )

  const getProviderStatus = useCallback(
    (provider: string) => {
      return providers.find((p) => p.name === provider)
    },
    [providers],
  )

  const getAvailableModels = useCallback(
    (provider?: string) => {
      const p = provider || selectedProvider
      return modelsByProvider[p] || []
    },
    [modelsByProvider, selectedProvider],
  )

  const configuredProviders = useMemo(() => providers.filter((p) => p.configured && p.name !== 'fake'), [providers])

  const contextValue = useMemo(
    () => ({
      providers,
      configuredProviders,
      modelsByProvider,
      selectedProvider,
      selectedModel,
      loading,
      modelsLoading,
      setProvider,
      setModel,
      refresh: loadData,
      fetchModelsForProvider,
      getProviderStatus,
      getAvailableModels,
    }),
    [providers, configuredProviders, modelsByProvider, selectedProvider, selectedModel, loading, modelsLoading, setProvider, setModel, loadData, fetchModelsForProvider, getProviderStatus, getAvailableModels],
  )

  return (
    <AIProviderContext.Provider value={contextValue}>
      {children}
    </AIProviderContext.Provider>
  )
}

export function useAIProvider(): AIProviderContextValue {
  const ctx = useContext(AIProviderContext)
  if (!ctx) {
    return {
      providers: [],
      configuredProviders: [],
      modelsByProvider: {},
      selectedProvider: '',
      selectedModel: '',
      loading: false,
      modelsLoading: false,
      setProvider: async () => {},
      setModel: () => {},
      refresh: async () => {},
      fetchModelsForProvider: async () => [],
      getProviderStatus: () => undefined,
      getAvailableModels: () => [],
    }
  }
  return ctx
}
