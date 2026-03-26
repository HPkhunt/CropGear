import React from 'react'
import Modal from './Modal.jsx'
import { AlertTriangle, Zap, Info } from 'lucide-react'

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  icon = null,
  loading = false,
}) {
  const iconMap = {
    danger: <AlertTriangle size={32} className="confirm-icon-danger" />,
    warning: <Zap size={32} className="confirm-icon-warning" />,
    info: <Info size={32} className="confirm-icon-info" />,
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="button outline pill sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className={`button pill sm ${variant === 'danger' ? 'accent' : variant === 'warning' ? 'secondary' : 'primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="confirm-dialog-content">
        <div className="confirm-dialog-icon">
          {icon || iconMap[variant] || iconMap.info}
        </div>
        <p className="confirm-dialog-message">{message}</p>
      </div>
    </Modal>
  )
}
