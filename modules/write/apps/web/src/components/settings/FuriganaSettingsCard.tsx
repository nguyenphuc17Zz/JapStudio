import { Badge } from '../ui/Badge'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { FuriganaText } from '../ui/FuriganaText'
import {
  useFurigana,
  FURIGANA_OPTIONS,
  FURIGANA_COLORS,
  type FuriganaMode,
} from '../../context/FuriganaContext'
import { sound } from '../../services/sound'

export function FuriganaSettingsCard() {
  const furigana = useFurigana()

  return (
    <Card className="jw-mb-lg">
      <CardHeader
        title="Âm đọc Furigana & Hiển thị chữ Hán"
        description="Tùy chỉnh chế độ hiển thị âm đọc (Furigana) phía trên chữ Hán và màu sắc hiển thị trên toàn bộ ứng dụng."
      />
      <CardContent>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Mode selection */}
          <div>
            <label style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
              Chế độ hiển thị toàn hệ thống:
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 'var(--space-sm)',
              }}
            >
              {(Object.keys(FURIGANA_OPTIONS) as FuriganaMode[]).map((key) => {
                const opt = FURIGANA_OPTIONS[key]
                const active = furigana.mode === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      sound.playClick()
                      furigana.setMode(key)
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: active ? 'var(--color-accent-muted)' : 'var(--color-surface-subtle)',
                      border: active ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
                      color: 'var(--color-foreground)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                      <span style={{ fontSize: 16 }}>{opt.icon}</span>
                      {active && <Badge tone="accent">Đang chọn</Badge>}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-body-sm)', color: active ? 'var(--color-accent)' : 'inherit' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-muted)', marginTop: 4, lineHeight: 1.35 }}>
                      {opt.description}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <label style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
              Màu sắc âm đọc Furigana (Màu mực truyền thống Nhật Bản):
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 'var(--space-xs)',
                marginBottom: 12,
              }}
            >
              {FURIGANA_COLORS.map((c) => {
                const isSelected = furigana.color.toLowerCase() === c.hex.toLowerCase()
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      sound.playClick()
                      furigana.setColor(c.hex)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--color-surface-elevated)' : 'var(--color-surface-subtle)',
                      border: isSelected ? `2px solid ${c.hex}` : '1px solid var(--color-border)',
                      boxShadow: isSelected ? `0 0 10px ${c.previewGlow}` : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title={c.name}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: c.hex,
                        flexShrink: 0,
                        boxShadow: `0 0 6px ${c.previewGlow}`,
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: isSelected ? c.hex : 'var(--color-foreground)' }}>
                        {c.kanji}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--color-foreground-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.name.split(' ')[0]}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Custom Color Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-subtle)',
                border: '1px solid var(--color-border)',
              }}
            >
              <label
                htmlFor="settings-furigana-custom-color"
                style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)', cursor: 'pointer' }}
              >
                Mã màu tùy chỉnh tự do:
              </label>
              <input
                id="settings-furigana-custom-color"
                type="color"
                value={furigana.color}
                onChange={(e) => furigana.setColor(e.target.value)}
                style={{
                  width: 28,
                  height: 28,
                  padding: 0,
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  background: 'none',
                }}
                title="Chọn màu bất kỳ"
                aria-label="Chọn màu tùy chỉnh cho Furigana"
              />
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: furigana.color }}>
                {furigana.color.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Interactive Live Demo */}
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 'var(--text-micro)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-foreground-muted)' }}>
                Khung xem trước tương tác (Interactive Live Preview)
              </span>
              <span style={{ fontSize: 'var(--text-micro)', color: furigana.color, fontWeight: 600 }}>
                Chế độ: {FURIGANA_OPTIONS[furigana.mode].label}
              </span>
            </div>
            <div
              className="jw-jp-text"
              style={{
                fontSize: '18px',
                lineHeight: '2.4',
                color: 'var(--color-foreground)',
                padding: '8px 4px',
              }}
            >
              <FuriganaText text="日本語[にほんご]の勉強[べんきょう]は毎日[まいにち]少[すこ]しずつ続[つづ]けることが大切[たいせつ]です。漢字[かんじ]の読[よ]み方[かた]に迷[まよ]ったら、いつでもFuriganaを参考[さんこう]にしてください。" />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-foreground-muted)', marginTop: 8 }}>
              {furigana.mode === 'hover' ? (
                <span><strong>Mẹo:</strong> Hãy rê chuột vào các chữ Hán ở trên để thấy âm đọc Furigana hiện lên mượt mà.</span>
              ) : furigana.mode === 'off' ? (
                <span><strong>Thông báo:</strong> Chế độ đang tắt — Furigana được ẩn hoàn toàn để bạn tự kiểm tra trí nhớ.</span>
              ) : (
                <span><strong>Thông báo:</strong> Âm đọc Furigana đang luôn hiển thị phía trên chữ Hán với màu {furigana.color}.</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
