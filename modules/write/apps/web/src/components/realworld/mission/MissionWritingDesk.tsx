import React, { useState } from 'react'
import { Card, CardContent, CardHeader } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { AIModelPicker } from '../../ai/AIModelPicker'
import { AIWritingAssistantDrawer } from '../../ai/AIWritingAssistantDrawer'
import { sound } from '../../../services/sound'

interface MissionWritingDeskProps {
  initialText?: string
  onSubmit: (text: string, provider?: string, model?: string) => void
  isSubmitting?: boolean
  disabled?: boolean
  selectedProvider?: string
  selectedModel?: string
  onProviderChange?: (provider: string) => void
  onModelChange?: (model: string) => void
  prompt_vi?: string
  context_vi?: string | null
  jlpt_level?: string | null
  register?: string | null
  genre?: string | null
}

export const MissionWritingDesk: React.FC<MissionWritingDeskProps> = ({
  initialText = '',
  onSubmit,
  isSubmitting = false,
  disabled = false,
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  prompt_vi,
  context_vi,
  jlpt_level,
  register,
  genre,
}) => {
  const [text, setText] = useState(initialText)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (text.trim() && !isSubmitting && !disabled) {
        onSubmit(text.trim(), selectedProvider, selectedModel)
      }
    }
  }

  const insertSymbol = (sym: string) => {
    sound.playWashiStroke()
    setText((prev) => prev + sym)
  }

  const charCount = text.length

  return (
    <Card variant="default" className="mission-writing-desk">
      <CardHeader
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✍️</span>
            <span style={{ fontWeight: 600, fontSize: 'var(--text-body-sm)' }}>
              Không gian viết câu trả lời (Japanese Writing Desk)
            </span>
          </div>
        }
        actions={
          <div style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)' }}>
            Độ dài: <strong style={{ color: 'var(--color-foreground)' }}>{charCount}</strong> ký tự
          </div>
        }
      />

      <CardContent>
        {/* Quick symbol shortcuts */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginBottom: '8px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--color-foreground-muted)', marginRight: '2px', flexShrink: 0 }}>
            Ký tự nhanh:
          </span>
          {['。', '、', '「', '」', '〜', '・', 'を', 'に', 'で', 'が', 'は'].map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => insertSymbol(sym)}
              disabled={disabled || isSubmitting}
              style={{
                padding: '2px 7px',
                fontSize: '11px',
                fontFamily: 'var(--font-japanese)',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--glass-border)',
                color: 'var(--color-foreground)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {sym}
            </button>
          ))}
        </div>

        {/* Universal AI Writing Assistant Drawer */}
        <AIWritingAssistantDrawer
          title="Trợ lực Nhiệm vụ (Scenario Starters & Frames)"
          prompt_vi={prompt_vi}
          context_vi={context_vi}
          jlpt_level={jlpt_level}
          register={register}
          genre={genre}
          onInsertPhrase={(phrase) => insertSymbol(phrase)}
        />

        {/* Japanese Writing Textarea */}
        <div style={{ position: 'relative', marginBottom: 'var(--space-md)' }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isSubmitting}
            placeholder="Viết tin nhắn / email / phản hồi tiếng Nhật của bạn tại đây... (Ví dụ: 佐藤部長、お疲れ様です。進捗のご報告をいたします...)"
            rows={7}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-foreground)',
              fontSize: '15px',
              lineHeight: 1.7,
              fontFamily: 'var(--font-sans)',
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
          />
        </div>

        {/* AI Model Picker Row */}
        {onProviderChange && onModelChange && (
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <AIModelPicker
              variant="inline"
              value={{ provider: selectedProvider, model: selectedModel }}
              onChange={({ provider, model }) => {
                onProviderChange(provider)
                onModelChange(model)
              }}
              disabled={disabled || isSubmitting}
            />
          </div>
        )}

        {/* Submission Bottom Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 'var(--space-xs)',
          }}
        >
          <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)' }}>
            Phím tắt: <strong>Ctrl + Enter</strong> để gửi đánh giá
          </span>

          <Button
            variant="primary"
            size="md"
            disabled={!text.trim() || isSubmitting || disabled}
            onClick={() => onSubmit(text.trim(), selectedProvider, selectedModel)}
            style={{
              padding: '0 24px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
            }}
          >
            {isSubmitting ? 'Đang chấm 10 tiêu chí...' : 'Gửi bài & Đánh giá 10 Chiều 🚀'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
