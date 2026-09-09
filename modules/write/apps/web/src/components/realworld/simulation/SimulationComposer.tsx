import { useState } from 'react'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { Button } from '../../ui/Button'
import { Textarea } from '../../ui/Textarea'
import { AIWritingAssistantDrawer } from '../../ai/AIWritingAssistantDrawer'
import { sound } from '../../../services/sound'

export interface SimulationComposerProps {
  draft: string
  onDraftChange: (value: string) => void
  sending: boolean
  draftSaved: boolean
  onSend: () => void
  onEndEarly: () => void
  prompt_vi?: string
  context_vi?: string | null
}

export function SimulationComposer({
  draft,
  onDraftChange,
  sending,
  draftSaved,
  onSend,
  onEndEarly,
  prompt_vi,
  context_vi,
}: SimulationComposerProps) {
  const [endOpen, setEndOpen] = useState(false)
  const [ending, setEnding] = useState(false)

  const insertPunctuation = (char: string) => {
    sound.playWashiStroke()
    onDraftChange(draft + char)
  }

  const send = () => {
    if (!draft.trim() || sending) return
    onSend()
  }

  const confirmEnd = () => {
    setEnding(true)
    try {
      onEndEarly()
    } finally {
      setEnding(false)
      setEndOpen(false)
    }
  }

  return (
    <div className="jw-sim-composer">
      {/* Universal AI Writing Assistant Drawer for Simulation */}
      <AIWritingAssistantDrawer
        title="Gợi ý Hướng Trả Lời & Cụm Từ Đối Thoại"
        prompt_vi={prompt_vi}
        context_vi={context_vi}
        ideaAngles={[
          {
            title: 'Đồng ý & Xác nhận',
            description: 'Tiếp nhận thông tin một cách lịch sự, sẵn sàng hỗ trợ.',
            starter: 'かしこまりました。ただいま確認いたします。',
          },
          {
            title: 'Từ chối khéo léo',
            description: 'Bày tỏ sự tiếc nuối và đưa ra lý do khách quan.',
            starter: '大変恐縮ではございますが、あいにく...',
          },
          {
            title: 'Xin thêm thời gian / Đề xuất',
            description: 'Thương lượng thời gian hoặc giải pháp thay thế.',
            starter: '少々お時間をいただけますでしょうか。代わりに...',
          },
        ]}
        goldenPhrases={[
          { japanese: '承知いたしました', meaning: 'Tôi đã rõ (Kính ngữ)', type: 'expression' },
          { japanese: 'お手数をおかけいたしますが', meaning: 'Phiền bạn một chút nhưng...', type: 'expression' },
          { japanese: '恐れ入りますが', meaning: 'Xin thứ lỗi nhưng...', type: 'starter' },
          { japanese: 'ご都合はいかがでしょうか', meaning: 'Thời gian có tiện cho bạn không?', type: 'expression' },
          { japanese: '至急確認いたします', meaning: 'Tôi sẽ kiểm tra ngay lập tức', type: 'expression' },
        ]}
        onInsertPhrase={(phrase) => insertPunctuation(phrase)}
      />

      {/* Quick Punctuation & Particle Micro-Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '6px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <span style={{ fontSize: '11px', color: 'var(--color-foreground-muted)', marginRight: '2px', flexShrink: 0 }}>
          Ký tự nhanh:
        </span>
        {['。', '、', '「', '」', '〜', '・', 'を', 'に', 'で', 'が', 'は'].map((char) => (
          <button
            key={char}
            type="button"
            onClick={() => insertPunctuation(char)}
            disabled={sending}
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
            {char}
          </button>
        ))}
      </div>

      <div className="jw-sim-composer-row">
        <Textarea
          id="sim-answer"
          label="Câu trả lời tiếng Nhật"
          aria-label="Câu trả lời tiếng Nhật của bạn"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault()
              send()
            }
          }}
          placeholder="Nhập câu trả lời tiếng Nhật của bạn..."
          disabled={sending}
          rows={4}
          counter={`${[...draft].length} ký tự · Ctrl+Enter để gửi`}
        />
      </div>
      <div className="jw-sim-composer-actions">
        <div className="jw-sim-composer-meta">
          <span className="jw-sim-composer-count">{[...draft].length} ký tự</span>
          {draft.trim() && !draftSaved ? (
            <span className="jw-sim-composer-draft">Đang lưu nháp...</span>
          ) : null}
        </div>
        <div className="jw-sim-composer-buttons">
          <Button
            variant="ghost"
            size="sm"
            icon="x"
            onClick={() => setEndOpen(true)}
            disabled={sending}
          >
            Kết thúc sớm
          </Button>
          <Button
            icon="send"
            size="sm"
            onClick={send}
            loading={sending}
            disabled={!draft.trim()}
          >
            {sending ? 'AI đang phản hồi...' : 'Gửi trả lời'}
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={endOpen}
        onCancel={() => setEndOpen(false)}
        onConfirm={confirmEnd}
        title="Kết thúc mô phỏng này?"
        description="Bạn sẽ về thẳng trang tổng kết. Nháp chưa gửi sẽ được giữ lại để lần sau tiếp tục."
        confirmLabel="Kết thúc"
        cancelLabel="Tiếp tục trò chuyện"
        destructive={false}
        loading={ending}
      />
    </div>
  )
}