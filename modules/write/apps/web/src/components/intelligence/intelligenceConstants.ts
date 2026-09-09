import type { BadgeTone } from '../../types/api'

export const DIMENSION_CONFIG: Record<
  string,
  { label: string; icon: string; color: string; desc: string }
> = {
  grammar: {
    label: 'Ngữ pháp & Chia thể',
    icon: 'grammar',
    color: 'var(--color-accent)',
    desc: 'Trợ từ (は/が/に/で), chia thể động từ, liên từ nối vế câu',
  },
  lexicon: {
    label: 'Từ vựng & Cụm từ',
    icon: 'vocabulary',
    color: 'var(--color-info)',
    desc: 'Độ chuẩn xác ngữ nghĩa, kết hợp cụm từ tự nhiên (Collocations)',
  },
  naturalness: {
    label: 'Độ tự nhiên chuẩn Nhật',
    icon: 'target',
    color: 'var(--color-accent)',
    desc: 'Tránh dịch thô tiếng Việt (L1), lược bỏ đại từ, mạch câu thuần Nhật',
  },
  register: {
    label: 'Văn phong & Kính ngữ',
    icon: 'briefcase',
    color: 'var(--color-warning)',
    desc: 'Nhất quán Desu/Masu vs Da/Dearu, kính ngữ Keigo, văn viết vs văn nói',
  },
  discourse: {
    label: 'Bố cục & Mạch lạc',
    icon: 'journey',
    color: 'var(--color-success)',
    desc: 'Tính logic liên kết (Coherence & Cohesion), chuyển ý mượt mà',
  },
}

export function categoryBadgeTone(category: string): BadgeTone {
  switch (category.toLowerCase()) {
    case 'grammar':
      return 'grammar'
    case 'lexicon':
    case 'vocabulary':
      return 'vocabulary'
    case 'naturalness':
      return 'naturalness'
    case 'register':
      return 'register'
    case 'discourse':
      return 'discourse'
    default:
      return 'neutral'
  }
}

export function lifecycleBadgeInfo(state?: string): { label: string; tone: BadgeTone } {
  switch (state) {
    case 'targeted':
      return { label: 'Mục tiêu trọng điểm', tone: 'error' }
    case 'recurrent':
      return { label: 'Tái phát', tone: 'error' }
    case 'recurring':
      return { label: 'Tái diễn', tone: 'warning' }
    case 'improving':
      return { label: 'Đang tiến bộ', tone: 'accent' }
    case 'stable':
      return { label: 'Ổn định', tone: 'accent' }
    case 'mastered':
      return { label: 'Đã làm chủ', tone: 'success' }
    case 'observed':
      return { label: 'Đã ghi nhận', tone: 'info' }
    case 'persistent':
      return { label: 'Dai dẳng', tone: 'error' }
    default:
      return { label: 'Mới xuất hiện', tone: 'info' }
  }
}
