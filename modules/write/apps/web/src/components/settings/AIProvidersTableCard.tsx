import { useMemo } from 'react'
import { Alert } from '../ui/Alert'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { LoadingSpinner } from '../LoadingSpinner'
import type { AiProvidersResponse } from '../../types/api'
import { PROVIDER_LABELS } from './settingsConstants'

interface AIProvidersTableCardProps {
  loading: boolean
  error: string | null
  data: AiProvidersResponse | null
  onRetry: () => void
  onSetDefault: (providerName: string) => void
}

export function AIProvidersTableCard({
  loading,
  error,
  data,
  onRetry,
  onSetDefault,
}: AIProvidersTableCardProps) {
  const visibleProviders = useMemo(() => {
    if (!data?.providers) return []
    return data.providers.filter((p) => p.name !== 'fake')
  }, [data])

  const visibleFallbackProviders = useMemo(() => {
    if (!data?.fallback_providers) return []
    return data.fallback_providers.filter((p) => p !== 'fake')
  }, [data])

  const currentDefaultProvider = data?.default_provider === 'fake'
    ? 'Chưa đặt'
    : (PROVIDER_LABELS[data?.default_provider ?? ''] ?? data?.default_provider ?? 'Chưa đặt')

  return (
    <Card className="jw-mb-lg">
      <CardHeader title="Nhà cung cấp AI" description="Trạng thái và mô hình đang được cấu hình cho từng nhà cung cấp." />
      <CardContent>
        {loading ? (
          <LoadingSpinner label="Đang kiểm tra nhà cung cấp..." />
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <Alert tone="error">Không thể tải trạng thái nhà cung cấp: {error}</Alert>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button size="sm" variant="secondary" onClick={onRetry}>
                Thử lại kết nối
              </Button>
            </div>
          </div>
        ) : data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="jw-inline jw-gap-xs" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="jw-text--sm jw-text--muted">Mặc định hiện tại:</span>
              <Badge tone="accent">{currentDefaultProvider}</Badge>
              {visibleFallbackProviders.length > 0 && (
                <>
                  <span className="jw-text--sm jw-text--muted" style={{ marginLeft: 8 }}>Dự phòng:</span>
                  {visibleFallbackProviders.map((p) => (
                    <Badge key={p} tone="neutral">{PROVIDER_LABELS[p] ?? p}</Badge>
                  ))}
                </>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table aria-label="Bảng dữ liệu" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-sm)' }}>
                <caption className="jw-sr-only">Bảng dữ liệu</caption>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border-subtle)', textAlign: 'left', color: 'var(--color-foreground-muted)' }}>
                    <th scope="col" style={{ padding: 'var(--space-sm)' }}>Nhà cung cấp</th>
                    <th scope="col" style={{ padding: 'var(--space-sm)' }}>Cấu hình</th>
                    <th scope="col" style={{ padding: 'var(--space-sm)' }}>Trạng thái</th>
                    <th scope="col" style={{ padding: 'var(--space-sm)' }}>Mô hình đang dùng</th>
                    <th scope="col" style={{ padding: 'var(--space-sm)', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProviders.map((provider) => {
                    const isDefault = data?.default_provider === provider.name
                    return (
                      <tr key={provider.name} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                        <td style={{ padding: 'var(--space-sm)', fontWeight: 500 }}>
                          {PROVIDER_LABELS[provider.name] ?? provider.name}
                        </td>
                        <td style={{ padding: 'var(--space-sm)' }}>
                          {provider.configured ? (
                            <Badge tone="success">Đã cấu hình</Badge>
                          ) : (
                            <Badge tone="neutral">Chưa cấu hình</Badge>
                          )}
                        </td>
                        <td style={{ padding: 'var(--space-sm)' }}>
                          <Badge tone={provider.available ? 'success' : 'error'}>
                            {provider.available ? 'Khả dụng' : 'Không khả dụng'}
                          </Badge>
                        </td>
                        <td style={{ padding: 'var(--space-sm)', color: 'var(--color-foreground-primary)', fontFamily: 'monospace' }}>
                          {provider.default_model}
                        </td>
                        <td style={{ padding: 'var(--space-sm)', textAlign: 'right' }}>
                          {isDefault ? (
                            <Badge tone="accent">Mặc định</Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!provider.configured}
                              onClick={() => onSetDefault(provider.name)}
                            >
                              Đặt mặc định
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
