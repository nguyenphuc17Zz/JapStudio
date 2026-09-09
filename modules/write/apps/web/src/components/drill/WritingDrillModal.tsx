import { useEffect } from 'react'
import { WritingDrillWorkspace } from './WritingDrillWorkspace'
import type { DrillSession } from '../../types/api'

export interface WritingDrillModalProps {
  isOpen: boolean
  onClose: () => void
  weaknessId?: string
  drillSessionId?: string
  onCompleted?: (session: DrillSession) => void
}

export function WritingDrillModal({
  isOpen,
  onClose,
  weaknessId,
  drillSessionId,
  onCompleted,
}: WritingDrillModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="jw-drill-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="jw-drill-modal-content">
        <WritingDrillWorkspace
          weaknessId={weaknessId}
          drillSessionId={drillSessionId}
          onClose={onClose}
          onCompleted={onCompleted}
        />
      </div>
    </div>
  )
}

export default WritingDrillModal
