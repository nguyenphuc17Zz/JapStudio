import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  ProgressBar,
  ProgressRing,
  ScoreRing,
  SkillBar,
  GoalProgress,
  XPProgress,
} from '../../components/ui/Progress'
import { Score } from '../../components/ui/Score'

describe('ProgressBar', () => {
  it('exposes progressbar semantics', () => {
    render(<ProgressBar value={64} label="Tổng quan" showValue />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '64')
    expect(screen.getByText('64')).toBeInTheDocument()
  })

  it('clamps values above max', () => {
    render(<ProgressBar value={120} max={100} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  it('handles zero max without dividing by zero', () => {
    render(<ProgressBar value={0} max={0} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '0')
  })
})

describe('ProgressRing', () => {
  it('renders a ring with value semantics', () => {
    render(<ProgressRing value={72} label="72" caption="Ngữ pháp" />)
    const ring = screen.getByRole('progressbar')
    expect(ring).toHaveAttribute('aria-valuenow', '72')
    expect(screen.getByText('Ngữ pháp')).toBeInTheDocument()
  })
})

describe('ScoreRing', () => {
  it('derives the numeric label from value', () => {
    render(<ScoreRing value={82} />)
    expect(screen.getByText('82')).toBeInTheDocument()
  })
})

describe('SkillBar', () => {
  it('renders label and value', () => {
    render(<SkillBar label="Ngữ pháp" value={72} />)
    expect(screen.getByText('Ngữ pháp')).toBeInTheDocument()
    expect(screen.getByText('72')).toBeInTheDocument()
  })
})

describe('GoalProgress', () => {
  it('shows progress and remaining count', () => {
    render(<GoalProgress label="Bài viết tuần này" value={3} target={5} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '5')
    expect(screen.getByText(/còn 2/)).toBeInTheDocument()
  })
})

describe('XPProgress', () => {
  it('shows level and XP', () => {
    render(<XPProgress level={7} xp={340} xpInLevel={300} xpToNext={160} />)
    expect(screen.getByText(/Cấp 7/)).toBeInTheDocument()
    expect(screen.getByText(/340 XP/)).toBeInTheDocument()
  })
})

describe('Score', () => {
  it('renders value, label and positive trend', () => {
    render(<Score value={86} label="Tổng thể" trend={8} />)
    expect(screen.getByText('86')).toBeInTheDocument()
    expect(screen.getByText('Tổng thể')).toBeInTheDocument()
    expect(screen.getByText('+8')).toBeInTheDocument()
  })

  it('renders confidence label', () => {
    render(<Score value={62} confidence="medium" />)
    expect(screen.getByText('Độ tin cậy trung bình')).toBeInTheDocument()
  })
})