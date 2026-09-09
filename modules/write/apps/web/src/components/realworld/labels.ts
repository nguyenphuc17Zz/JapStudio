export const GENRE_LABELS: Record<string, string> = {
  business_email: 'Email công việc',
  casual_message: 'Tin nhắn thân mật',
  business_chat: 'Chat công việc',
  meeting_followup: 'Email sau cuộc họp',
  status_report: 'Báo cáo tiến độ',
  incident_report: 'Báo cáo sự cố',
  bug_report: 'Báo cáo lỗi',
  requirement_clarification: 'Làm rõ yêu cầu',
  customer_response: 'Phản hồi khách hàng',
  request: 'Lời đề nghị',
  apology: 'Lời xin lỗi',
  proposal: 'Đề xuất',
  opinion: 'Ý kiến cá nhân',
  sns_post: 'Bài đăng mạng xã hội',
  review: 'Đánh giá',
  personal_note: 'Ghi chú cá nhân',
  experience_story: 'Chia sẻ trải nghiệm',
}

export const MEDIUM_LABELS: Record<string, string> = {
  email: 'Email',
  chat: 'Chat',
  sns: 'Mạng xã hội',
  report: 'Báo cáo',
  document: 'Tài liệu',
  ticket: 'Vé hỗ trợ',
  comment: 'Bình luận',
  memo: 'Ghi chú',
  proposal: 'Đề xuất',
  presentation_notes: 'Ghi chú thuyết trình',
}

export const REGISTER_LABELS: Record<string, string> = {
  casual: 'Thân mật',
  polite: 'Lịch sự',
  business: 'Kinh doanh',
  mixed: 'Hỗn hợp',
}

export const TONE_LABELS: Record<string, string> = {
  friendly: 'Thân thiện',
  neutral: 'Trung lập',
  polite: 'Lịch sự',
  professional: 'Chuyên nghiệp',
  apologetic: 'Xin lỗi',
  persuasive: 'Thuyết phục',
  conciliatory: 'Hòa giải',
  firm: 'Kiên quyết',
}

export const CHALLENGE_TYPE_LABELS: Record<string, string> = {
  naturalness: 'Tự nhiên',
  register: 'Ngữ điệu',
  vocabulary: 'Từ vựng',
  compression: 'Rút gọn',
  expansion: 'Mở rộng',
  nuance: 'Sắc thái',
  error_fix: 'Sửa lỗi',
}

export function genreLabel(genre: string): string {
  return GENRE_LABELS[genre] ?? genre
}

export function mediumLabel(medium: string): string {
  return MEDIUM_LABELS[medium] ?? medium
}

export function registerLabel(register: string): string {
  return REGISTER_LABELS[register] ?? register
}

export function toneLabel(tone: string): string {
  return TONE_LABELS[tone] ?? tone
}

export function challengeTypeLabel(type: string): string {
  return CHALLENGE_TYPE_LABELS[type] ?? type
}