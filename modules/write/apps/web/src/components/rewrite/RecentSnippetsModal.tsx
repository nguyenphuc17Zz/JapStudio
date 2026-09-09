import React, { useState, useEffect } from 'react'
import type { RecentSnippetItem } from '../../types/api'
import { api } from '../../services/api'
import { Dialog } from '../ui/Dialog'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Tabs } from '../ui/Tabs'
import { Spinner } from '../ui/Spinner'
import { EmptyState } from '../ui/EmptyState'
import { sound } from '../../services/sound'

interface RecentSnippetsModalProps {
  open: boolean
  onClose: () => void
  onSelectSnippet: (snippet: RecentSnippetItem) => void
}

export const RecentSnippetsModal: React.FC<RecentSnippetsModalProps> = ({
  open,
  onClose,
  onSelectSnippet,
}) => {
  const [snippets, setSnippets] = useState<RecentSnippetItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (open) {
      fetchSnippets()
    }
  }, [open])

  const fetchSnippets = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getRecentSnippets(30)
      setSnippets(res.snippets || [])
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || 'Không thể tải lịch sử câu đã viết.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (snippet: RecentSnippetItem) => {
    sound.playSuccess()
    onSelectSnippet(snippet)
    onClose()
  }

  const tabsConfig = [
    { id: 'all', label: 'Tất cả' },
    { id: 'practice', label: '🎯 Luyện dịch' },
    { id: 'challenge', label: '⚡ Thử thách' },
    { id: 'free_writing', label: '✍️ Viết tự do' },
    { id: 'simulation', label: '💬 Hội thoại' },
    { id: 'weakness', label: '⚠️ Điểm yếu' },
  ]

  const filteredSnippets = snippets.filter((s) => {
    if (selectedSource !== 'all' && s.source_type !== selectedSource) {
      return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchText = s.text.toLowerCase().includes(q)
      const matchTitle = s.source_title?.toLowerCase().includes(q)
      const matchContext = s.context_vi?.toLowerCase().includes(q)
      return matchText || matchTitle || matchContext
    }
    return true
  })

  const getSourceBadge = (type: string) => {
    switch (type) {
      case 'practice':
        return <Badge tone="accent">Luyện dịch</Badge>
      case 'challenge':
        return <Badge tone="warning">Thử thách</Badge>
      case 'free_writing':
        return <Badge tone="ai">Viết tự do</Badge>
      case 'simulation':
        return <Badge tone="neutral">Hội thoại</Badge>
      case 'weakness':
        return <Badge tone="error">Điểm yếu</Badge>
      default:
        return <Badge tone="neutral">{type}</Badge>
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="📥 Lấy câu từ bài viết & lịch sử luyện tập gần đây"
      size="lg"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* Filter bar & Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <Tabs
            items={tabsConfig}
            value={selectedSource}
            onChange={setSelectedSource}
            variant="pills"
          />
          <Input
            id="search-snippets-input"
            label=""
            placeholder="Tìm kiếm theo từ vựng hoặc ngữ cảnh..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Tìm kiếm câu đã viết"
          />
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-xl)' }}>
            <Spinner size={24} label="Đang tải các câu đã viết gần đây..." />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{ color: 'var(--color-danger)', fontSize: 'var(--text-body-sm)', padding: 'var(--space-sm)' }}>
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredSnippets.length === 0 && (
          <EmptyState
            title="Chưa có câu nào trong danh mục này"
            description="Hãy hoàn thành một vài bài tập dịch, bài viết tự do hoặc hội thoại mô phỏng trước để hệ thống tự động ghi nhận câu của bạn."
            action={
              <Button variant="ghost" size="sm" onClick={fetchSnippets} aria-label="Tải lại">
                🔄 Tải lại
              </Button>
            }
          />
        )}

        {/* Snippets List */}
        {!loading && filteredSnippets.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-sm)',
              maxHeight: '400px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {filteredSnippets.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: 'var(--space-md)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                  e.currentTarget.style.background = 'var(--color-surface-elevated)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.background = 'var(--color-surface)'
                }}
                aria-label={`Chọn câu: ${item.text}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                    {getSourceBadge(item.source_type)}
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
                      {item.source_title}
                    </span>
                  </div>
                  <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)' }}>
                    {new Date(item.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <div style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-foreground)' }}>
                  {item.text}
                </div>

                {item.context_vi && (
                  <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-secondary)' }}>
                    Ý định: {item.context_vi}
                  </div>
                )}

                {item.issue_preview && (
                  <div style={{ fontSize: 'var(--text-micro)', color: 'var(--color-warning)' }}>
                    ⚠️ {item.issue_preview}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  )
}
