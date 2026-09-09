import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Tabs } from '../ui/Tabs'
import { Icon } from '../icons/Icon'
import { GUIDE_ITEMS } from '../../constants/systemGuide'

export interface SystemGuideModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: string
}

export function SystemGuideModal({ isOpen, onClose, initialTab = 'workflow' }: SystemGuideModalProps) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<string>(initialTab)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Sync initial tab when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
      setSearchQuery('')
      setDebouncedSearch('')
    }
  }, [isOpen, initialTab])

  useEffect(() => {
    // In test, debounce is instant
    if (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: { MODE?: string } }).env?.MODE === 'test') {
      setDebouncedSearch(searchQuery)
      return
    }
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery), 250)
    return () => window.clearTimeout(t)
  }, [searchQuery])

  // Filter items based on active tab and search query (debounced)
  const filteredItems = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    return GUIDE_ITEMS.filter((item) => {
      // If there is a search query, search across ALL categories
      if (query.length > 0) {
        const matchTitle = item.title.toLowerCase().includes(query)
        const matchSubtitle = item.subtitle.toLowerCase().includes(query)
        const matchPurpose = item.purpose.toLowerCase().includes(query)
        const matchWhen = item.whenToUse.toLowerCase().includes(query)
        const matchTips = item.proTips.some((t) => t.toLowerCase().includes(query))
        const matchHow = item.howToUse.some((h) => h.toLowerCase().includes(query))
        return matchTitle || matchSubtitle || matchPurpose || matchWhen || matchTips || matchHow
      }
      // Otherwise filter strictly by category tab
      return item.category === activeTab
    })
  }, [activeTab, debouncedSearch])

  // Lock body scroll and handle Escape key while modal is open
  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleNavigate = (route?: string) => {
    if (route) {
      onClose()
      navigate(route)
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-guide-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="jw-card"
        style={{
          width: '100%',
          maxWidth: 1060,
          maxHeight: 'min(90vh, 860px)',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        {/* Sticky Modal Header */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            padding: '12px 20px',
            borderBottom: '1px solid var(--color-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-subtle)',
                border: '1px solid var(--color-border-default)',
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="sparkles" size={18} />
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                <h2 id="system-guide-title" style={{ fontSize: 15.5, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                  CẨM NANG HƯỚNG DẪN SỬ DỤNG TOÀN DIỆN (SYSTEM PLAYBOOK)
                </h2>
                <Badge tone="accent">23 PHASES</Badge>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-foreground-secondary)', margin: '2px 0 0' }}>
                Hướng dẫn chi tiết toàn bộ tính năng, khi nào nên dùng, bí quyết học hiệu quả và luồng dữ liệu liên kết.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cẩm nang"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-subtle)',
              background: 'transparent',
              color: 'var(--color-foreground-muted)',
              cursor: 'pointer',
              fontSize: 16,
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
          >
            ✕
          </button>
        </div>

        {/* Search & Sticky Tabs Bar */}
        <div
          style={{
            position: 'sticky',
            top: 60,
            zIndex: 20,
            backgroundColor: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}
        >
          {/* Quick Search Bar */}
          <div
            style={{
              padding: '8px 20px',
              borderBottom: !searchQuery ? '1px solid var(--color-border-subtle)' : 'none',
              backgroundColor: 'var(--color-surface)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
            }}
          >
            <div style={{ flex: 1 }}>
              <Input
                id="guide-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhanh tính năng, bí quyết, phím tắt... (ví dụ: boss, 70/20/10, rewrite, kanji, furigana, collocation)"
                aria-label="Tìm kiếm hướng dẫn"
              />
            </div>
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                Xóa tìm kiếm
              </Button>
            )}
          </div>

          {/* Category Tabs (Hidden during active global search) */}
          {!searchQuery && (
            <div
              style={{
                padding: '6px 20px',
                backgroundColor: 'var(--color-surface-subtle)',
              }}
            >
              <Tabs
                variant="pills"
                items={[
                  { id: 'workflow', label: '1. Hành Trình Học Chuẩn' },
                  { id: 'practice', label: '2. Phòng Luyện Viết' },
                  { id: 'intelligence', label: '3. Đầu Não Trí Tuệ & Boss' },
                  { id: 'library', label: '4. Kho Tư Liệu & Lộ Trình' },
                  { id: 'zen', label: '5. Công Cụ Thiền Zen & Năng Suất' },
                  { id: 'settings', label: '6. Cấu Hình AI' },
                ]}
                value={activeTab}
                onChange={(val) => setActiveTab(val)}
              />
            </div>
          )}
        </div>

        {/* Scrollable Content Container */}
        <div
          style={{
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)',
            flex: 1,
          }}
        >
          {searchQuery && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--color-foreground-secondary)' }}>
                Kết quả tìm kiếm cho: <strong>"{searchQuery}"</strong> ({filteredItems.length} mục phù hợp)
              </span>
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div
              style={{
                padding: '48px 0',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 32 }}>🔍</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Không tìm thấy tính năng phù hợp</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-foreground-secondary)' }}>
                Hãy thử tìm với các từ khóa khác như "dịch", "boss", "lộ trình", "kanji", "từ vựng", "70/20/10".
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <Card key={item.id} variant="default" style={{ border: '1px solid var(--color-border)' }}>
                <CardHeader
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-primary)',
                            flexShrink: 0,
                          }}
                        >
                          <Icon name={item.icon} size={15} />
                        </span>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>{item.title}</h3>
                          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-foreground-secondary)' }}>
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                        <Badge tone={item.badgeTone}>{item.badge}</Badge>
                        {item.route && (
                          <Button variant="secondary" size="sm" onClick={() => handleNavigate(item.route)}>
                            Mở Trực Tiếp →
                          </Button>
                        )}
                      </div>
                    </div>
                  }
                />
                <CardContent style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {/* Grid 2 Column: Purpose & When to use */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
                    <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)' }}>
                      <span className="jw-card-eyebrow" style={{ color: 'var(--color-primary)' }}>📌 Mục Đích & Bản Chất</span>
                      <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.6 }}>{item.purpose}</p>
                    </div>

                    <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)' }}>
                      <span className="jw-card-eyebrow" style={{ color: 'var(--color-accent)' }}>⏱️ Khi Nào Nên Dùng?</span>
                      <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.6 }}>{item.whenToUse}</p>
                    </div>
                  </div>

                  {/* How to use steps */}
                  <div>
                    <span className="jw-card-eyebrow">🛠️ Các Bước Thao Tác Chuẩn</span>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {item.howToUse.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Pro Tips & Synergy Box */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
                    <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(16, 185, 129, 0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <span className="jw-card-eyebrow" style={{ color: '#10b981' }}>💡 Bí Quyết Học Hiệu Quả (Pro Tips)</span>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 16, fontSize: 12.5, lineHeight: 1.6, color: 'var(--color-foreground)' }}>
                        {item.proTips.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(139, 92, 246, 0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                      <span className="jw-card-eyebrow" style={{ color: 'var(--color-ai)' }}>🔗 Mối Liên Kết Dữ Liệu</span>
                      <p style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.6 }}>{item.synergy}</p>
                    </div>
                  </div>

                  {/* Pitfalls if available */}
                  {item.pitfalls && item.pitfalls.length > 0 && (
                    <div style={{ padding: 'var(--space-xs) var(--space-md)', background: 'rgba(239, 68, 68, 0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#ef4444' }}>⚠️ Cạm bẫy cần tránh: </span>
                      <span style={{ fontSize: 12.5 }}>{item.pitfalls.join('; ')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Sticky Modal Footer */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 30,
            padding: '10px 20px',
            borderTop: '1px solid var(--color-border-subtle)',
            backgroundColor: 'var(--color-surface)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 12, color: 'var(--color-foreground-secondary)' }}>
            <span>💡 <strong>Phím tắt nhanh:</strong> Bấm phím</span>
            <kbd style={{ padding: '2px 6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: 4, fontFamily: 'monospace' }}>?</kbd>
            <span>ở bất kỳ trang nào để mở Cẩm nang hướng dẫn này.</span>
          </div>

          <Button variant="primary" size="sm" onClick={onClose}>
            Đã Hiểu & Đóng Cẩm Nang
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
