import { cx } from '../../lib/cx'
import { Icon } from '../icons/Icon'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'



export interface ConnectionStatusProps {
  /** Show a degraded (partial service) banner in addition to offline */
  degraded?: boolean
  /** Message when offline */
  offlineMessage?: string
  /** Message when degraded but online */
  degradedMessage?: string
  className?: string
}

/** Shown only while offline or explicitly degraded — never a permanent bar. */
export function ConnectionStatus({
  degraded = false,
  offlineMessage = 'Kết nối bị gián đoạn. Nội dung bạn đang nhập vẫn được giữ lại.',
  degradedMessage = 'Một số dịch vụ đang gặp sự cố. Bạn vẫn có thể tiếp tục luyện tập.',
  className,
}: ConnectionStatusProps) {
  const online = useOnlineStatus()
  if (online && !degraded) return null

  return (
    <div role="status" className={cx('jw-connection-banner', className)}>
      <Icon name="alert" size={14} aria-hidden="true" />
      <span>{online ? degradedMessage : offlineMessage}</span>
    </div>
  )
}