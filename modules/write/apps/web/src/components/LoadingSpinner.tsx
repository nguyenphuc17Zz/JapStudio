import { Spinner } from './ui/Spinner'

export function LoadingSpinner({ label = 'Đang tải...' }: { label?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-xl) var(--space-md)',
      }}
    >
      <Spinner size={24} label={label} />
    </div>
  )
}