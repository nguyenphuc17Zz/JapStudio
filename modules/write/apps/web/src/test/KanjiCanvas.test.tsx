import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KanjiCanvas } from '../components/kanji/KanjiCanvas'
import { KanjiInfoCard } from '../components/kanji/KanjiInfoCard'
import { KanjiStrokeControls } from '../components/kanji/KanjiStrokeControls'
import type { KanjiStrokeSet } from '../services/kanjiStrokeEngine'
import type { KanjiDetail } from '../services/kanjiService'

const mockStrokeSet: KanjiStrokeSet = {
  kanji: '日',
  strokeCount: 4,
  viewBox: '0 0 109 109',
  strokes: [
    {
      index: 1,
      path: 'M30.75,19.25 L30.75,87',
      startPoint: { x: 30.75, y: 19.25 },
      endPoint: { x: 30.75, y: 87 },
      length: 68,
      samplePoints: [{ x: 30.75, y: 19.25 }, { x: 30.75, y: 87 }],
    },
    {
      index: 2,
      path: 'M33.25,21.5 L76.75,21.5 L76.75,88.75',
      startPoint: { x: 33.25, y: 21.5 },
      endPoint: { x: 76.75, y: 88.75 },
      length: 110,
      samplePoints: [{ x: 33.25, y: 21.5 }, { x: 76.75, y: 88.75 }],
    },
    {
      index: 3,
      path: 'M33.5,53.25 L80,53.25',
      startPoint: { x: 33.5, y: 53.25 },
      endPoint: { x: 80, y: 53.25 },
      length: 46,
      samplePoints: [{ x: 33.5, y: 53.25 }, { x: 80, y: 53.25 }],
    },
    {
      index: 4,
      path: 'M33.75,87.75 L80,87.75',
      startPoint: { x: 33.75, y: 87.75 },
      endPoint: { x: 80, y: 87.75 },
      length: 46,
      samplePoints: [{ x: 33.75, y: 87.75 }, { x: 80, y: 87.75 }],
    },
  ],
}

const mockKanjiDetail: KanjiDetail = {
  kanji: '日',
  hanViet: 'NHẬT',
  meaning: 'Mặt trời, ban ngày, ngày',
  onyomi: ['ニチ', 'ジツ'],
  kunyomi: ['ひ', '-び'],
  jlpt: 'N5',
  grade: 'Lớp 1',
  strokeCount: 4,
  radical: '日 (Nhật - Mặt trời)',
  mnemonic: 'Hình dáng mặt trời tròn khép kín với một vệt sáng ở chính giữa.',
  compounds: [{ word: '日本', reading: 'にほん', meaning: 'Nước Nhật' }],
}

describe('Kanji UI Components', () => {
  it('renders KanjiInfoCard with Sino-Vietnamese reading and details', () => {
    render(<KanjiInfoCard info={mockKanjiDetail} />)
    expect(screen.getByText('NHẬT')).toBeDefined()
    expect(screen.getByText('N5')).toBeDefined()
    expect(screen.getByText('Mặt trời, ban ngày, ngày')).toBeDefined()
    expect(screen.getByText('ニチ · ジツ')).toBeDefined()
    expect(screen.getByText('日本')).toBeDefined()
  })

  it('renders KanjiStrokeControls with mode buttons', () => {
    const onModeChange = vi.fn()
    render(
      <KanjiStrokeControls
        mode="guide"
        totalStrokes={4}
        currentStep={2}
        gridType="nine"
        isPlaying={false}
        speed={1}
        inkColor="sumi"
        showStrokeNumbers={true}
        onModeChange={onModeChange}
        onGridChange={vi.fn()}
        onPlayToggle={vi.fn()}
        onStepChange={vi.fn()}
        onSpeedChange={vi.fn()}
        onInkColorChange={vi.fn()}
        onToggleStrokeNumbers={vi.fn()}
        onHint={vi.fn()}
        onReset={vi.fn()}
      />
    )
    expect(screen.getByText('Xem mẫu')).toBeDefined()
    expect(screen.getByText('Tập tô')).toBeDefined()
    expect(screen.getByText('Thử thách')).toBeDefined()
    expect(screen.getByText('Thư pháp')).toBeDefined()
    expect(screen.getByText('💡 Gợi ý')).toBeDefined()
  })

  it('renders KanjiCanvas wrapper and canvas element', () => {
    const { container } = render(
      <KanjiCanvas strokeSet={mockStrokeSet} mode="guide" gridType="nine" />
    )
    expect(container.querySelector('canvas')).toBeDefined()
    expect(container.querySelector('svg')).toBeDefined()
  })
})
