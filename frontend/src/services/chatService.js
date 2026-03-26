/**
 * Chat and messaging service for real-time communication
 */

import api from './api.js'

class ChatService {
  constructor() {
    this.wsConnections = new Map() // conversation_id -> WebSocket
    this.messageListeners = new Map() // conversation_id -> Set of callbacks
    this.typingListeners = new Map() // conversation_id -> Set of callbacks
    this.userStatusListeners = new Map() // conversation_id -> Set of callbacks
    this.readListeners = new Map() // conversation_id -> Set of callbacks
  }

  /**
   * Create or get existing conversation with a user
   */
  async createConversation(recipientId, initialMessage = null) {
    try {
      const response = await api.post('/chat/conversations', {
        participant_ids: [localStorage.getItem('userId'), recipientId],
        initial_message: initialMessage
      })
      return response.data
    } catch (error) {
      console.error('Error creating conversation:', error)
      throw error
    }
  }

  /**
   * Get all conversations for current user
   */
  async getConversations() {
    try {
      const userId = localStorage.getItem('userId')
      const response = await api.get(`/chat/conversations/${userId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching conversations:', error)
      throw error
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId) {
    try {
      const response = await api.get(`/chat/messages/${conversationId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching messages:', error)
      throw error
    }
  }

  /**
   * Send a message
   */
  async sendMessage(conversationId, content, messageType = 'text') {
    try {
      const response = await api.post('/chat/messages', {
        conversation_id: conversationId,
        content: content,
        message_type: messageType
      })
      return response.data
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId) {
    try {
      const response = await api.delete(`/chat/messages/${messageId}`)
      return response.data
    } catch (error) {
      console.error('Error deleting message:', error)
      throw error
    }
  }

  /**
   * Edit a message
   */
  async editMessage(messageId, content) {
    try {
      const response = await api.put(`/chat/messages/${messageId}`, content)
      return response.data
    } catch (error) {
      console.error('Error editing message:', error)
      throw error
    }
  }

  /**
   * Add reaction to message
   */
  async addReaction(messageId, emoji) {
    try {
      const response = await api.post(`/chat/messages/${messageId}/reactions`, { emoji })
      return response.data
    } catch (error) {
      console.error('Error adding reaction:', error)
      throw error
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount() {
    try {
      const response = await api.get('/chat/unread')
      return response.data
    } catch (error) {
      console.error('Error fetching unread count:', error)
      throw error
    }
  }

  /**
   * Mark messages as seen in conversation
   */
  async markAsSeen(conversationId) {
    try {
      const response = await api.put('/chat/messages/seen', null, {
        params: { conversation_id: conversationId }
      })
      return response.data
    } catch (error) {
      console.error('Error marking messages as seen:', error)
      throw error
    }
  }

  /**
   * Search messages in conversation
   */
  async searchMessages(conversationId, query, page = 1, pageSize = 20) {
    try {
      const response = await api.get(`/chat/search/${conversationId}`, {
        params: { query, page, page_size: pageSize }
      })
      return response.data
    } catch (error) {
      console.error('Error searching messages:', error)
      throw error
    }
  }

  /**
   * Archive conversation
   */
  async archiveConversation(conversationId) {
    try {
      const response = await api.post(`/chat/conversations/${conversationId}/archive`)
      return response.data
    } catch (error) {
      console.error('Error archiving conversation:', error)
      throw error
    }
  }

  /**
   * Mute/unmute conversation
   */
  async muteConversation(conversationId, mute) {
    try {
      const response = await api.post(`/chat/conversations/${conversationId}/mute`, { mute })
      return response.data
    } catch (error) {
      console.error('Error muting conversation:', error)
      throw error
    }
  }

  /**
   * Connect to WebSocket for real-time messaging
   */
  connectWebSocket(conversationId) {
    if (this.wsConnections.has(conversationId)) {
      return this.wsConnections.get(conversationId)
    }

    const token = localStorage.getItem('token')
    if (!token) {
      console.error('No authentication token found')
      return null
    }

    const wsUrl = `${api.defaults.baseURL.replace('http', 'ws')}/chat/conversations/${conversationId}/ws?token=${token}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log(`Connected to chat for conversation ${conversationId}`)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'message') {
          this._notifyMessageListeners(conversationId, data.data)
        } else if (data.type === 'typing') {
          this._notifyTypingListeners(conversationId, data)
        } else if (data.type === 'user_joined' || data.type === 'user_left') {
          this._notifyUserStatusListeners(conversationId, data)
        } else if (data.type === 'read') {
          this._notifyReadListeners(conversationId, data)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log(`Disconnected from chat for conversation ${conversationId}`)
      this.wsConnections.delete(conversationId)
    }

    this.wsConnections.set(conversationId, ws)
    return ws
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(conversationId) {
    const ws = this.wsConnections.get(conversationId)
    if (ws) {
      ws.close()
      this.wsConnections.delete(conversationId)
    }
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(conversationId, isTyping) {
    const ws = this.wsConnections.get(conversationId)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'typing',
        is_typing: isTyping
      }))
    }
  }

  /**
   * Send message via WebSocket
   */
  sendMessageViaWebSocket(conversationId, content, messageType = 'text') {
    const ws = this.wsConnections.get(conversationId)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'message',
        content: content,
        message_type: messageType
      }))
    }
  }

  /**
   * Mark messages as read
   */
  markAsRead(conversationId) {
    const ws = this.wsConnections.get(conversationId)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'read'
      }))
    }
  }

  /**
   * Add message listener
   */
  addMessageListener(conversationId, callback) {
    if (!this.messageListeners.has(conversationId)) {
      this.messageListeners.set(conversationId, new Set())
    }
    this.messageListeners.get(conversationId).add(callback)
  }

  /**
   * Remove message listener
   */
  removeMessageListener(conversationId, callback) {
    const listeners = this.messageListeners.get(conversationId)
    if (listeners) {
      listeners.delete(callback)
      if (listeners.size === 0) {
        this.messageListeners.delete(conversationId)
      }
    }
  }

  /**
   * Add typing listener
   */
  addTypingListener(conversationId, callback) {
    if (!this.typingListeners.has(conversationId)) {
      this.typingListeners.set(conversationId, new Set())
    }
    this.typingListeners.get(conversationId).add(callback)
  }

  /**
   * Remove typing listener
   */
  removeTypingListener(conversationId, callback) {
    const listeners = this.typingListeners.get(conversationId)
    if (listeners) {
      listeners.delete(callback)
      if (listeners.size === 0) {
        this.typingListeners.delete(conversationId)
      }
    }
  }

  /**
   * Add user status listener
   */
  addUserStatusListener(conversationId, callback) {
    if (!this.userStatusListeners.has(conversationId)) {
      this.userStatusListeners.set(conversationId, new Set())
    }
    this.userStatusListeners.get(conversationId).add(callback)
  }

  /**
   * Remove user status listener
   */
  removeUserStatusListener(conversationId, callback) {
    const listeners = this.userStatusListeners.get(conversationId)
    if (listeners) {
      listeners.delete(callback)
      if (listeners.size === 0) {
        this.userStatusListeners.delete(conversationId)
      }
    }
  }

  /**
   * Add read status listener
   */
  addReadListener(conversationId, callback) {
    if (!this.readListeners.has(conversationId)) {
      this.readListeners.set(conversationId, new Set())
    }
    this.readListeners.get(conversationId).add(callback)
  }

  /**
   * Remove read status listener
   */
  removeReadListener(conversationId, callback) {
    const listeners = this.readListeners.get(conversationId)
    if (listeners) {
      listeners.delete(callback)
      if (listeners.size === 0) {
        this.readListeners.delete(conversationId)
      }
    }
  }

  // Private methods
  _notifyMessageListeners(conversationId, message) {
    const listeners = this.messageListeners.get(conversationId)
    if (listeners) {
      listeners.forEach(callback => callback(message))
    }
  }

  _notifyTypingListeners(conversationId, data) {
    const listeners = this.typingListeners.get(conversationId)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }

  _notifyUserStatusListeners(conversationId, data) {
    const listeners = this.userStatusListeners.get(conversationId)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }

  _notifyReadListeners(conversationId, data) {
    const listeners = this.readListeners.get(conversationId)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }
}

// Create and export singleton instance
const chatService = new ChatService()
export { chatService }