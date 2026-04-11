import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import useToast from '@/hooks/useToast'
import useAuth from '../hooks/useAuth.js'

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const { token, isAuthenticated } = useAuth()
  const { addToast } = useToast()
  const addToastRef = useRef(addToast)
  const wsRef = useRef(null)
  const reconnectTimerRef = useRef(null)

  // Keep ref in sync without causing reconnects
  useEffect(() => {
    addToastRef.current = addToast
  }, [addToast])

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const disconnectWebSocket = useCallback((code = 1000, reason = 'Client disconnect') => {
    clearReconnectTimer()
    const existing = wsRef.current
    wsRef.current = null
    if (existing && existing.readyState < WebSocket.CLOSING) {
      existing.close(code, reason)
    }
    setIsConnected(false)
  }, [clearReconnectTimer])

  const connectWebSocket = useCallback(() => {
    clearReconnectTimer()
    if (!token) {
      setIsConnected(false)
      return null
    }

    const existing = wsRef.current
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return existing
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws/notifications?token=${encodeURIComponent(token)}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('Connected to notification service')
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        // Ignore ping messages
        if (data.type === 'ping') return

        console.log('Received notification:', data)

        // Add to notifications list
        setNotifications(prev => [...prev, { ...data, id: Date.now(), timestamp: new Date() }])

        // Show toast notification
        if (data.type === 'booking_approved') {
          addToastRef.current(data.message, 'success')
        } else if (data.type === 'booking_rejected') {
          addToastRef.current(data.message, 'error')
        } else if (data.type === 'booking_completed') {
          addToastRef.current(data.message, 'success')
        } else if (data.type === 'booking_cancelled') {
          addToastRef.current(data.message, 'info')
        } else if (data.message) {
          addToastRef.current(data.message, 'info')
        }
      } catch (error) {
        console.error('Failed to parse notification:', error)
      }
    }

    ws.onclose = (event) => {
      console.log('Disconnected from notification service', event.code)
      if (wsRef.current === ws) {
        wsRef.current = null
      }
      setIsConnected(false)
      if (event.code !== 1000 && event.code !== 1008 && localStorage.getItem('token')) {
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null
          connectWebSocket()
        }, 5000)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
    }

    return ws
  }, [clearReconnectTimer, token])

  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnectWebSocket(1000, 'Signed out')
      return undefined
    }

    connectWebSocket()

    return () => {
      disconnectWebSocket(1000, 'Notification provider cleanup')
    }
  }, [connectWebSocket, disconnectWebSocket, isAuthenticated, token])

  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAllNotifications = () => {
    setNotifications([])
  }

  return (
    <NotificationContext.Provider value={{
      notifications,
      isConnected,
      clearNotification,
      clearAllNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
