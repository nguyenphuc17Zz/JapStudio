import type { IconName } from '../components/icons/Icon'

/** Centralized navigation metadata — the single source of truth for the shell.
 *  Do not hard-code navigation lists in components. */

export type NavigationSectionId = 'home' | 'learn' | 'library' | 'progress'
export type ContainerSize = 'compact' | 'default' | 'wide' | 'full'
export type FeatureFlag = 'analytics' | 'quality'

export interface NavigationItem {
  id: string
  /** Vietnamese label shown in the UI */
  label: string
  route: string
  icon: IconName
  section: NavigationSectionId
  /** Exact-match route (e.g. '/') */
  end?: boolean
  /** The item is only shown while the feature is available */
  featureFlag?: FeatureFlag
}

export interface BreadcrumbItem {
  label: string
  route?: string
}

export interface RouteMeta {
  route: string
  title: string
  description?: string
  documentTitle: string
  containerSize: ContainerSize
  breadcrumb?: BreadcrumbItem[]
}

export const NAV_SECTIONS: Array<{ id: NavigationSectionId; label: string }> = [
  { id: 'home', label: 'HOME' },
  { id: 'learn', label: 'LEARN' },
  { id: 'progress', label: 'PROGRESS' },
  { id: 'library', label: 'LIBRARY' },
]

export const NAV_ITEMS: NavigationItem[] = [
  // HOME / Trung tâm chỉ huy & Trí tuệ
  { id: 'dashboard', label: 'Bảng điều khiển', route: '/', icon: 'dashboard', section: 'home', end: true },
  { id: 'intelligence', label: 'Trí tuệ viết', route: '/intelligence', icon: 'sparkles', section: 'home' },

  // LEARN / Luyện viết theo thứ tự ưu tiên & tần suất thực hành
  { id: 'practice', label: 'Luyện tập', route: '/practice', icon: 'practice', section: 'learn' },
  { id: 'rewrite-lab', label: 'Phòng sửa câu', route: '/rewrite-lab', icon: 'sparkles', section: 'learn' },
  { id: 'free-writing', label: 'Viết tự do', route: '/free-writing', icon: 'write', section: 'learn' },
  { id: 'scenario', label: 'Tình huống', route: '/scenario', icon: 'briefcase', section: 'learn' },
  { id: 'simulation', label: 'Mô phỏng', route: '/simulation', icon: 'simulation', section: 'learn' },
  { id: 'challenge', label: 'Thử thách', route: '/challenge', icon: 'challenge', section: 'learn' },
  { id: 'kanji', label: 'Chữ Kanji', route: '/kanji', icon: 'write', section: 'learn' },

  // PROGRESS / Lộ trình & Phân tích tiến độ
  { id: 'journey', label: 'Lộ trình', route: '/journey', icon: 'journey', section: 'progress' },
  { id: 'analytics', label: 'Phân tích', route: '/analytics', icon: 'analytics', section: 'progress', featureFlag: 'analytics' },
  { id: 'ai-quality', label: 'Chất lượng AI', route: '/ai-quality', icon: 'target', section: 'progress', featureFlag: 'quality' },

  // LIBRARY / Kho tư liệu & Hồ sơ cá nhân
  { id: 'vocabulary', label: 'Từ vựng', route: '/vocabulary', icon: 'vocabulary', section: 'library' },
  { id: 'memory', label: 'Trí nhớ', route: '/memory', icon: 'memory', section: 'library' },
  { id: 'history', label: 'Lịch sử', route: '/history', icon: 'history', section: 'library' },

  { id: 'settings', label: 'Cài đặt', route: '/settings', icon: 'settings', section: 'progress' },
]

export const SETTINGS_ITEM: NavigationItem = {
  id: 'settings',
  label: 'Cài đặt',
  route: '/settings',
  icon: 'settings',
  section: 'progress',
}

export const ROUTE_METADATA: RouteMeta[] = [
  {
    route: '/',
    title: 'Hôm nay',
    description: 'Trung tâm học tập hằng ngày — nhiệm vụ, trọng tâm và bài tập gợi ý cho bạn.',
    documentTitle: 'Hôm nay — Japanese Writing Studio',
    containerSize: 'default',
  },
  {
    route: '/practice',
    title: 'Luyện tập',
    description: 'Thực hành dịch Việt – Nhật với trợ giảng AI phân tích ngữ pháp và độ tự nhiên.',
    documentTitle: 'Luyện tập — Japanese Writing Studio',
    containerSize: 'default',
  },
  {
    route: '/rewrite-lab',
    title: 'Phòng sửa câu',
    description: 'Tự sửa lỗi, đối chiếu 6 phong cách viết lại và chuyển giao mẫu câu chuẩn Nhật.',
    documentTitle: 'Phòng sửa câu — Japanese Writing Studio',
    containerSize: 'wide',
  },
  {
    route: '/kanji',
    title: 'Chữ Kanji',
    description: 'Luyện viết nét bút thuận, tra cứu Hán Việt, On/Kun, bộ thủ và rèn luyện thư pháp.',
    documentTitle: 'Chữ Kanji — Japanese Writing Studio',
    containerSize: 'default',
  },
  {
    route: '/free-writing',
    title: 'Viết tự do',
    description: 'Luyện viết đoạn văn, bài luận tự do với đánh giá mạch lạc và văn phong chuyên sâu.',
    documentTitle: 'Viết tự do — Japanese Writing Studio',
    containerSize: 'wide',
  },
  {
    route: '/scenario',
    title: 'Tình huống',
    description: 'Nhiệm vụ viết thực tế theo bối cảnh công việc, thương mại và đời sống Nhật Bản.',
    documentTitle: 'Tình huống — Japanese Writing Studio',
    containerSize: 'default',
  },
  {
    route: '/simulation',
    title: 'Mô phỏng hội thoại',
    description: 'Tương tác hội thoại nhiều lượt theo vai diễn thực tế cùng AI Persona.',
    documentTitle: 'Mô phỏng hội thoại — Japanese Writing Studio',
    containerSize: 'wide',
  },
  {
    route: '/challenge',
    title: 'Thử thách',
    description: 'Rèn phản xạ và tốc độ viết tiếng Nhật dưới áp lực thời gian và mục tiêu cụ thể.',
    documentTitle: 'Thử thách — Japanese Writing Studio',
    containerSize: 'default',
  },
  {
    route: '/vocabulary',
    title: 'Từ vựng',
    description: 'Sổ từ vựng thông minh tự động trích xuất và phân tích từ bài viết của bạn.',
    documentTitle: 'Từ vựng — Japanese Writing Studio',
    containerSize: 'default',
  },
  {
    route: '/vocabulary/:id',
    title: 'Chi tiết từ vựng',
    documentTitle: 'Chi tiết từ vựng — Japanese Writing Studio',
    containerSize: 'default',
    breadcrumb: [{ label: 'Từ vựng', route: '/vocabulary' }],
  },
  {
    route: '/history',
    title: 'Lịch sử',
    description: 'Tra cứu toàn bộ bài viết đã nộp và xem lại nhận xét đánh giá chi tiết.',
    documentTitle: 'Lịch sử — Japanese Writing Studio',
    containerSize: 'default',
  },
  {
    route: '/memory',
    title: 'Trí nhớ AI',
    description: 'Hồ sơ ghi nhớ thói quen, phong cách và chặng đường học tập của bạn.',
    documentTitle: 'Trí nhớ AI — Japanese Writing Studio',
    containerSize: 'default',
  },
  {
    route: '/journey',
    title: 'Lộ trình',
    description: 'Lộ trình chinh phục năng lực viết tiếng Nhật qua từng cột mốc và mục tiêu.',
    documentTitle: 'Lộ trình — Japanese Writing Studio',
    containerSize: 'default',
  },
  {
    route: '/intelligence',
    title: 'Trí tuệ viết',
    description: 'Đánh giá làm chủ 8 chiều, Đấu trường Boss, Kế hoạch 70/20/10 và biểu đạt tự nhiên.',
    documentTitle: 'Trí tuệ viết — Japanese Writing Studio',
    containerSize: 'wide',
  },
  {
    route: '/analytics',
    title: 'Phân tích',
    description: 'Báo cáo tổng quan số liệu, thời lượng thực hành và xu hướng tiến bộ ngôn ngữ.',
    documentTitle: 'Phân tích — Japanese Writing Studio',
    containerSize: 'wide',
  },
  {
    route: '/ai-quality',
    title: 'Chất lượng AI',
    description: 'Giám sát độ chính xác, tỷ lệ nhất quán và benchmark các mô hình AI.',
    documentTitle: 'Chất lượng AI — Japanese Writing Studio',
    containerSize: 'wide',
  },
  {
    route: '/settings',
    title: 'Cài đặt',
    description: 'Cấu hình nhà cung cấp AI, khóa API, cấp độ JLPT và mục tiêu cá nhân.',
    documentTitle: 'Cài đặt — Japanese Writing Studio',
    containerSize: 'default',
  },
  {
    route: '/design-system',
    title: 'Design System',
    documentTitle: 'Design System — Japanese Writing Studio',
    containerSize: 'wide',
  },
]

export interface NavVisibility {
  analytics: boolean
  quality: boolean
}

/** Items visible in the sidebar given current feature availability. */
export function getVisibleNavItems(visibility: NavVisibility): NavigationItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.featureFlag === 'analytics') return visibility.analytics
    if (item.featureFlag === 'quality') return visibility.quality
    return true
  })
}

/** Route metadata for a concrete pathname (supports '/vocabulary/:id' style). */
export function routeMetaFor(pathname: string): RouteMeta | undefined {
  const exact = ROUTE_METADATA.find((meta) => meta.route === pathname)
  if (exact) return exact
  return ROUTE_METADATA.find(
    (meta) =>
      meta.route.includes(':') &&
      pathname.startsWith(meta.route.slice(0, meta.route.indexOf(':'))),
  )
}

/* ---------- Mobile bottom navigation ---------- */

export type MobileNavKey = 'home' | 'practice' | 'journey' | 'library' | 'more'

export interface MobileBottomNavItem {
  key: MobileNavKey
  label: string
  icon: IconName
  route?: string
  /** Drawer contents when this item opens one */
  drawer?: 'library' | 'more'
}

export const MOBILE_BOTTOM_NAV: MobileBottomNavItem[] = [
  { key: 'home', label: 'Trang chủ', icon: 'home', route: '/' },
  { key: 'practice', label: 'Luyện tập', icon: 'practice', route: '/practice' },
  { key: 'journey', label: 'Lộ trình', icon: 'journey', route: '/journey' },
  { key: 'library', label: 'Thư viện', icon: 'vocabulary', drawer: 'library' },
  { key: 'more', label: 'Thêm', icon: 'dots', drawer: 'more' },
]

/** Items shown inside the "more" drawer (bottom nav overflow). */
export function getMoreDrawerItems(visibility: NavVisibility): NavigationItem[] {
  return [
    NAV_ITEMS.find((item) => item.id === 'intelligence')!,
    NAV_ITEMS.find((item) => item.id === 'rewrite-lab')!,
    NAV_ITEMS.find((item) => item.id === 'free-writing')!,
    NAV_ITEMS.find((item) => item.id === 'scenario')!,
    NAV_ITEMS.find((item) => item.id === 'simulation')!,
    NAV_ITEMS.find((item) => item.id === 'challenge')!,
    NAV_ITEMS.find((item) => item.id === 'kanji')!,
    ...(visibility.analytics ? [NAV_ITEMS.find((item) => item.id === 'analytics')!] : []),
    ...(visibility.quality ? [NAV_ITEMS.find((item) => item.id === 'ai-quality')!] : []),
    SETTINGS_ITEM,
  ].filter(Boolean)
}

/** Items shown inside the "library" drawer. */
export function getLibraryDrawerItems(): NavigationItem[] {
  return ['vocabulary', 'memory', 'history'].map((id) => NAV_ITEMS.find((item) => item.id === id)!)
}

/** True when the pathname belongs to a drawer item (keeps the tab active). */
export function pathMatchesDrawer(pathname: string, drawer: 'library' | 'more', visibility: NavVisibility): boolean {
  const items = drawer === 'library' ? getLibraryDrawerItems() : getMoreDrawerItems(visibility)
  return items.some((item) => pathname === item.route || pathname.startsWith(`${item.route}/`))
}