import { useState } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ModeSwitchModal, type TargetModeInfo } from '../common/ModeSwitchModal'

interface StudioModeItem {
  id: string
  name: string
  jaName: string
  port: number
  tag: string
  description: string
  url: string
  icon: string
  status: 'active' | 'coming_soon'
}

const WRITE_MODES_CATALOG: StudioModeItem[] = [
  {
    id: 'speak',
    name: 'JapSpeak',
    jaName: '日本語スピーキング',
    port: 3000,
    tag: 'Luyện Nói & Phản Xạ Micro',
    description: 'Luyện phát âm Tokyo chuẩn, Shadowing YouTube và phản xạ giao tiếp thời gian thực qua Micro.',
    url: 'http://localhost:3000/dashboard',
    icon: '🎙️',
    status: 'active',
  },
  {
    id: 'immersion',
    name: 'JapImmersion',
    jaName: '多読・多聴インプット',
    port: 3002,
    tag: 'Đắm Chìm & Luyện Đọc Thực Tế',
    description: 'Kho ngữ liệu tiếng Nhật đa nguồn: Báo chí, MXH, Blog; Smart Reader phân tích từ vựng, Quiz đọc hiểu, Spaced Review và Xu Hướng.',
    url: 'http://localhost:3002/immersion',
    icon: '🌐',
    status: 'active',
  },
  {
    id: 'listen',
    name: 'JapListen',
    jaName: 'リスニング演習',
    port: 5174,
    tag: 'Luyện Nghe & Âm Điệu',
    description: 'Nhận diện phách âm Mora, nghe hiểu hội thoại đời thực và tốc độ nói người bản xứ.',
    url: 'http://localhost:5174',
    icon: '🎧',
    status: 'coming_soon',
  },
  {
    id: 'read',
    name: 'JapRead',
    jaName: '読解・語彙スタジオ',
    port: 5175,
    tag: 'Luyện Đọc & Ngữ Liệu',
    description: 'Phân tích văn bản tin tức báo chí, đọc hiểu ngữ cảnh thực tế và cấu trúc văn bản.',
    url: 'http://localhost:5175',
    icon: '📖',
    status: 'coming_soon',
  },
]

export function CrossStudioBanner() {
  const [switchTarget, setSwitchTarget] = useState<TargetModeInfo | null>(null)

  const handleOpenMode = (mode: StudioModeItem) => {
    if (mode.id === 'speak' || mode.id === 'immersion') {
      setSwitchTarget({
        id: mode.id as 'speak' | 'immersion',
        name: mode.name,
        tag: mode.tag,
        port: mode.port,
        url: mode.url,
      })
    } else {
      window.open(mode.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div style={{ marginBottom: 'var(--space-lg, 20px)' }}>
      {/* Mode Switch Modal */}
      <ModeSwitchModal
        isOpen={Boolean(switchTarget)}
        target={switchTarget}
        onClose={() => setSwitchTarget(null)}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-sm, 10px)',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>🌐</span>
          <h2
            style={{
              margin: 0,
              fontSize: 'var(--text-body, 14px)',
              fontWeight: 700,
              color: 'var(--color-foreground)',
            }}
          >
            Hệ Sinh Thái JapStudio — Chế Độ Học Mở Rộng
          </h2>
        </div>
        <span className="jw-text--muted jw-text--sm">
          Chuyển đổi linh hoạt giữa các phòng luyện chuyên sâu
        </span>
      </div>

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-md, 14px)',
        }}
      >
        {WRITE_MODES_CATALOG.map((mode) => {
          const isActive = mode.status === 'active'

          if (isActive) {
            const isImmersion = mode.id === 'immersion'
            return (
              <Card
                key={mode.id}
                variant="interactive"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: 'var(--color-surface, #ffffff)',
                  border: isImmersion
                    ? '1px solid rgba(230, 57, 70, 0.4)'
                    : '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: 'var(--radius-lg, 12px)',
                  boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.08))',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                    }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: 'var(--radius-md, 8px)',
                        background: isImmersion
                          ? 'rgba(230, 57, 70, 0.12)'
                          : 'rgba(16, 185, 129, 0.12)',
                        border: isImmersion
                          ? '1px solid rgba(230, 57, 70, 0.25)'
                          : '1px solid rgba(16, 185, 129, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                      }}
                    >
                      {mode.icon}
                    </div>
                    <Badge tone={isImmersion ? 'accent' : 'success'}>Web :{mode.port}</Badge>
                  </div>

                  <div style={{ marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '15px', color: 'var(--color-foreground)' }}>
                        {mode.name}
                      </strong>
                      <span className="jw-text--muted jw-text--sm">({mode.jaName})</span>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: isImmersion ? '#e63946' : 'var(--color-success, #059669)',
                        marginTop: '2px',
                      }}
                    >
                      {mode.tag}
                    </div>
                  </div>

                  <p
                    className="jw-text--muted jw-text--sm"
                    style={{ margin: '6px 0 0 0', lineHeight: 1.5 }}
                  >
                    {mode.description}
                  </p>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenMode(mode)}
                    style={{
                      width: '100%',
                      justifyContent: 'space-between',
                      background: isImmersion ? '#e63946' : '#059669',
                      borderColor: isImmersion ? '#e63946' : '#059669',
                      fontWeight: 600,
                    }}
                  >
                    <span>Chuyển sang {mode.name}</span>
                    <span>↗</span>
                  </Button>
                </div>
              </Card>
            )
          }

          {/* Coming soon slot */}
          return (
            <div
              key={mode.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '16px',
                background: 'var(--color-surface-subtle, rgba(0,0,0,0.02))',
                border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-lg, 12px)',
                opacity: 0.8,
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-md, 8px)',
                      background: 'var(--color-surface, #ffffff)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                    }}
                  >
                    {mode.icon}
                  </div>
                  <Badge tone="neutral">Sắp ra mắt</Badge>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ fontSize: '15px', color: 'var(--color-foreground)' }}>
                      {mode.name}
                    </strong>
                    <span className="jw-text--muted jw-text--sm">({mode.jaName})</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-foreground-muted)', marginTop: '2px' }}>
                    {mode.tag}
                  </div>
                </div>

                <p
                  className="jw-text--muted jw-text--sm"
                  style={{ margin: '6px 0 0 0', lineHeight: 1.5 }}
                >
                  {mode.description}
                </p>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed var(--color-border)' }}>
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md, 8px)',
                    background: 'var(--color-surface-subtle, rgba(0,0,0,0.04))',
                    border: '1px solid var(--color-border)',
                    fontSize: '12px',
                    color: 'var(--color-foreground-muted)',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Module mở rộng</span>
                  <span style={{ fontFamily: 'monospace' }}>Port :{mode.port}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
