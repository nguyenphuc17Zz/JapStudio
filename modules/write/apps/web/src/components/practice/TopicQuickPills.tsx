import { useEffect, useState } from 'react'
import type { ExerciseType, JlptLevel, Register } from '../../types/api'
import { api } from '../../services/api'

export interface QuickTopicItem {
  id: string
  label: string
  icon: string
  topic: string
  jlptLevel?: JlptLevel
  register?: Register
  exerciseType?: ExerciseType
  difficulty?: number
}

const POPULAR_TOPICS_FALLBACK: QuickTopicItem[] = [
  { id: 'food', label: 'Ẩm thực & Quán ăn', icon: '🍜', topic: 'Ẩm thực & Đặt bàn nhà hàng Nhật Bản', jlptLevel: 'N4', register: 'polite', difficulty: 4 },
  { id: 'travel', label: 'Du lịch & Khách sạn', icon: '✈️', topic: 'Du lịch Kyoto & Hỏi đường, thủ tục khách sạn', jlptLevel: 'N4', register: 'polite', difficulty: 5 },
  { id: 'business', label: 'Công sở & Email xin phép', icon: '💼', topic: 'Email công sở xin nghỉ phép và bàn giao công việc', jlptLevel: 'N3', register: 'business', difficulty: 7 },
  { id: 'anime', label: 'Anime & Văn hóa Nhật', icon: '🎌', topic: 'Bình luận cảm nhận về phim anime và văn hóa Otaku', jlptLevel: 'N3', register: 'casual', difficulty: 6 },
  { id: 'daily', label: 'Đời sống & Mua sắm', icon: '🛒', topic: 'Mua sắm tại siêu thị và đời sống sinh hoạt ở Tokyo', jlptLevel: 'N4', register: 'casual', difficulty: 4 },
  { id: 'friendship', label: 'Giao lưu & Hẹn hò', icon: '💬', topic: 'Trò chuyện kết bạn, rủ đi cà phê cuối tuần', jlptLevel: 'N4', register: 'casual', difficulty: 4 },
  { id: 'tech', label: 'Công nghệ & AI', icon: '🤖', topic: 'Thảo luận xu hướng công nghệ trí tuệ nhân tạo tương lai', jlptLevel: 'N2', register: 'business', difficulty: 8 },
]

// Dynamic fetch — falls back to static list if API unavailable (offline-first)
async function fetchPopularTopics(): Promise<QuickTopicItem[]> {
  try {
    const res = await api.getPopularTopics()
    if (Array.isArray(res) && res.length > 0) return res as QuickTopicItem[]
  } catch {
    // offline or not configured
  }
  return POPULAR_TOPICS_FALLBACK
}

function usePopularTopics() {
  const [topics, setTopics] = useState<QuickTopicItem[]>(POPULAR_TOPICS_FALLBACK)
  useEffect(() => {
    void fetchPopularTopics().then(setTopics)
  }, [])
  return topics
}

export interface TopicQuickPillsProps {
  selectedTopic?: string
  onSelectTopic: (topic: QuickTopicItem) => void
}

export function TopicQuickPills({ selectedTopic, onSelectTopic }: TopicQuickPillsProps) {
  const topics = usePopularTopics()
  return (
    <div className="jw-quick-topics-container">
      <span className="jw-quick-topics-label">
        💡 <strong>Gợi ý chủ đề nhanh:</strong>
      </span>
      <div className="jw-quick-topics-grid" role="group" aria-label="Gợi ý chủ đề nhanh">
        {topics.map((item) => {
          const isSelected =
            Boolean(selectedTopic) &&
            (selectedTopic === item.topic || selectedTopic?.includes(item.label))

          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isSelected}
              className={`jw-quick-topic-pill ${isSelected ? 'jw-quick-topic-pill--active' : ''}`}
              onClick={() => onSelectTopic(item)}
              title={`Nhấp để tự động điền chủ đề: ${item.topic}`}
            >
              <span className="jw-quick-topic-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="jw-quick-topic-name">{item.label}</span>
              {item.jlptLevel && (
                <span className="jw-quick-topic-level">{item.jlptLevel}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
