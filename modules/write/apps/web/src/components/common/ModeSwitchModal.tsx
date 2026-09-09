import { useState, useEffect, useCallback } from 'react'
import { config } from '../../lib/config'
import { Spinner } from '../ui/Spinner'
import { Button } from '../ui/Button'

export interface TargetModeInfo {
  id: 'write' | 'speak' | 'immersion'
  name: string
  tag: string
  port: number
  url: string
}

interface ModeSwitchModalProps {
  isOpen: boolean
  target: TargetModeInfo | null
  onClose: () => void
}

export function ModeSwitchModal({ isOpen, target, onClose }: ModeSwitchModalProps) {
  const [step, setStep] = useState<'idle' | 'stopping' | 'starting' | 'ready' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)

  const startSwitch = useCallback(async (targetInfo: TargetModeInfo) => {
    setStep('stopping')
    setProgress(15)
    setErrorMessage('')

    try {
      const res = await fetch(`${config.apiBaseUrl}/api/v1/system/switch-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: targetInfo.id }),
      })

      if (!res.ok) {
        throw new Error(`Lỗi từ máy chủ: HTTP ${res.status}`)
      }

      setProgress(40)
      setStep('starting')

      let attempts = 0
      const maxAttempts = 15
      const interval = setInterval(async () => {
        attempts++
        setProgress((prev) => Math.min(prev + 5, 90))

        try {
          await fetch(targetInfo.url, { mode: 'no-cors', cache: 'no-cache' })
          clearInterval(interval)
          setProgress(100)
          setStep('ready')
          setTimeout(() => {
            window.location.href = targetInfo.url
          }, 800)
        } catch {
          if (attempts >= maxAttempts) {
            clearInterval(interval)
            setProgress(100)
            setStep('ready')
            setTimeout(() => {
              window.location.href = targetInfo.url
            }, 800)
          }
        }
      }, 700)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể kết nối đến API máy chủ JapWrite'
      setErrorMessage(msg)
      setStep('error')
    }
  }, [])

  useEffect(() => {
    if (isOpen && target) {
      startSwitch(target)
    } else {
      setStep('idle')
      setProgress(0)
      setErrorMessage('')
    }
  }, [isOpen, target, startSwitch])

  if (!isOpen || !target) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          background: 'var(--color-surface, #1e293b)',
          border: '1px solid var(--color-border, #334155)',
          borderRadius: 'var(--radius-xl, 16px)',
          boxShadow: 'var(--shadow-xl, 0 20px 40px rgba(0,0,0,0.4))',
          padding: '24px',
          color: 'var(--color-foreground, #f8fafc)',
          textAlign: 'center',
        }}
      >
        {/* Status Icon */}
        <div
          style={{
            margin: '0 auto 16px auto',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
          }}
        >
          {step === 'ready' ? (
            '✅'
          ) : step === 'error' ? (
            '⚠️'
          ) : (
            <Spinner size={28} />
          )}
        </div>

        {/* Heading */}
        <div style={{ marginBottom: '16px' }}>
          <h3
            style={{
              margin: '0 0 6px 0',
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--color-foreground)',
            }}
          >
            {step === 'ready'
              ? `Đã sẵn sàng chuyển sang ${target.name}!`
              : step === 'error'
              ? 'Không thể chuyển chế độ'
              : `Đang chuyển sang ${target.name}...`}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: 'var(--color-foreground-muted, #94a3b8)',
              lineHeight: 1.5,
            }}
          >
            {step === 'stopping' && 'Đang tắt các cổng 5173 & 8001 để giải phóng tài nguyên RAM & CPU...'}
            {step === 'starting' && `Đang kích hoạt ${target.name} trên cổng :${target.port}...`}
            {step === 'ready' && 'Đang điều hướng trình duyệt sang phòng học mới...'}
            {step === 'error' && errorMessage}
          </p>
        </div>

        {/* Progress Bar */}
        {step !== 'error' && (
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                height: '8px',
                width: '100%',
                borderRadius: '999px',
                background: 'var(--color-surface-subtle, rgba(255,255,255,0.08))',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  borderRadius: '999px',
                  background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: 'var(--color-foreground-muted)',
                marginTop: '6px',
                fontFamily: 'monospace',
              }}
            >
              <span>{step === 'stopping' ? 'Giải phóng tài nguyên' : 'Khởi động dịch vụ'}</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}

        {/* Resource Optimization Badges */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            background: 'var(--color-surface-subtle, rgba(255,255,255,0.04))',
            padding: '10px',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--color-border)',
            textAlign: 'left',
            fontSize: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: '11px', color: '#10b981' }}>💾 RAM Giải Phóng</div>
            <div style={{ fontSize: '11px', color: 'var(--color-foreground-muted)' }}>Tiến trình Vite & API</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '11px', color: '#3b82f6' }}>⚡ Cổng Kích Hoạt</div>
            <div style={{ fontSize: '11px', color: 'var(--color-foreground-muted)' }}>Web :{target.port} | API</div>
          </div>
        </div>

        {/* Actions on Error */}
        {step === 'error' && (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <Button variant="primary" size="sm" onClick={() => startSwitch(target)}>
              Thử lại
            </Button>
            <a href={target.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm">
                Mở thủ công ({target.url})
              </Button>
            </a>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Đóng
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
