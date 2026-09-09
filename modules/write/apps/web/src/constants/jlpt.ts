export const JLPT_TABS = [
  { id: '', label: 'Tất cả Joyo' },
  { id: 'N5', label: 'JLPT N5' },
  { id: 'N4', label: 'JLPT N4' },
  { id: 'N3', label: 'JLPT N3' },
  { id: 'N2', label: 'JLPT N2' },
  { id: 'N1', label: 'JLPT N1' },
] as const

// Backward compat alias
export const JLPT_LEVELS = JLPT_TABS

export type JlptLevel = (typeof JLPT_TABS)[number]['id']
export const JLPT_LEVEL_IDS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const

export const REGISTER_OPTIONS = [
  { id: 'casual', value: 'casual', label: 'Thân mật (Casual)', icon: '🍵' },
  { id: 'polite', value: 'polite', label: 'Lịch sự (Polite)', icon: '🌸' },
  { id: 'business', value: 'business', label: 'Trang trọng (Business)', icon: '💼' },
] as const
