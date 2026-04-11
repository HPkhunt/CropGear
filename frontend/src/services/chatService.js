import client from './api.js'

function normalizeApiBase() {
  const apiBase = import.meta.env.VITE_API_BASE || '/api/v1'
  if (/^https?:\/\//i.test(apiBase)) {
    return apiBase.replace(/\/$/, '')
  }
  return `${window.location.origin}${apiBase}`.replace(/\/$/, '')
}

export function getChatWebSocketUrl(conversationId, token) {
  const apiBase = normalizeApiBase()
  const wsBase = apiBase.replace(/^http/i, 'ws')
  return `${wsBase}/chat/conversations/${conversationId}/ws?token=${encodeURIComponent(token)}`
}

export const chatService = {
  async createConversation(recipientId, initialMessage = '') {
    const { data } = await client.post('/chat/conversations', null, {
      params: {
        recipient_id: recipientId,
        ...(initialMessage ? { initial_message: initialMessage } : {})
      }
    })
    return data
  },
  async conversations(page = 1, pageSize = 50) {
    const { data } = await client.get('/chat/conversations', {
      params: {
        page,
        page_size: pageSize
      }
    })
    return data
  },
  async messages(conversationId, page = 1, pageSize = 50) {
    const { data } = await client.get(`/chat/conversations/${conversationId}/messages`, {
      params: {
        page,
        page_size: pageSize
      }
    })
    return data
  },
  async sendMessage(conversationId, content, messageType = 'text') {
    const { data } = await client.post('/chat/messages', content, {
      params: {
        conversation_id: conversationId,
        message_type: messageType
      }
    })
    return data
  },
  async editMessage(messageId, content) {
    const { data } = await client.put(`/chat/messages/${messageId}`, content)
    return data
  },
  async deleteMessage(messageId) {
    const { data } = await client.delete(`/chat/messages/${messageId}`)
    return data
  },
  async toggleReaction(messageId, emoji) {
    const { data } = await client.post(`/chat/messages/${messageId}/reactions`, emoji)
    return data
  },
  async archiveConversation(conversationId) {
    const { data } = await client.post(`/chat/conversations/${conversationId}/archive`)
    return data
  },
  async muteConversation(conversationId, mute) {
    const { data } = await client.post(`/chat/conversations/${conversationId}/mute`, mute)
    return data
  },
  async searchMessages(conversationId, query, page = 1, pageSize = 20) {
    const { data } = await client.get(`/chat/search/${conversationId}`, {
      params: {
        query,
        page,
        page_size: pageSize
      }
    })
    return data
  },
  async unreadSummary() {
    const { data } = await client.get('/chat/unread')
    return data
  }
}
