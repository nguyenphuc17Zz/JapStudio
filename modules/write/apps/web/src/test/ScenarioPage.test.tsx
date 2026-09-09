import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ScenarioPage from '../pages/ScenarioPage'
import type {
  MissionEvaluationResponse,
  MissionTaxonomyResponse,
  RealWorldMission,
  TransitionToSimulationResponse,
} from '../types/api'

const taxonomy: MissionTaxonomyResponse = {
  categories: [
    { id: 'work', label_vi: 'Công sở & Doanh nghiệp', label_ja: '仕事・ビジネス', icon: '💼', description: 'Giao tiếp công sở', action_count: 8 },
    { id: 'daily_life', label_vi: 'Đời sống Thường ngày', label_ja: '日常生活', icon: '🏠', description: 'Giao tiếp sinh hoạt', action_count: 6 },
    { id: 'services', label_vi: 'Dịch vụ & Giao dịch', label_ja: 'サービス・店舗', icon: '🏪', description: 'Giao dịch cửa hàng', action_count: 5 },
    { id: 'social', label_vi: 'Xã hội & Bạn bè', label_ja: 'ソーシャル・友人', icon: '👥', description: 'Giao tiếp bạn bè', action_count: 4 },
  ],
  actions: [
    {
      action_type: 'progress_update',
      category: 'work',
      label_vi: 'Báo cáo tiến độ dự án',
      label_ja: '進捗報告',
      default_register: 'business',
      recommended_jlpt: ['N3', 'N2', 'N1'],
      default_medium: 'email',
      typical_role_vi: 'Kỹ sư BrSE',
      typical_recipient_vi: 'Trưởng phòng Sato',
      communicative_purpose_vi: 'Báo cáo tiến độ và dời lịch',
    },
    {
      action_type: 'cancelling_plans',
      category: 'daily_life',
      label_vi: 'Hủy / Thay đổi lịch hẹn',
      label_ja: '予定の変更・キャンセル',
      default_register: 'polite',
      recommended_jlpt: ['N5', 'N4', 'N3'],
      default_medium: 'chat',
      typical_role_vi: 'Người bạn',
      typical_recipient_vi: 'Tanaka-san',
      communicative_purpose_vi: 'Xin hoãn lịch hẹn vì bận',
    },
  ],
  prompt_modes: [
    {
      mode: 'vietnamese_scenario',
      mode_code: 'A',
      label_vi: 'Chế độ A: Kịch bản Song ngữ (VI + JA)',
      description_vi: 'Đọc bối cảnh tiếng Việt, kích hoạt từ vựng tiếng Nhật',
      recommended_level: 'N5 / N4',
    },
    {
      mode: 'japanese_scenario',
      mode_code: 'B',
      label_vi: 'Chế độ B: Kịch bản Tiếng Nhật 100%',
      description_vi: 'Đắm chìm hoàn toàn trong tiếng Nhật',
      recommended_level: 'N3',
    },
    {
      mode: 'contextual_simulation',
      mode_code: 'C',
      label_vi: 'Chế độ C: Hộp thư In-Basket / Tin nhắn phản hồi',
      description_vi: 'Đọc email/tin nhắn đến và viết thư hồi đáp trực tiếp',
      recommended_level: 'N2 / N1',
    },
  ],
  evaluation_dimensions: [
    { key: 'task_completion', label_vi: 'Mục tiêu giao tiếp', label_ja: 'タスク達成', description_vi: 'Đạt mục tiêu', weight: 0.15 },
    { key: 'factual_completeness', label_vi: 'Đầy đủ thông tin', label_ja: '情報完全性', description_vi: 'Đủ chi tiết', weight: 0.1 },
    { key: 'naturalness', label_vi: 'Độ tự nhiên', label_ja: '自然さ', description_vi: 'Thuần Nhật', weight: 0.1 },
    { key: 'grammar', label_vi: 'Ngữ pháp & Trợ từ', label_ja: '文法・助詞', description_vi: 'Đúng ngữ pháp', weight: 0.1 },
    { key: 'vocabulary', label_vi: 'Từ vựng', label_ja: '語彙', description_vi: 'Đúng thuật ngữ', weight: 0.1 },
    { key: 'register', label_vi: 'Văn phong', label_ja: '文体', description_vi: 'Đúng hoàn cảnh', weight: 0.1 },
    { key: 'politeness', label_vi: 'Mức độ lịch thiệp', label_ja: '敬語', description_vi: 'Kính ngữ chuẩn', weight: 0.1 },
    { key: 'tone', label_vi: 'Sắc thái cảm xúc', label_ja: 'トーン', description_vi: 'Thấu hiểu đối phương', weight: 0.05 },
    { key: 'clarity', label_vi: 'Độ mạch lạc', label_ja: '明瞭さ', description_vi: 'Dễ hiểu', weight: 0.1 },
    { key: 'discourse', label_vi: 'Bố cục', label_ja: '談話構成', description_vi: 'Cấu trúc thư từ', weight: 0.1 },
  ],
}

const mission: RealWorldMission = {
  id: 'mission-123',
  category: 'work',
  action_type: 'progress_update',
  prompt_mode: 'contextual_simulation',
  role: 'Kỹ sư phần mềm BrSE',
  recipient: 'Trưởng phòng Sato (佐藤部長)',
  relationship: 'Cấp dưới - Trưởng phòng',
  objective: 'Báo cáo tiến độ API và xin dời lịch kiểm thử',
  situation_vi: 'Bạn đang phát triển tính năng API.',
  context_vi: 'Viết email báo cáo tiến độ gửi Trưởng phòng Sato.',
  situation_ja: '現在開発中です。',
  context_ja: '佐藤部長宛てに進捗報告メールを作成してください。',
  incoming_message: 'お疲れ様です。佐藤です。API連携機能の進捗状況はどうなっていますか？',
  constraints: ['Phải xin lỗi trước khi nêu lý do', 'Đưa ra thời gian dự kiến mới'],
  required_points: [
    { id: 'pt_1', description: 'Báo cáo tiến độ 90%' },
    { id: 'pt_2', description: 'Lý do hoãn do server bảo trì' },
  ],
  target_register: 'business',
  optional_vocabulary: [
    { word: '進捗', reading: 'しんちょく', meaning: 'tiến độ', example: '進捗状況をご報告いたします。' },
  ],
  success_conditions: ['Đủ 2 điểm bắt buộc', 'Dùng kính ngữ Keigo'],
  difficulty: 6,
  jlpt_level: 'N3',
  pedagogical_target_summary: 'Luyện tập kính ngữ báo cáo trễ hạn.',
  created_at: '2026-01-01T00:00:00Z',
}

const evaluation: MissionEvaluationResponse = {
  overall_score: 92,
  passed: true,
  dimensions: {
    task_completion: { score: 95, status: 'excellent', feedback_vi: 'Hoàn thành xuất sắc mục tiêu báo cáo.' },
    factual_completeness: { score: 90, status: 'excellent', feedback_vi: 'Nêu đủ mốc tiến độ và thời gian mới.' },
    naturalness: { score: 90, status: 'excellent', feedback_vi: 'Diễn đạt tự nhiên chuẩn thương mại.' },
    grammar: { score: 95, status: 'excellent', feedback_vi: 'Ngữ pháp chính xác tuyệt đối.' },
    vocabulary: { score: 90, status: 'excellent', feedback_vi: 'Từ vựng chuyên nghiệp.' },
    register: { score: 95, status: 'excellent', feedback_vi: 'Kính ngữ Keigo chuẩn mực.' },
    politeness: { score: 95, status: 'excellent', feedback_vi: 'Lịch thiệp và tôn trọng cấp trên.' },
    tone: { score: 90, status: 'excellent', feedback_vi: 'Sắc thái tinh thần trách nhiệm cao.' },
    clarity: { score: 90, status: 'excellent', feedback_vi: 'Rõ ràng, không mập mờ.' },
    discourse: { score: 90, status: 'excellent', feedback_vi: 'Bố cục email chuẩn kinh doanh.' },
  },
  required_points: [
    { id: 'pt_1', description: 'Báo cáo tiến độ 90%', status: 'satisfied', explanation_vi: 'Đã nêu 90%' },
    { id: 'pt_2', description: 'Lý do hoãn server bảo trì', status: 'satisfied', explanation_vi: 'Đã nêu lý do' },
  ],
  constraints_respected: true,
  constraints_feedback: ['Đã xin lỗi lịch thiệp', 'Đã đưa ra thời gian mới'],
  strengths_vi: ['Cấu trúc email chuẩn phong cách kinh doanh Nhật Bản.'],
  improvements_vi: ['Có thể dùng câu đệm 恐れ入りますが.'],
  native_model_rewrite: '佐藤部長\n\nお疲れ様です。進捗のご報告をいたします。\n現在開発は90%完了しております。',
  rewrite_nuances_vi: 'Sử dụng kính ngữ chuẩn xác và khiêm tốn.',
  cultural_discourse_tip_vi: 'Tuân thủ nguyên tắc HOU-REN-SO.',
  weakness_mastery_updated: true,
  weakness_feedback_summary: 'Đã nâng cao chỉ số thành thạo kính ngữ +10%.',
  scenario_id: 'mission-123',
}

const simulationTransition: TransitionToSimulationResponse = {
  session_id: 'sim-session-456',
  scenario_id: 'mission-123',
  status: 'active',
  current_turn: 2,
  persona: {
    name: '佐藤部長',
    role: 'Trưởng phòng kỹ thuật',
    relationship: 'Cấp trên',
  },
  turns: [
    { turn_number: 1, actor: 'user', text: '佐藤部長、お疲れ様です。進捗のご報告です。' },
    { turn_number: 2, actor: 'ai', text: '進捗の共有ありがとうございます。了解しました。' },
  ],
}

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => payload })
}

function renderPage(initialEntry = '/scenario') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ScenarioPage />
    </MemoryRouter>,
  )
}

describe('ScenarioPage (Real-World Writing Mission Studio)', () => {
  beforeEach(() => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('/api/v1/scenarios/mission-taxonomy')) {
        return jsonResponse(taxonomy, 200)
      }
      if (url.includes('/api/v1/scenarios/mission/generate') && init?.method === 'POST') {
        return jsonResponse(mission, 201)
      }
      if (url.includes('/api/v1/scenarios/mission/evaluate') && init?.method === 'POST') {
        return jsonResponse(evaluation, 200)
      }
      if (url.includes('/transition-simulation') && init?.method === 'POST') {
        return jsonResponse(simulationTransition, 200)
      }
      if (url.includes('/api/v1/scenarios/recent')) {
        return jsonResponse({ items: [], total: 0 })
      }
      if (url.includes('/api/v1/scenarios/')) {
        return jsonResponse(mission, 200)
      }
      return jsonResponse({ status: 'ok' })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  it('renders mission studio taxonomy categories and prompt mode selector', async () => {
    renderPage()
    expect(await screen.findByText('Nhiệm vụ Viết Thực tế (Real-World Writing Missions)')).toBeInTheDocument()
    expect(await screen.findByText('Công sở & Doanh nghiệp')).toBeInTheDocument()
    expect(screen.getByText('Đời sống Thường ngày')).toBeInTheDocument()
    expect(screen.getByText('Dịch vụ & Giao dịch')).toBeInTheDocument()
    expect(screen.getByText('Xã hội & Bạn bè')).toBeInTheDocument()
    expect(screen.getByText('Chế độ A: Kịch bản Song ngữ (VI + JA)')).toBeInTheDocument()
    expect(screen.getByText('Khởi tạo Nhiệm vụ Giao tiếp 🚀')).toBeInTheDocument()
  })

  it('generates real-world mission and renders briefing card & writing desk', async () => {
    renderPage()
    const generateBtn = await screen.findByRole('button', { name: 'Khởi tạo Nhiệm vụ Giao tiếp 🚀' })
    await userEvent.click(generateBtn)

    // Verify Briefing Card
    expect(await screen.findByText(/Nhiệm vụ Giao tiếp: Báo cáo tiến độ API/)).toBeInTheDocument()
    expect(screen.getByText('🧑‍💻 Kỹ sư phần mềm BrSE')).toBeInTheDocument()
    expect(screen.getByText('👤 Trưởng phòng Sato (佐藤部長)')).toBeInTheDocument()
    expect(screen.getByText('Tin nhắn đến từ Trưởng phòng Sato (佐藤部長) (In-Basket Message)')).toBeInTheDocument()
    expect(screen.getByText('Báo cáo tiến độ 90%')).toBeInTheDocument()
    expect(screen.getByText('Phải xin lỗi trước khi nêu lý do')).toBeInTheDocument()

    // Verify Writing Desk
    expect(screen.getByPlaceholderText(/Viết tin nhắn \/ email \/ phản hồi tiếng Nhật của bạn tại đây/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gửi bài & Đánh giá 10 Chiều 🚀' })).toBeInTheDocument()
  })

  it('submits writing response and renders 10-dimensional evaluation dashboard', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Khởi tạo Nhiệm vụ Giao tiếp 🚀' }))

    const textarea = await screen.findByPlaceholderText(/Viết tin nhắn \/ email \/ phản hồi tiếng Nhật của bạn tại đây/)
    await userEvent.type(textarea, '佐藤部長、お疲れ様です。進捗のご報告をいたします。')

    const submitBtn = screen.getByRole('button', { name: 'Gửi bài & Đánh giá 10 Chiều 🚀' })
    await userEvent.click(submitBtn)

    // Verify Evaluation Dashboard
    expect(await screen.findByText('🎉 Hoàn thành Nhiệm vụ')).toBeInTheDocument()
    expect(screen.getByText('ĐẠT YÊU CẦU')).toBeInTheDocument()
    expect(screen.getByText('92')).toBeInTheDocument()
    expect(screen.getByText('Bảng điểm 10 Chiều (10-Dimensional Communicative & Linguistic Scores)')).toBeInTheDocument()
    expect(screen.getByText('Mục tiêu giao tiếp')).toBeInTheDocument()
    expect(screen.getByText('Bản viết mẫu chuẩn bản xứ (Native Speaker Model Rewrite)')).toBeInTheDocument()
    expect(screen.getByText(/Tuân thủ nguyên tắc HOU-REN-SO/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '💬 Chuyển sang Đối thoại Mô phỏng' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '🧪 Sửa câu tại Rewrite Lab' })).toBeInTheDocument()
  })

  it('transitions to interactive simulation session', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Khởi tạo Nhiệm vụ Giao tiếp 🚀' }))

    const textarea = await screen.findByPlaceholderText(/Viết tin nhắn \/ email \/ phản hồi tiếng Nhật của bạn tại đây/)
    await userEvent.type(textarea, '佐藤部長、お疲れ様です。')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi bài & Đánh giá 10 Chiều 🚀' }))

    const simBtn = await screen.findByRole('button', { name: '💬 Chuyển sang Đối thoại Mô phỏng' })
    await userEvent.click(simBtn)

    const fetchMock = vi.mocked(fetch)
    await waitFor(() => {
      const transCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          init?.method === 'POST' && String(url).includes('/transition-simulation')
      )
      expect(transCall).toBeDefined()
    })
  })

  it('triggers 1-click AI surprise mission from PageHeader', async () => {
    renderPage()
    const surpriseBtn = await screen.findByRole('button', { name: '🎲 Thử thách Bất ngờ' })
    await userEvent.click(surpriseBtn)

    const fetchMock = vi.mocked(fetch)
    await waitFor(() => {
      const genCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          init?.method === 'POST' && String(url).includes('/api/v1/scenarios/mission/generate')
      )
      expect(genCall).toBeDefined()
      if (genCall && genCall[1]?.body) {
        const body = JSON.parse(String(genCall[1].body))
        expect(body.category).toBe('random')
        expect(body.action_type).toBe('random')
        expect(body.prompt_mode).toBe('random')
      }
    })

    expect(await screen.findByText(/Nhiệm vụ Giao tiếp: Báo cáo tiến độ API/)).toBeInTheDocument()
  })

  it('rolls random situation when clicking random picker button', async () => {
    renderPage()
    const rollBtn = await screen.findByRole('button', { name: '🎲 Chọn Ngẫu nhiên' })
    await userEvent.click(rollBtn)
    expect(rollBtn).toBeInTheDocument()
  })
})