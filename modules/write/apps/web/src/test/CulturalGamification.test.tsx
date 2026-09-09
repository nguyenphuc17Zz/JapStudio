import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HankoCrafterModal } from '../components/gamification/HankoCrafterModal'
import { DailyHaikuModal } from '../components/gamification/DailyHaikuModal'
import { OmikujiModal } from '../components/gamification/OmikujiModal'
import { KotowazaModal } from '../components/gamification/KotowazaModal'
import { KitsuneCompanion } from '../components/gamification/KitsuneCompanion'
import { MascotCompanion } from '../components/gamification/MascotCompanion'
import type {
  HankoSuggestionResponse,
  HaikuGenerateResponse,
  OmikujiFortuneResponse,
  KotowazaResponse,
  KitsuneDialogueResponse,
  KitsuneChatResponse,
} from '../types/api'

const sampleHanko: HankoSuggestionResponse = {
  name_input: 'Phuc',
  options: [
    {
      kanji: '福',
      reading: 'ふく (Fuku)',
      meaning_vi: 'Phúc Lành & An Khang',
      seal_style: 'Tensho-tai · Triện thư cổ',
      philosophy: 'Tâm tĩnh phúc sinh, bút hoa khai vận.',
    },
  ],
  overall_advice: 'Con dấu mang sinh khí thịnh vượng cho ngòi bút.',
}

const sampleHaiku: HaikuGenerateResponse = {
  season: '🌸 Xuân',
  kigo: '桜 (Sakura - Hoa anh đào)',
  lines_jp: ['春風や', '桜花舞う', '筆の道'],
  lines_reading: ['はるかぜや (Harukaze ya)', 'さくらまう (Sakura mau)', 'ふでのみち (Fude no michi)'],
  translation_vi: 'Gió xuân thoảng đưa hương,\nCánh đào rơi nhẹ trên đường bút hoa.',
  explanation: 'Vẻ đẹp thanh tao của mùa xuân Nhật Bản hòa vào con đường bút đạo.',
  author_jp: 'AI 芭蕉 (AI Bashō)',
  author_vi: 'Thi nhân AI',
}

const sampleOmikuji: OmikujiFortuneResponse = {
  rank: '大吉',
  rank_vi: 'Đại Cát · Rất May Mắn',
  buff: '+20% EXP luyện tập hôm nay 🌟',
  exp_buff_percent: 20,
  color: '#fbbf24',
  waka_jp: '雲晴れて 月の光の さやけきに 心の筆も 澄み渡りけり',
  waka_reading: 'くもはれて つきのひかりの さやけきに こころのふでも すみわたりけり',
  waka_vi: 'Mây tan trăng rọi sáng ngời,\nNgọn bút trong trẻo lòng người an yên.',
  writing_advice: 'Hôm nay tâm trí sáng tỏ, hãy viết những câu văn biểu cảm phong phú.',
  grammar_advice: 'Chú ý liên kết câu tự nhiên (〜て、〜ながら).',
  vocab_advice: 'Ghi nhớ 3 từ vựng mới về cảm xúc.',
  streak_advice: 'Giữ vững ngọn lửa kiên định mỗi ngày.',
  lucky_kanji: '光',
  lucky_kanji_reading: 'ひかり (Hikari)',
  lucky_kanji_meaning: 'Ánh sáng rực rỡ',
  lucky_grammar: '〜はずだ (Chắc chắn là)',
  lucky_color: 'Vàng Hoàng Kim (金箔)',
}

const sampleKotowaza: KotowazaResponse = {
  expression_jp: '七転び八起き',
  reading: 'ななころびやおき (Nana korobi ya oki)',
  meaning_literal: 'Bảy lần vấp ngã, tám lần đứng lên.',
  vietnamese_equivalent: 'Thất bại là mẹ thành công (Gian nan không nản).',
  origin_story: 'Lấy cảm hứng từ hình tượng búp bê Daruma kiên định.',
  example_sentence_jp: '七転び八起きの精神で挑戦しよう。',
  example_sentence_vi: 'Hãy thử thách bằng tinh thần ngã 7 lần đứng dậy 8 lần.',
  practice_prompt: 'Viết 1 câu tiếng Nhật tự động viên bản thân khi gặp khó khăn.',
  is_yojijukugo: true,
}

const sampleKitsune: KitsuneDialogueResponse = {
  mood: 'happy',
  message_vi: 'Chào bạn hiền! Hôm nay hãy cùng ta viết nên những câu văn thật đẹp nhé! 🦊',
  message_jp: '今日も一緒に楽しく書こうコン！',
  action_tip: 'Thử thách dịch 1 câu đơn giản trước nhé!',
}

const sampleKitsuneChat: KitsuneChatResponse = {
  reply: 'Tiểu hồ ly sẵn sàng hỗ trợ! Nét chữ của bạn hôm nay tràn đầy linh lực đấy! 🦊✨',
  mood: 'encouraging',
  japanese_phrase: '千里の道も一歩から',
  suggested_chips: ['Đố vui chữ Hán', 'Gợi ý mở bài'],
}

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => payload })
}

describe('Cultural & Gamification AI Features', () => {
  beforeEach(() => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/v1/culture/hanko/suggest')) {
        return jsonResponse(sampleHanko)
      }
      if (url.includes('/api/v1/culture/haiku/generate')) {
        return jsonResponse(sampleHaiku)
      }
      if (url.includes('/api/v1/culture/omikuji/draw')) {
        return jsonResponse(sampleOmikuji)
      }
      if (url.includes('/api/v1/culture/kotowaza/random')) {
        return jsonResponse(sampleKotowaza)
      }
      if (url.includes('/api/v1/culture/kitsune/chat')) {
        return jsonResponse(sampleKitsuneChat)
      }
      if (url.includes('/api/v1/culture/kitsune/dialogue')) {
        return jsonResponse(sampleKitsune)
      }
      return jsonResponse({ status: 'ok' })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  it('suggests AI Kanji for Hanko seal based on Vietnamese name', async () => {
    render(<HankoCrafterModal open={true} onClose={vi.fn()} />)
    expect(screen.getByText(/XƯỞNG KHẮC DẤU TRIỆN SON AI/)).toBeInTheDocument()

    const input = screen.getByPlaceholderText(/VD: Phúc, Minh, Phong/)
    await userEvent.type(input, 'Phuc')
    await userEvent.click(screen.getByRole('button', { name: 'Khắc Dấu AI' }))

    expect(await screen.findByText('Phúc Lành & An Khang')).toBeInTheDocument()
    expect(screen.getByText('ふく (Fuku)')).toBeInTheDocument()
  })

  it('suggests AI Kanji for Hanko seal randomly without name input', async () => {
    render(<HankoCrafterModal open={true} onClose={vi.fn()} />)
    const randomBtn = screen.getByRole('button', { name: 'Tùy Duyên 🎲' })
    await userEvent.click(randomBtn)

    expect(await screen.findByText('Phúc Lành & An Khang')).toBeInTheDocument()
  })

  it('generates dynamic AI Haiku poem with season and reading', async () => {
    render(<DailyHaikuModal open={true} onClose={vi.fn()} />)
    expect(await screen.findByText('春風や')).toBeInTheDocument()
    expect(screen.getByText(/Gió xuân thoảng đưa hương/)).toBeInTheDocument()
    expect(screen.getByText(/Sakura - Hoa anh đào/)).toBeInTheDocument()
  })

  it('draws authentic Shinto Omikuji fortune with writing advice and waka', async () => {
    render(<OmikujiModal open={true} onClose={vi.fn()} />)
    expect(screen.getByText('Bốc Quẻ Omikuji Thần Đạo')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Lắc Ống Rút Quẻ/ }))
    expect(await screen.findByText('Đại Cát · Rất May Mắn')).toBeInTheDocument()
    expect(screen.getByText(/Mây tan trăng rọi sáng ngời/)).toBeInTheDocument()
    expect(screen.getByText(/〜はずだ/)).toBeInTheDocument()
  })

  it('renders Kotowaza with Vietnamese equivalent and example sentence', async () => {
    render(
      <MemoryRouter>
        <KotowazaModal open={true} onClose={vi.fn()} />
      </MemoryRouter>,
    )
    expect(await screen.findByText('七転び八起き')).toBeInTheDocument()
    expect(screen.getByText(/Thất bại là mẹ thành công/)).toBeInTheDocument()
    expect(screen.getByText('ななころびやおき (Nana korobi ya oki)')).toBeInTheDocument()
  })

  it('renders Kitsune companion with interactive dialogue and chat button', async () => {
    render(
      <MemoryRouter>
        <KitsuneCompanion streak={5} completedToday={2} />
      </MemoryRouter>,
    )
    expect(await screen.findByText(/Chào bạn hiền!/)).toBeInTheDocument()
    expect(screen.getByText('「今日も一緒に楽しく書こうコン！」')).toBeInTheDocument()
    expect(screen.getByText(/Trò Chuyện Cùng Cáo AI/)).toBeInTheDocument()
  })

  it('opens MascotCompanion AI Chatbox and sends messages', async () => {
    render(
      <MemoryRouter>
        <MascotCompanion />
      </MemoryRouter>,
    )
    // Find mascot floating trigger
    const trigger = screen.getByRole('button', { name: /Linh thú Kitsune/ })
    await userEvent.click(trigger)

    // Chatbox dialog opens
    expect(await screen.findByRole('dialog', { name: /Hồ Ly Đồng Hành AI Chatbox/ })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Hỏi Cáo ngữ pháp, Kanji/)).toBeInTheDocument()

    // Send a message
    const chatInput = screen.getByPlaceholderText(/Hỏi Cáo ngữ pháp, Kanji/)
    await userEvent.type(chatInput, 'Cáo ơi cho ta lời khuyên')
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }))

    // Expect AI response
    expect(await screen.findByText(/Tiểu hồ ly sẵn sàng hỗ trợ!/)).toBeInTheDocument()
  })
})

