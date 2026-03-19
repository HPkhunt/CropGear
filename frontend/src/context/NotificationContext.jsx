import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useToast } from './ToastContext.jsx'

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const { addToast } = useToast()
  const addToastRef = useRef(addToast)
  const wsRef = useRef(null)

  // Keep ref in sync without causing reconnects
  useEffect(() => {
    addToastRef.current = addToast
  }, [addToast])

  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      // Not authenticated — don't connect
      return null
    }

    // Build WebSocket URL relative to current host (works in any deployment)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws/notifications?token=${encodeURIComponent(token)}`

    const ws = new WebSocket(wsUrl)

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
        } else if (data.message) {
          addToastRef.current(data.message, 'info')
        }
      } catch (error) {
        console.error('Failed to parse notification:', error)
      }
    }

    ws.onclose = (event) => {
      console.log('Disconnected from notification service', event.code)
      setIsConnected(false)
      // Only auto-reconnect if closure was unexpected (not auth rejection)
      if (event.code !== 1008 && localStorage.getItem('token')) {
        setTimeout(connectWebSocket, 5000)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
    }

    return ws
  }, []) // Stable — no dependencies that would cause reconnect loops

  useEffect(() => {
    wsRef.current = connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connectWebSocket])

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