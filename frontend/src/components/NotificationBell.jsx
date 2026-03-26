import React, { useRef, useState, useEffect } from 'react'
import { useNotifications } from '../context/NotificationContext.jsx'
import { Link } from 'react-router-dom'
import { CheckCircle, XCircle, MessageCircle, DollarSign, Bell } from 'lucide-react'

export default function NotificationBell() {
  const { notifications, clearNotification, clearAllNotifications, isConnected } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const unreadCount = notifications.length

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const typeIcon = (type) => {
    switch (type) {
      case 'booking_approved': return <CheckCircle size={16} className="notif-icon-success" />
      case 'booking_rejected': return <XCircle size={16} className="notif-icon-error" />
      case 'new_message': return <MessageCircle size={16} className="notif-icon-info" />
      case 'payment_received': return <DollarSign size={16} className="notif-icon-success" />
      default: return <Bell size={16} className="notif-icon-default" />
    }
  }

  const timeAgo = (date) => {
    if (!date) return ''
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div className="notification-bell-wrap" ref={ref}>
      <button
        type="button"
        className="notification-bell-btn"
        onClick={() => setOpen(v => !v)}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown" role="menu">
          <div className="notification-header">
            <h4>Notifications</h4>
            <div className="notification-header-actions">
              <span className={`notification-status ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? '● Live' : '○ Offline'}
              </span>
              {unreadCount > 0 && (
                <button type="button" className="notification-clear-btn" onClick={clearAllNotifications}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={24} className="notification-empty-icon" />
                <p>No notifications yet</p>
                <small>You'll see booking updates and messages here</small>
              </div>
            ) : (
              [...notifications].reverse().slice(0, 20).map((n) => (
                <div key={n.id} className="notification-item" role="menuitem">
                  <span className="notification-type-icon">{typeIcon(n.type)}</span>
                  <div className="notification-item-content">
                    <p className="notification-message">{n.message || n.type}</p>
                    <small className="notification-time">{timeAgo(n.timestamp)}</small>
                  </div>
                  <button
                    type="button"
                    className="notification-dismiss"
                    onClick={(e) => { e.stopPropagation(); clearNotification(n.id) }}
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
