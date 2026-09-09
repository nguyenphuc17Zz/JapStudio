import { PageContainer } from '../components/layout/PageContainer'
import { PageHeader } from '../components/layout/PageHeader'
import { AIProviderSettingsSection } from '../components/settings/AIProviderSettingsSection'
import { FuriganaSettingsCard } from '../components/settings/FuriganaSettingsCard'
import { LearningProfileCard } from '../components/settings/LearningProfileCard'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useAsync } from '../hooks/useAsync'
import { api } from '../services/api'

export default function SettingsPage() {
  const providers = useAsync(() => api.aiProviders())
  const configView = useAsync(() => api.aiProviderConfig())
  const health = useAsync(() => api.health())

  const refreshAI = () => {
    void providers.run()
    void configView.run()
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Cài đặt"
        description="Tùy chỉnh hồ sơ, trình độ và cấu hình ứng dụng."
      />

      {/* Learning Profile */}
      <LearningProfileCard />

      {/* AI Provider & Model Management (Speak Cockpit Style) */}
      <AIProviderSettingsSection
        loading={providers.loading}
        error={providers.error}
        configData={configView.data}
        providersData={providers.data}
        onRefresh={refreshAI}
        onRetry={() => void providers.run()}
      />

      {/* Furigana & Typography Customization */}
      <FuriganaSettingsCard />

      {/* System Health */}
      <Card className="jw-mb-lg">
        <CardHeader title="Trạng thái hệ thống" />
        <CardContent>
          {health.loading ? (
            <LoadingSpinner label="Đang kiểm tra kết nối hệ thống..." />
          ) : health.error ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <Alert tone="error">Không thể kết nối với máy chủ: {health.error}</Alert>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button size="sm" variant="secondary" onClick={() => void health.run()}>
                  Thử lại kết nối
                </Button>
              </div>
            </div>
          ) : health.data ? (
            <div className="jw-inline jw-gap-md" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="jw-inline jw-gap-xs">
                <Badge tone={health.data.status === 'ok' ? 'success' : 'warning'}>
                  {health.data.status === 'ok' ? 'Hoạt động bình thường' : health.data.status}
                </Badge>
                <span className="jw-text--caption jw-text--muted">
                  v{health.data.version} · env: {health.data.environment}
                </span>
              </div>
              <span className="jw-text--caption jw-text--muted">
                {new Date(health.data.timestamp).toLocaleTimeString('vi-VN')}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </PageContainer>
  )
}