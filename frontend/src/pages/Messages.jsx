import React, { useState, useEffect } from 'react'
import { PenSquare, MessageCircle } from 'lucide-react'
import { chatService } from '../services/chatService.js'
import Chat from '../components/Chat.jsx'
import './Messages.css'

const Messages = () => {
  const [conversations, setConversations] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatUserId, setNewChatUserId] = useState('')
  const [newChatUserName, setNewChatUserName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const response = await chatService.getConversations()
      setConversations(response.conversations || [])
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const openChat = (conversation) => {
    // Find the other participant
    const currentUserId = localStorage.getItem('userId')
    const otherParticipant = conversation.participants.find(p => p !== currentUserId)

    setActiveChat({
      conversationId: conversation.id,
      recipientId: otherParticipant,
      recipientName: 'User' // We'll need to fetch user name separately
    })
  }

  const closeChat = () => {
    setActiveChat(null)
  }

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      // For now, we'll use a simple approach - in a real app you'd have a user search API
      // This is a placeholder that would need to be implemented with a proper user search endpoint
      const mockResults = [
        { id: 'user1', name: 'John Farmer', role: 'farmer' },
        { id: 'user2', name: 'Sarah Owner', role: 'equipment_owner' },
        { id: 'user3', name: 'Mike Tractor', role: 'equipment_owner' }
      ].filter(user =>
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.role.toLowerCase().includes(query.toLowerCase())
      )
      setSearchResults(mockResults)
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setSearching(false)
    }
  }

  const startNewChat = async (userId, userName) => {
    try {
      const conversation = await chatService.createConversation(userId, `Hi ${userName}, I'd like to chat with you!`)
      setShowNewChat(false)
      setNewChatUserId('')
      setNewChatUserName('')
      setSearchQuery('')
      setSearchResults([])

      // Reload conversations to include the new one
      await loadConversations()

      // Open the new chat
      openChat({
        id: conversation.conversation_id,
        participants: [localStorage.getItem('userId'), userId],
        last_message: { sender_name: userName }
      })
    } catch (error) {
      console.error('Error starting new chat:', error)
    }
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
      <div className="container page-wrap">
        <div className="messages-loading">
          <div className="spinner"></div>
          <p>Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container page-wrap">
      <div className="messages-container">
        <div className="messages-sidebar">
          <div className="messages-header">
            <h2>Messages</h2>
            <button
              className="new-chat-btn"
              onClick={() => setShowNewChat(true)}
              title="Start new conversation"
            >
              <PenSquare size={16} /> New Chat
            </button>
          </div>

          <div className="conversations-list">
            {conversations.length === 0 ? (
              <div className="no-conversations">
                <p>No conversations yet</p>
                <small>Start chatting with other users!</small>
                <button
                  className="button sm primary"
                  onClick={() => setShowNewChat(true)}
                >
                  Start New Chat
                </button>
              </div>
            ) : (
              conversations.map((conversation) => {
                const currentUserId = localStorage.getItem('userId')
                const otherParticipant = conversation.participants.find(p => p !== currentUserId)

                return (
                  <div
                    key={conversation.id}
                    onClick={() => openChat(conversation)}
                    className={`conversation-item ${conversation.unread_count > 0 ? 'unread' : ''}`}
                  >
                    <div className="conversation-avatar">
                      <div className="avatar-circle">
                        {getInitials('User')}
                      </div>
                    </div>

                    <div className="conversation-info">
                      <div className="conversation-name">
                        User
                        {conversation.unread_count > 0 && (
                          <span className="unread-dot"></span>
                        )}
                      </div>
                      <div className="conversation-preview">
                        {conversation.last_message || 'No messages yet'}
                      </div>
                    </div>

                    <div className="conversation-meta">
                      <div className="conversation-time">
                        {formatTime(conversation.updated_at)}
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

        <div className="messages-content">
          {activeChat ? (
            <Chat
              recipientId={activeChat.recipientId}
              recipientName={activeChat.recipientName}
              onClose={closeChat}
            />
          ) : (
            <div className="messages-placeholder">
              <div className="placeholder-content">
                <div className="chat-icon"><MessageCircle size={20} /></div>
                <h3>Select a conversation</h3>
                <p>Choose a conversation from the sidebar to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="new-chat-modal-overlay" onClick={() => setShowNewChat(false)}>
          <div className="new-chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="new-chat-header">
              <h3>Start New Conversation</h3>
              <button
                className="close-btn"
                onClick={() => setShowNewChat(false)}
              >
                ×
              </button>
            </div>

            <div className="new-chat-content">
              <div className="search-section">
                <input
                  type="text"
                  placeholder="Search users by name or role..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    searchUsers(e.target.value)
                  }}
                  className="user-search-input"
                />
                {searching && <div className="search-spinner">⟳</div>}
              </div>

              <div className="search-results">
                {searchResults.length > 0 ? (
                  searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="search-result-item"
                      onClick={() => startNewChat(user.id, user.name)}
                    >
                      <div className="user-avatar">
                        {getInitials(user.name)}
                      </div>
                      <div className="user-info">
                        <div className="user-name">{user.name}</div>
                        <div className="user-role">{user.role.replace('_', ' ')}</div>
                      </div>
                      <div className="start-chat-btn"><MessageCircle size={18} /></div>
                    </div>
                  ))
                ) : searchQuery && !searching ? (
                  <div className="no-results">
                    <p>No users found</p>
                    <small>Try a different search term</small>
                  </div>
                ) : (
                  <div className="search-placeholder">
                    <p>Search for farmers, equipment owners, or admins</p>
                    <small>Type a name or role to get started</small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Messages