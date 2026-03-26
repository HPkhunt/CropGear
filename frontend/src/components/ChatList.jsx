import React, { useState, useEffect } from 'react'
import { chatService } from '/src/services/chatService.js'
import Chat from './Chat.jsx'
import './ChatList.css'

const ChatList = () => {
  const [conversations, setConversations] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeChat, setActiveChat] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showChatList, setShowChatList] = useState(false)

  useEffect(() => {
    loadConversations()
    loadUnreadCount()
  }, [])

  const loadConversations = async () => {
    try {
      const response = await chatService.getConversations()
      setConversations(response.conversations || [])
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const response = await chatService.getUnreadCount()
      setUnreadCount(response.total_unread || 0)
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  const openChat = (conversation) => {
    // Find the other participant
    const currentUserId = localStorage.getItem('userId')
    const otherParticipant = conversation.participants.find(p => p !== currentUserId)

    setActiveChat({
      conversationId: conversation.id,
      recipientId: otherParticipant,
      recipientName: conversation.last_message?.sender_name || 'User'
    })
  }

  const closeChat = () => {
    setActiveChat(null)
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''

    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date

    if (diff < 60000) { // Less than 1 minute
      return 'now'
    } else if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)}m ago`
    } else if (diff < 86400000) { // Less than 1 day
      return `${Math.floor(diff / 3600000)}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'
  }

  if (loading) {
    return (
      <div className="chat-list-loading">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <div className="chat-toggle">
        <button
          onClick={() => setShowChatList(!showChatList)}
          className="chat-toggle-btn"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z" fill="white"/>
            <path d="M7 9H17V11H7V9ZM7 12H15V14H7V12Z" fill="white"/>
          </svg>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>
      </div>

      {/* Chat List Panel */}
      {showChatList && (
        <div className="chat-list-panel">
          <div className="chat-list-header">
            <h3>Messages</h3>
            <button
              onClick={() => setShowChatList(false)}
              className="chat-list-close"
            >
              ×
            </button>
          </div>

          <div className="chat-list-content">
            {conversations.length === 0 ? (
              <div className="chat-list-empty">
                <p>No conversations yet</p>
                <small>Start chatting with equipment owners or farmers!</small>
              </div>
            ) : (
              conversations.map((conversation) => {
                const currentUserId = localStorage.getItem('userId')
                const otherParticipant = conversation.participants.find(p => p !== currentUserId)

                return (
                  <div
                    key={conversation.id}
                    onClick={() => openChat(conversation)}
                    className={`chat-list-item ${conversation.unread_count > 0 ? 'unread' : ''}`}
                  >
                    <div className="chat-avatar">
                      <div className="avatar-circle">
                        {getInitials(conversation.last_message?.sender_name || 'User')}
                      </div>
                    </div>

                    <div className="chat-info">
                      <div className="chat-name">
                        {conversation.last_message?.sender_name || 'User'}
                        {conversation.unread_count > 0 && (
                          <span className="unread-dot"></span>
                        )}
                      </div>
                      <div className="chat-preview">
                        {conversation.last_message?.content || 'No messages yet'}
                      </div>
                    </div>

                    <div className="chat-meta">
                      <div className="chat-time">
                        {formatTime(conversation.last_message_at)}
                      </div>
                      {conversation.unread_count > 0 && (
                        <div className="unread-count">
                          {conversation.unread_count}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Active Chat */}
      {activeChat && (
        <Chat
          recipientId={activeChat.recipientId}
          recipientName={activeChat.recipientName}
          onClose={closeChat}
        />
      )}
    </>
  )
}

export default ChatList