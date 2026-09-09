import type {
  EvaluationScores,
  IssueCategory,
  IssueSeverity,
  Register,
} from '../../types/api'

export const REGISTER_LABELS: Record<string, string> = {
  casual: 'Thân mật',
  polite: 'Lịch sự',
  business: 'Kinh doanh',
  mixed: 'Hỗn hợp',
}

export const EXERCISE_TYPE_LABELS: Record<string, string> = {
  sentence_translation: 'Dịch câu',
  multi_sentence_translation: 'Dịch nhiều câu',
  paragraph_translation: 'Dịch đoạn văn',
  free_writing: 'Viết tự do',
  register_challenge: 'Thử thách ngữ điệu',
}

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  grammar: 'Ngữ pháp',
  vocabulary: 'Từ vựng',
  naturalness: 'Tự nhiên',
  register: 'Ngữ điệu',
  semantic: 'Ý nghĩa',
}

export const SEVERITY_LABELS: Record<IssueSeverity, string> = {
  critical: 'Nghiêm trọng',
  major: 'Đáng chú ý',
  minor: 'Nhẹ',
  info: 'Góp ý',
}

export const SEVERITY_RANK: Record<IssueSeverity, number> = {
  critical: 0,
  major: 1,
  minor: 2,
  info: 3,
}

export const DIMENSION_ORDER: Array<{
  key: keyof EvaluationScores
  label: string
  highlight?: boolean
}> = [
  { key: 'semantic_score', label: 'Ý nghĩa' },
  { key: 'grammar_score', label: 'Ngữ pháp' },
  { key: 'vocabulary_score', label: 'Từ vựng' },
  { key: 'naturalness_score', label: 'Tự nhiên', highlight: true },
  { key: 'context_fit_score', label: 'Hợp ngữ cảnh' },
  { key: 'register_fit_score', label: 'Đúng phong cách' },
]

export const TARGET_LENGTH_LABELS: Record<string, string> = {
  short_sentence: '1 câu ngắn',
  sentence: '1 câu',
  multi_sentence: '2–3 câu',
  paragraph: 'Đoạn văn (80–150 chữ)',
  long_writing: 'Bài viết dài (150–300+ chữ)',
}

export const TARGET_CHARS: Record<string, number> = {
  short_sentence: 20,
  sentence: 40,
  multi_sentence: 80,
  paragraph: 120,
  long_writing: 200,
}

export function registerLabel(register: Register | string): string {
  return REGISTER_LABELS[register] ?? register
}