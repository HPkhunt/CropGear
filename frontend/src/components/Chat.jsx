import React, { useState, useEffect, useRef } from 'react'
import { chatService } from '/src/services/chatService.js'
import './Chat.css'

const Chat = ({ recipientId, recipientName, onClose }) => {
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  useEffect(() => {
    initializeChat()
    return () => {
      if (conversation?.id) {
        chatService.disconnectWebSocket(conversation.id)
      }
    }
  }, [recipientId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const initializeChat = async () => {
    try {
      setLoading(true)

      // Create or get conversation
      const conv = await chatService.createConversation(recipientId)
      setConversation(conv)

      // Connect to WebSocket
      chatService.connectWebSocket(conv.conversation_id || conv.id)

      // Load messages
      await loadMessages(conv.conversation_id || conv.id)

      // Set up listeners
      setupWebSocketListeners(conv.conversation_id || conv.id)

    } catch (error) {
      console.error('Error initializing chat:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId) => {
    try {
      const response = await chatService.getMessages(conversationId)
      setMessages(response.messages || response || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const setupWebSocketListeners = (conversationId) => {
    chatService.addMessageListener(conversationId, (message) => {
      setMessages(prev => [...prev, message])
    })

    chatService.addTypingListener(conversationId, (data) => {
      if (data.user_id !== recipientId) {
        setOtherUserTyping(data.is_typing)
      }
    })
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      await chatService.sendMessage(conversation.conversation_id, newMessage.trim())
      setNewMessage('')
      setIsTyping(false)
      chatService.sendTypingIndicator(conversation.conversation_id, false)
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true)
      chatService.sendTypingIndicator(conversation?.conversation_id, true)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      chatService.sendTypingIndicator(conversation?.conversation_id, false)
    }, 1000)
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <h3>Loading chat...</h3>
          <button onClick={onClose} className="chat-close-btn">×</button>
        </div>
        <div className="chat-loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>Chat with {recipientName}</h3>
        <button onClick={onClose} className="chat-close-btn">×</button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message ${message.sender_id === localStorage.getItem('userId') ? 'own' : 'other'}`}
            >
              <div className="message-content">
                <p>{message.message}</p>
                <span className="message-time">
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
        {otherUserTyping && (
          <div className="chat-typing">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="typing-text">{recipientName} is typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-form">
        <div className="chat-input-container">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value)
              handleTyping()
            }}
            placeholder="Type a message..."
            className="chat-input"
            disabled={sending}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!newMessage.trim() || sending}
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default Chat