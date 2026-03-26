import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import useAuth from '../hooks/useAuth.js'
import { chatService } from '../services/chatService.js'
import './MessageFAB.css'

const MessageFAB = () => {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  // Hide FAB on auth pages and messages page itself
  useEffect(() => {
    const hideOnPaths = ['/auth', '/messages']
    const shouldHide = hideOnPaths.some(path => location.pathname.startsWith(path))
    setIsVisible(!shouldHide)
  }, [location.pathname])

  // Fetch unread messages count
  useEffect(() => {
    if (!isAuthenticated || !isVisible) return

    const fetchUnreadCount = async () => {
      try {
        const response = await chatService.getConversations()
        const totalUnread = response.conversations?.reduce((total, conv) => {
          return total + (conv.unread_count || 0)
        }, 0) || 0
        setUnreadCount(totalUnread)
      } catch (error) {
        console.error('Error fetching unread count:', error)
      }
    }

    fetchUnreadCount()

    // Set up periodic refresh for unread count
    const interval = setInterval(fetchUnreadCount, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [isAuthenticated, isVisible])

  // Don't render if not authenticated or not visible
  if (!isAuthenticated || !isVisible) {
    return null
  }

  return (
    <Link to="/messages" className="message-fab" title="Messages">
      <div className="fab-icon">
        <MessageCircle size={22} />
      </div>
      {unreadCount > 0 && (
        <div className="fab-badge">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
      <div className="fab-pulse" />
      <div className="fab-tooltip">
        Messages {unreadCount > 0 && `(${unreadCount} new)`}
      </div>
    </Link>
  )
}

export default MessageFAB