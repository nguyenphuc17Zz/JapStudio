import { EmptyState } from '../../ui/EmptyState'
import { LoadingSpinner } from '../../LoadingSpinner'
import { Button } from '../../ui/Button'
import type { SimulationHistoryItem } from '../../../types/api'

export interface SimulationHistoryProps {
  items: SimulationHistoryItem[]
  loading: boolean
  currentId: string | null
  onOpen: (sessionId: string) => void
  onNavigatePractice: () => void
}

function statusLabel(item: SimulationHistoryItem): string {
  if (item.status === 'active') return 'Đang diễn ra'
  return item.resolution ?? 'Đã kết thúc'
}

export function SimulationHistory({
  items,
  loading,
  currentId,
  onOpen,
  onNavigatePractice,
}: SimulationHistoryProps) {
  return (
    <aside className="jw-sim-history" aria-label="Mô phỏng gần đây">
      <h3>Mô phỏng gần đây</h3>
      {loading ? (
        <LoadingSpinner label="Đang tải..." />
      ) : items.length > 0 ? (
        <ul className="jw-sim-history-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="jw-sim-history-row"
                onClick={() => onOpen(item.id)}
                aria-current={item.id === currentId ? 'true' : undefined}
              >
                <strong>{item.simulation_type}</strong>
                <span>
                  {item.mode === 'guided' ? 'Có hướng dẫn' : 'Đắm chìm'} · {item.turn_count} lượt
                  {item.average_overall !== null ? ` · ${item.average_overall}/100` : ''}
                </span>
                <span className="jw-sim-history-status">
                  {statusLabel(item)}
                  {item.id === currentId ? ' · đang xem' : ''}
                </span>
                <span className="jw-sim-history-date">
                  {new Date(item.created_at).toLocaleDateString('vi-VN')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Chưa có mô phỏng nào"
          description="Bắt đầu mô phỏng đầu tiên để luyện giao tiếp."
        />
      )}
      <div className="jw-sim-history-back">
        <Button variant="ghost" size="sm" onClick={onNavigatePractice}>
          Tới trang luyện tập
        </Button>
      </div>
    </aside>
  )
}