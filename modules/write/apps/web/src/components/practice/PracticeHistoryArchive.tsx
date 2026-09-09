import { useEffect, useMemo, useRef, useState } from 'react'
import type { Exercise, JlptLevel } from '../../types/api'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EmptyState } from '../ui/EmptyState'
import { Input } from '../ui/Input'
import { Spinner } from '../ui/Spinner'
import { EXERCISE_TYPE_LABELS, registerLabel } from '../feedback/labels'

export interface PracticeHistoryArchiveProps {
  exercises: Exercise[]
  totalCount?: number
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  onSelectExercise: (exercise: Exercise) => void
  onDeleteExercise?: (exerciseId: string) => Promise<void> | void
  onDeleteAll?: () => Promise<void> | void
  onOpenSettings?: () => void
}

export function PracticeHistoryArchive({
  exercises,
  totalCount,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onSelectExercise,
  onDeleteExercise,
  onDeleteAll,
  onOpenSettings,
}: PracticeHistoryArchiveProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedJlpt, setSelectedJlpt] = useState<JlptLevel | 'ALL'>('ALL')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || loadingMore || !onLoadMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore()
        }
      },
      { rootMargin: '250px' },
    )

    const currentSentinel = sentinelRef.current
    if (currentSentinel) {
      observer.observe(currentSentinel)
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel)
      }
    }
  }, [hasMore, loadingMore, onLoadMore])

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesJlpt = selectedJlpt === 'ALL' || ex.jlpt_level === selectedJlpt
      const query = searchQuery.trim().toLowerCase()
      const matchesQuery =
        !query ||
        ex.topic.toLowerCase().includes(query) ||
        (ex.subtopic && ex.subtopic.toLowerCase().includes(query)) ||
        ex.prompt_vi.toLowerCase().includes(query) ||
        (ex.context && ex.context.toLowerCase().includes(query))

      return matchesJlpt && matchesQuery
    })
  }, [exercises, selectedJlpt, searchQuery])

  const handleDeleteSingle = async (exerciseId: string) => {
    if (!onDeleteExercise) return
    setDeletingId(exerciseId)
    try {
      await onDeleteExercise(exerciseId)
    } finally {
      setDeletingId(null)
    }
  }

  const handleConfirmDeleteAll = async () => {
    if (!onDeleteAll) return
    setDeletingAll(true)
    try {
      await onDeleteAll()
      setShowConfirmDeleteAll(false)
    } finally {
      setDeletingAll(false)
    }
  }

  const jlptTabs: Array<JlptLevel | 'ALL'> = ['ALL', 'N5', 'N4', 'N3', 'N2', 'N1']
  const effectiveTotal = totalCount ?? exercises.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      {/* Compact Search and Filters Bar */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-xs)',
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--glass-border)',
        }}
      >
        <div style={{ flex: '1 1 200px' }}>
          <Input
            id="history-search"
            placeholder="🔍 Tìm kiếm bài tập theo chủ đề hoặc nội dung..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* JLPT Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          {jlptTabs.map((lvl) => {
            const isSelected = selectedJlpt === lvl
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedJlpt(lvl)}
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '11px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  background: isSelected
                    ? 'rgba(168, 85, 247, 0.25)'
                    : 'rgba(255, 255, 255, 0.04)',
                  border: isSelected
                    ? '1px solid var(--color-accent)'
                    : '1px solid var(--glass-border)',
                  color: isSelected ? 'var(--color-foreground)' : 'var(--color-foreground-muted)',
                }}
              >
                {lvl === 'ALL' ? 'Tất cả' : lvl}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: 'auto' }}>
          {onOpenSettings ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon="settings"
              onClick={onOpenSettings}
              style={{ fontSize: '11px', height: '28px', padding: '0 8px' }}
            >
              Cấu hình
            </Button>
          ) : null}

          {onDeleteAll ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon="trash"
              disabled={exercises.length === 0 || deletingAll}
              onClick={() => setShowConfirmDeleteAll(true)}
              style={{
                fontSize: '11px',
                height: '28px',
                padding: '0 8px',
                color: exercises.length > 0 ? 'var(--color-danger, #ef4444)' : 'var(--color-foreground-muted)',
              }}
            >
              Xóa tất cả
            </Button>
          ) : null}
        </div>
      </div>

      {/* Exercise Compact List inside Scroll Container */}
      {filtered.length === 0 ? (
        <EmptyState
          title={exercises.length === 0 ? 'Chưa có bài tập nào' : 'Không tìm thấy bài tập phù hợp'}
          description={
            exercises.length === 0
              ? "Nhấn 'Tạo bài tập' để AI sinh bài tập đầu tiên của bạn."
              : 'Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm.'
          }
        />
      ) : (
        <div
          style={{
            maxHeight: '280px',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            paddingRight: '4px',
          }}
        >
          {filtered.map((exercise) => {
            const isDeleting = deletingId === exercise.id

            return (
              <div
                key={exercise.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectExercise(exercise)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectExercise(exercise)
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--glass-border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: isDeleting ? 0.5 : 1,
                  pointerEvents: isDeleting ? 'none' : 'auto',
                }}
              >
                {/* Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
                  <Badge tone="accent">
                    JLPT {exercise.jlpt_level}
                  </Badge>
                  <Badge tone="neutral">
                    {EXERCISE_TYPE_LABELS[exercise.exercise_type] ?? exercise.exercise_type}
                  </Badge>
                  <span style={{ fontSize: '11px', color: 'var(--color-foreground-muted)' }}>
                    {registerLabel(exercise.register)} · {exercise.difficulty}/10 ⭐
                  </span>
                </div>

                {/* Topic & Prompt snippet */}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--color-foreground)' }}>
                      {exercise.topic}
                    </strong>
                    {exercise.subtopic ? (
                      <span style={{ fontSize: '12px', color: 'var(--color-foreground-muted)' }}>
                        › {exercise.subtopic}
                      </span>
                    ) : null}
                  </div>
                  <p
                    style={{
                      fontSize: '12px',
                      lineHeight: 1.3,
                      color: 'var(--color-foreground-secondary)',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {exercise.prompt_vi}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectExercise(exercise)
                    }}
                    style={{ fontSize: '11px', height: '26px', padding: '0 10px' }}
                  >
                    Luyện tập lại →
                  </Button>

                  {onDeleteExercise ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon="trash"
                      aria-label="Xóa bài tập này"
                      title="Xóa bài tập này"
                      disabled={isDeleting}
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleDeleteSingle(exercise.id)
                      }}
                      style={{
                        height: '24px',
                        width: '24px',
                        minWidth: '24px',
                        padding: 0,
                        color: 'var(--color-danger, #ef4444)',
                        borderColor: 'transparent',
                      }}
                    />
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Infinite Scroll Sentinel & Load More Status */}
      {filtered.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '4px 0' }}>
          <div ref={sentinelRef} style={{ height: '2px', width: '100%' }} />

          {loadingMore ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Spinner size={14} />
              <span style={{ fontSize: '12px', color: 'var(--color-foreground-muted)' }}>
                Đang tải thêm...
              </span>
            </div>
          ) : hasMore && onLoadMore ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onLoadMore}
              style={{ fontSize: '11px', height: '24px', padding: '0 8px' }}
            >
              Tải thêm ({exercises.length}/{effectiveTotal})
            </Button>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--color-foreground-muted)', opacity: 0.8 }}>
              ✓ Đã hiển thị tất cả {effectiveTotal} bài tập
            </span>
          )}
        </div>
      ) : null}

      {/* Confirm Dialog for Delete All */}
      <ConfirmDialog
        open={showConfirmDeleteAll}
        onCancel={() => setShowConfirmDeleteAll(false)}
        onConfirm={() => void handleConfirmDeleteAll()}
        title="Xóa toàn bộ lịch sử bài tập?"
        description={`Hành động này sẽ xóa vĩnh viễn toàn bộ ${effectiveTotal} bài tập đã lưu và các bài làm liên quan. Bạn sẽ không thể khôi phục lại dữ liệu này.`}
        confirmLabel="Xóa tất cả"
        cancelLabel="Hủy"
        destructive={true}
        loading={deletingAll}
      />
    </div>
  )
}
