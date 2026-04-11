import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  BellOff,
  BellRing,
  Check,
  Pencil,
  Search,
  SendHorizontal,
  Trash2,
  Wifi,
  WifiOff,
  X
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import DashboardShell from '../../components/DashboardShell.jsx'
import PageHero from '../../components/PageHero.jsx'
import Loader from '../../components/Loader.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import SmartImage from '../../components/SmartImage.jsx'
import { chatService, getChatWebSocketUrl } from '../../services/chatService.js'
import { userService } from '../../services/userService.js'
import useAuth from '../../hooks/useAuth.js'
import { getErrorMessage } from '../../utils/helpers.js'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  canEditMessage,
  formatMessageTimestamp,
  getDashboardLinksForRole,
  getMessagePreview,
  getOtherParticipantId,
  getReactionGroups,
  getWorkspaceSubtitleForRole,
  getWorkspaceTitleForRole,
  isLastConversationMessage
} from '../../utils/chat.js'

const QUICK_REACTIONS = ['\u{1F44D}', '\u2705', '\u{1F64F}', '\u{1F69C}']

function appendUniqueMessage(messages, nextMessage) {
  const nextId = nextMessage?.id
  if (!nextId) return messages
  if (messages.some((message) => message.id === nextId)) return messages
  return [...messages, nextMessage]
}

function replaceMessage(messages, nextMessage) {
  const nextId = nextMessage?.id
  if (!nextId) return messages
  return messages.map((message) => (message.id === nextId ? nextMessage : message))
}

function removeMessage(messages, messageId) {
  if (!messageId) return messages
  return messages.filter((message) => message.id !== messageId)
}

function promoteConversationWithMessage(conversations, nextMessage, currentUserId, activeConversationId) {
  if (!nextMessage?.conversation_id) return conversations

  const targetConversation = conversations.find(
    (conversation) => conversation.id === nextMessage.conversation_id
  )
  if (!targetConversation) return conversations

  const nextConversation = {
    ...targetConversation,
    last_message: nextMessage,
    last_message_at: nextMessage.created_at,
    unread_count: nextMessage.sender_id === currentUserId || nextMessage.conversation_id === activeConversationId
      ? 0
      : Number(targetConversation.unread_count || 0) + 1
  }

  return [
    nextConversation,
    ...conversations.filter((conversation) => conversation.id !== nextMessage.conversation_id)
  ]
}

function syncConversationMessage(conversations, nextMessage) {
  if (!nextMessage?.conversation_id) return conversations

  return conversations.map((conversation) => {
    if (
      conversation.id !== nextMessage.conversation_id ||
      !isLastConversationMessage(conversation, nextMessage.id)
    ) {
      return conversation
    }

    return {
      ...conversation,
      last_message: nextMessage
    }
  })
}

function updateConversationMuteState(conversations, conversationId, isMuted) {
  return conversations.map((conversation) => (
    conversation.id === conversationId
      ? { ...conversation, is_muted: isMuted }
      : conversation
  ))
}

function getParticipantLabel(profile) {
  return profile?.full_name || profile?.email || 'Participant'
}

export default function Messages() {
  const { user, token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [threadLoading, setThreadLoading] = useState(false)
  const [conversations, setConversations] = useState([])
  const [profiles, setProfiles] = useState({})
  const [messages, setMessages] = useState([])
  const [conversationFilter, setConversationFilter] = useState('')
  const [composer, setComposer] = useState('')
  const [threadSearch, setThreadSearch] = useState('')
  const [threadSearchResults, setThreadSearchResults] = useState([])
  const [threadSearching, setThreadSearching] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [unreadSummary, setUnreadSummary] = useState({ total_unread: 0 })
  const [wsConnected, setWsConnected] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [error, setError] = useState('')
  const [threadError, setThreadError] = useState('')
  const [editingMessageId, setEditingMessageId] = useState('')
  const [editingDraft, setEditingDraft] = useState('')
  const [messageActionKey, setMessageActionKey] = useState('')
  const [mutingConversation, setMutingConversation] = useState(false)
  const wsRef = useRef(null)
  const typingTimerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const isMountedRef = useRef(true)
  const profilesRef = useRef({})

  const sidebarLinks = useMemo(
    () => getDashboardLinksForRole(user?.role),
    [user?.role]
  )
  const title = getWorkspaceTitleForRole(user?.role)
  const subtitle = getWorkspaceSubtitleForRole(user?.role)
  const selectedConversationId = searchParams.get('conversation') || ''
  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  )
  const selectedParticipantId = getOtherParticipantId(selectedConversation, user?.id)
  const selectedParticipant = profiles[selectedParticipantId] || null
  const emptyStateAction = user?.role === 'equipment_owner'
    ? { to: '/owner/requests', label: 'Open requests', className: 'button gradient' }
    : user?.role === 'admin'
      ? { to: '/admin/dashboard', label: 'Open dashboard', className: 'button gradient' }
      : { to: '/farmer/equipments', label: 'Browse listings', className: 'button gradient' }
  const visibleConversations = useMemo(() => {
    const search = conversationFilter.trim().toLowerCase()
    if (!search) return conversations

    return conversations.filter((conversation) => {
      const participantId = getOtherParticipantId(conversation, user?.id)
      const participant = profiles[participantId]
      const fields = [
        participant?.full_name,
        participant?.email,
        getMessagePreview(conversation?.last_message)
      ]

      return fields.some((value) => String(value || '').toLowerCase().includes(search))
    })
  }, [conversationFilter, conversations, profiles, user?.id])
  const stats = [
    { value: conversations.length, label: 'Conversations' },
    { value: unreadSummary?.total_unread || 0, label: 'Unread messages' },
    { value: messages.length, label: 'Loaded messages' },
    { value: wsConnected ? 'Live' : 'Offline', label: 'Realtime' }
  ]

  useEffect(() => {
    profilesRef.current = profiles
  }, [profiles])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, typingUsers])

  useEffect(() => {
    if (!actionMessage) return undefined
    const timeoutId = window.setTimeout(() => setActionMessage(''), 3600)
    return () => window.clearTimeout(timeoutId)
  }, [actionMessage])

  const refreshUnreadSummary = useCallback(async () => {
    try {
      const unreadData = await chatService.unreadSummary()
      if (isMountedRef.current) {
        setUnreadSummary(unreadData || { total_unread: 0 })
      }
    } catch {
      // Keep the last known unread summary when the refresh fails.
    }
  }, [])

  const sendReadReceipt = useCallback(() => {
    const ws = wsRef.current
    if (!selectedConversationId || !ws || ws.readyState !== WebSocket.OPEN) return false

    ws.send(JSON.stringify({ type: 'read' }))
    return true
  }, [selectedConversationId])

  const stopTypingIndicator = useCallback(() => {
    const ws = wsRef.current
    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current)
      typingTimerRef.current = null
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'typing', is_typing: false }))
    }
  }, [])

  const loadConversations = useCallback(async ({ silent = false } = {}) => {
    if (!user?.id) return []

    if (!silent) {
      setLoading(true)
      setError('')
    }

    try {
      const [conversationData, unreadData] = await Promise.all([
        chatService.conversations(),
        chatService.unreadSummary()
      ])

      if (!isMountedRef.current) return []

      const nextConversations = Array.isArray(conversationData?.conversations)
        ? conversationData.conversations
        : []
      setConversations(nextConversations)
      setUnreadSummary(unreadData || { total_unread: 0 })

      const participantIds = [
        ...new Set(
          nextConversations
            .map((conversation) => getOtherParticipantId(conversation, user.id))
            .filter(Boolean)
        )
      ]
      const profileEntries = await Promise.all(
        participantIds.map(async (participantId) => {
          try {
            const profile = await userService.get(participantId)
            return [participantId, profile]
          } catch {
            return [participantId, null]
          }
        })
      )

      if (!isMountedRef.current) return nextConversations

      setProfiles(Object.fromEntries(profileEntries))

      const currentConversationId = selectedConversationId
      if (!currentConversationId && nextConversations[0]?.id) {
        setSearchParams({ conversation: nextConversations[0].id }, { replace: true })
      } else if (
        currentConversationId &&
        !nextConversations.some((conversation) => conversation.id === currentConversationId)
      ) {
        if (nextConversations[0]?.id) {
          setSearchParams({ conversation: nextConversations[0].id }, { replace: true })
        } else {
          setSearchParams({}, { replace: true })
        }
      }

      return nextConversations
    } catch (loadError) {
      if (!silent && isMountedRef.current) {
        setError(getErrorMessage(loadError, 'Unable to load conversations right now.'))
      }
      return []
    } finally {
      if (!silent && isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [selectedConversationId, setSearchParams, user?.id])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    setEditingMessageId('')
    setEditingDraft('')
    setTypingUsers([])

    if (!selectedConversationId || !user?.id) {
      setMessages([])
      setThreadError('')
      setThreadSearchResults([])
      return
    }

    let ignore = false

    const loadMessages = async () => {
      setThreadLoading(true)
      setThreadError('')
      setThreadSearchResults([])
      try {
        const data = await chatService.messages(selectedConversationId)
        if (ignore) return
        setMessages(Array.isArray(data?.messages) ? data.messages : [])
        setConversations((current) => current.map((conversation) => (
          conversation.id === selectedConversationId
            ? { ...conversation, unread_count: 0 }
            : conversation
        )))
        await refreshUnreadSummary()
      } catch (loadError) {
        if (!ignore) {
          setThreadError(getErrorMessage(loadError, 'Unable to load this conversation right now.'))
        }
      } finally {
        if (!ignore) {
          setThreadLoading(false)
        }
      }
    }

    loadMessages()
    return () => {
      ignore = true
    }
  }, [refreshUnreadSummary, selectedConversationId, user?.id])

  useEffect(() => {
    if (!wsConnected || !selectedConversationId) return
    sendReadReceipt()
  }, [selectedConversationId, sendReadReceipt, wsConnected])

  useEffect(() => {
    if (!selectedConversationId || !token) {
      setWsConnected(false)
      if (wsRef.current) {
        wsRef.current.close(1000, 'No active conversation')
        wsRef.current = null
      }
      return undefined
    }

    const ws = new WebSocket(getChatWebSocketUrl(selectedConversationId, token))
    wsRef.current = ws

    ws.onopen = () => {
      setWsConnected(true)
    }

    ws.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.type === 'message' && payload.data) {
          setMessages((current) => appendUniqueMessage(current, payload.data))
          setConversations((current) => (
            promoteConversationWithMessage(current, payload.data, user?.id, selectedConversationId)
          ))
          setTypingUsers((current) => current.filter((userId) => userId !== payload.data.sender_id))

          const shouldKeepRead =
            payload.data.sender_id !== user?.id &&
            payload.data.conversation_id === selectedConversationId

          if (shouldKeepRead) {
            sendReadReceipt()
          } else {
            await refreshUnreadSummary()
          }
        }

        if (payload.type === 'message_updated' && payload.data) {
          setMessages((current) => replaceMessage(current, payload.data))
          setThreadSearchResults((current) => replaceMessage(current, payload.data))
          setConversations((current) => syncConversationMessage(current, payload.data))

          if (editingMessageId === payload.data.id) {
            setEditingMessageId('')
            setEditingDraft('')
          }
        }

        if (payload.type === 'message_deleted' && payload.message_id) {
          setMessages((current) => removeMessage(current, payload.message_id))
          setThreadSearchResults((current) => removeMessage(current, payload.message_id))

          if (editingMessageId === payload.message_id) {
            setEditingMessageId('')
            setEditingDraft('')
          }

          await loadConversations({ silent: true })
        }

        if (payload.type === 'typing' && payload.user_id && payload.user_id !== user?.id) {
          setTypingUsers((current) => (
            payload.is_typing
              ? [...new Set([...current, payload.user_id])]
              : current.filter((userId) => userId !== payload.user_id)
          ))
        }

        if (payload.type === 'read' && payload.user_id && payload.user_id !== user?.id) {
          setActionMessage(`${getParticipantLabel(profilesRef.current[payload.user_id])} read the latest messages.`)
        }

        if (payload.type === 'user_joined' && payload.user_id && payload.user_id !== user?.id) {
          setActionMessage(`${getParticipantLabel(profilesRef.current[payload.user_id])} joined this conversation.`)
        }

        if (payload.type === 'user_left' && payload.user_id && payload.user_id !== user?.id) {
          setTypingUsers((current) => current.filter((userId) => userId !== payload.user_id))
          setActionMessage(`${getParticipantLabel(profilesRef.current[payload.user_id])} left the live thread.`)
        }
      } catch (wsError) {
        console.error('Failed to parse chat payload', wsError)
      }
    }

    ws.onclose = () => {
      setWsConnected(false)
      if (wsRef.current === ws) {
        wsRef.current = null
      }
    }

    ws.onerror = () => {
      setWsConnected(false)
    }

    return () => {
      setWsConnected(false)
      if (wsRef.current === ws) {
        wsRef.current = null
      }
      ws.close(1000, 'Conversation changed')
    }
  }, [
    editingMessageId,
    loadConversations,
    refreshUnreadSummary,
    selectedConversationId,
    sendReadReceipt,
    token,
    user?.id
  ])

  const handleComposerChange = (value) => {
    setComposer(value)

    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    ws.send(JSON.stringify({ type: 'typing', is_typing: Boolean(value.trim()) }))

    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current)
    }

    typingTimerRef.current = window.setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'typing', is_typing: false }))
      }
      typingTimerRef.current = null
    }, 1200)
  }

  const handleSend = async (event) => {
    event.preventDefault()
    if (!selectedConversationId || !composer.trim()) return

    const content = composer.trim()
    setComposer('')
    stopTypingIndicator()

    try {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'message', content, message_type: 'text' }))
      } else {
        const message = await chatService.sendMessage(selectedConversationId, content)
        setMessages((current) => appendUniqueMessage(current, message))
        setConversations((current) => (
          promoteConversationWithMessage(current, message, user?.id, selectedConversationId)
        ))
        await refreshUnreadSummary()
      }
      setActionMessage('')
    } catch (sendError) {
      setComposer(content)
      setThreadError(getErrorMessage(sendError, 'Unable to send your message right now.'))
    }
  }

  const handleArchive = async () => {
    if (!selectedConversationId) return
    try {
      await chatService.archiveConversation(selectedConversationId)
      setActionMessage('Conversation archived. It has been removed from the active inbox.')
      const nextConversations = conversations.filter((conversation) => conversation.id !== selectedConversationId)
      setConversations(nextConversations)
      setMessages([])
      setEditingMessageId('')
      setEditingDraft('')
      if (nextConversations[0]?.id) {
        setSearchParams({ conversation: nextConversations[0].id }, { replace: true })
      } else {
        setSearchParams({}, { replace: true })
      }
      await refreshUnreadSummary()
    } catch (archiveError) {
      setThreadError(getErrorMessage(archiveError, 'Unable to archive this conversation.'))
    }
  }

  const handleMuteToggle = async () => {
    if (!selectedConversationId || !selectedConversation || mutingConversation) return

    const nextMute = !selectedConversation.is_muted
    setMutingConversation(true)
    try {
      const result = await chatService.muteConversation(selectedConversationId, nextMute)
      setConversations((current) => (
        updateConversationMuteState(current, selectedConversationId, Boolean(result?.mute))
      ))
      setActionMessage(
        result?.mute
          ? 'Conversation muted. New messages still appear here, but notification surfacing is paused.'
          : 'Conversation unmuted. Inbox notifications are active again.'
      )
    } catch (muteError) {
      setThreadError(getErrorMessage(muteError, 'Unable to update notification settings right now.'))
    } finally {
      setMutingConversation(false)
    }
  }

  const handleThreadSearch = async (event) => {
    event.preventDefault()
    if (!selectedConversationId || !threadSearch.trim()) {
      setThreadSearchResults([])
      return
    }

    setThreadSearching(true)
    try {
      const results = await chatService.searchMessages(selectedConversationId, threadSearch.trim())
      setThreadSearchResults(Array.isArray(results?.messages) ? results.messages : [])
    } catch (searchError) {
      setThreadError(getErrorMessage(searchError, 'Unable to search this conversation right now.'))
    } finally {
      setThreadSearching(false)
    }
  }

  const startEditingMessage = (message) => {
    setEditingMessageId(message.id)
    setEditingDraft(message.content || '')
    setThreadError('')
  }

  const cancelEditingMessage = () => {
    setEditingMessageId('')
    setEditingDraft('')
  }

  const handleEditMessage = async (event, messageId) => {
    event.preventDefault()

    const nextContent = editingDraft.trim()
    if (!messageId || !nextContent) return

    setMessageActionKey(`edit:${messageId}`)
    try {
      const updatedMessage = await chatService.editMessage(messageId, nextContent)
      setMessages((current) => replaceMessage(current, updatedMessage))
      setThreadSearchResults((current) => replaceMessage(current, updatedMessage))
      setConversations((current) => syncConversationMessage(current, updatedMessage))
      setActionMessage('Message updated.')
      cancelEditingMessage()
    } catch (editError) {
      setThreadError(getErrorMessage(editError, 'Unable to update that message right now.'))
    } finally {
      setMessageActionKey('')
    }
  }

  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return

    const confirmed = window.confirm('Delete this message? This cannot be undone.')
    if (!confirmed) return

    setMessageActionKey(`delete:${messageId}`)
    try {
      await chatService.deleteMessage(messageId)
      setMessages((current) => removeMessage(current, messageId))
      setThreadSearchResults((current) => removeMessage(current, messageId))
      if (editingMessageId === messageId) {
        cancelEditingMessage()
      }
      await loadConversations({ silent: true })
      setActionMessage('Message deleted.')
    } catch (deleteError) {
      setThreadError(getErrorMessage(deleteError, 'Unable to delete that message right now.'))
    } finally {
      setMessageActionKey('')
    }
  }

  const handleToggleReaction = async (messageId, emoji) => {
    if (!messageId || !emoji) return

    setMessageActionKey(`reaction:${messageId}:${emoji}`)
    try {
      const result = await chatService.toggleReaction(messageId, emoji)
      if (result?.message) {
        setMessages((current) => replaceMessage(current, result.message))
        setThreadSearchResults((current) => replaceMessage(current, result.message))
        setConversations((current) => syncConversationMessage(current, result.message))
      }
      setActionMessage(
        result?.status === 'removed'
          ? `${emoji} reaction removed.`
          : `${emoji} reaction added.`
      )
    } catch (reactionError) {
      setThreadError(getErrorMessage(reactionError, 'Unable to update reactions right now.'))
    } finally {
      setMessageActionKey('')
    }
  }

  if (!user) return <Loader />

  return (
    <div className="container page-wrap">
      <DashboardShell title={title} subtitle={subtitle} links={sidebarLinks} currentLabel="Chat">
        <PageHero
          eyebrow="Messaging"
          title="Stay in sync on every rental"
          subtitle="Coordinate pickup timing, answer questions quickly, and keep booking context close while you message."
          className={user.role === 'admin' ? 'portal-admin' : user.role === 'equipment_owner' ? 'portal-secondary' : 'portal-primary'}
          stats={stats}
          aside={(
            <SmartImage
              src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1280&auto=format&fit=crop"
              fallbackSrc="/hero.svg"
              alt="Messaging workspace"
              className="page-hero-media"
            />
          )}
        />

        <section className="chat-shell">
          <aside className="card chat-sidebar">
            <div className="chat-sidebar-head">
              <div>
                <p className="review-section-eyebrow">Inbox</p>
                <h3>Your conversations</h3>
              </div>
              <span className="status-badge status-info">{unreadSummary?.total_unread || 0} unread</span>
            </div>

            <label className="chat-search-field">
              <Search size={16} strokeWidth={2.1} aria-hidden="true" />
              <input
                value={conversationFilter}
                onChange={(event) => setConversationFilter(event.target.value)}
                placeholder="Search conversations"
              />
            </label>

            {loading ? (
              <p className="subtitle">Loading conversations...</p>
            ) : error ? (
              <Alert
                variant="destructive"
                className="mb-4 border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur"
              >
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-slate-900">{error}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setError('')}
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            ) : visibleConversations.length ? (
              <div className="chat-conversation-list">
                {visibleConversations.map((conversation) => {
                  const participantId = getOtherParticipantId(conversation, user.id)
                  const participant = profiles[participantId]
                  const isActive = conversation.id === selectedConversationId

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      className={`chat-conversation-item ${isActive ? 'active' : ''}`.trim()}
                      onClick={() => {
                        setSearchParams({ conversation: conversation.id }, { replace: true })
                        setThreadError('')
                        setThreadSearchResults([])
                      }}
                    >
                      <div className="chat-avatar">{getParticipantLabel(participant).slice(0, 1).toUpperCase()}</div>
                      <div className="chat-conversation-copy">
                        <div className="chat-conversation-meta">
                          <strong>{getParticipantLabel(participant)}</strong>
                          <span>{formatMessageTimestamp(conversation.last_message_at || conversation.last_message?.created_at)}</span>
                        </div>
                        <p className="subtitle">{getMessagePreview(conversation.last_message)}</p>
                      </div>
                      <div className="chat-conversation-flags">
                        {conversation.is_muted && (
                          <span className="chat-muted-pill">Muted</span>
                        )}
                        {Number(conversation.unread_count || 0) > 0 && (
                          <span className="chat-unread-badge">{conversation.unread_count}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                eyebrow="No conversations yet"
                title="Your inbox is empty"
                message="Start from a listing or booking queue to open your first conversation."
                actions={[
                  emptyStateAction
                ]}
              />
            )}
          </aside>

          <section className="card chat-main">
            {selectedConversation ? (
              <>
                <header className="chat-thread-head">
                  <div>
                    <p className="review-section-eyebrow">Active Conversation</p>
                    <h3>{getParticipantLabel(selectedParticipant)}</h3>
                    <p className="subtitle">{selectedParticipant?.role ? selectedParticipant.role.replace(/_/g, ' ') : 'Verified platform member'}</p>
                  </div>
                  <div className="chat-thread-actions">
                    {selectedConversation.is_muted && (
                      <span className="chat-muted-pill">Muted locally</span>
                    )}
                    <span className={`chat-connection-pill ${wsConnected ? 'online' : 'offline'}`}>
                      {wsConnected ? <Wifi size={14} strokeWidth={2.2} aria-hidden="true" /> : <WifiOff size={14} strokeWidth={2.2} aria-hidden="true" />}
                      <span>{wsConnected ? 'Live' : 'Offline'}</span>
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={handleMuteToggle}
                      disabled={mutingConversation}
                    >
                      {selectedConversation.is_muted ? <BellRing size={14} strokeWidth={2.1} aria-hidden="true" /> : <BellOff size={14} strokeWidth={2.1} aria-hidden="true" />}
                      <span>
                        {mutingConversation
                          ? 'Saving...'
                          : selectedConversation.is_muted
                            ? 'Unmute'
                            : 'Mute'}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={handleArchive}
                    >
                      <Archive size={14} strokeWidth={2.1} aria-hidden="true" />
                      <span>Archive</span>
                    </Button>
                  </div>
                </header>

                <form className="chat-search-row" onSubmit={handleThreadSearch}>
                  <label className="chat-search-field">
                    <Search size={16} strokeWidth={2.1} aria-hidden="true" />
                    <input
                      value={threadSearch}
                      onChange={(event) => setThreadSearch(event.target.value)}
                      placeholder="Search within this conversation"
                    />
                  </label>
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                    disabled={threadSearching}
                  >
                    {threadSearching ? 'Searching...' : 'Search'}
                  </Button>
                </form>

                {actionMessage && (
                  <Alert className="mb-4 border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
                    <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm text-slate-900">{actionMessage}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setActionMessage('')}
                      >
                        Dismiss
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {threadError && (
                  <Alert
                    variant="destructive"
                    className="mb-4 border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur"
                  >
                    <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm text-slate-900">{threadError}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setThreadError('')}
                      >
                        Dismiss
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {threadSearchResults.length > 0 && (
                  <section className="chat-search-results">
                    <div className="review-section-head">
                      <div>
                        <p className="review-section-eyebrow">Search Results</p>
                        <h3>{threadSearchResults.length} matches</h3>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setThreadSearchResults([])}
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="chat-search-result-list">
                      {threadSearchResults.map((message) => (
                        <article key={`search-${message.id}`} className="chat-search-result">
                          <strong>{message.sender_id === user.id ? 'You' : getParticipantLabel(selectedParticipant)}</strong>
                          <span>{formatMessageTimestamp(message.created_at)}</span>
                          <p>{message.content}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                <div className="chat-thread-body">
                  {threadLoading ? (
                    <p className="subtitle">Loading conversation...</p>
                  ) : messages.length ? (
                    <div className="chat-message-list">
                      {messages.map((message) => {
                        const isMine = message.sender_id === user.id
                        const isEditing = editingMessageId === message.id
                        const reactionGroups = getReactionGroups(message.reactions, user.id)
                        const canEditCurrentMessage = canEditMessage(message, user.id)
                        const editPending = messageActionKey === `edit:${message.id}`
                        return (
                          <article key={message.id} className={`chat-message-bubble ${isMine ? 'mine' : 'theirs'}`.trim()}>
                            <div className={`chat-message-copy ${isEditing ? 'is-editing' : ''}`.trim()}>
                              {isEditing ? (
                                <form className="chat-inline-editor" onSubmit={(event) => handleEditMessage(event, message.id)}>
                                  <textarea
                                    value={editingDraft}
                                    onChange={(event) => setEditingDraft(event.target.value)}
                                    rows={3}
                                  />
                                  <div className="chat-inline-editor-actions">
                                    <Button
                                      type="submit"
                                      variant="secondary"
                                      size="sm"
                                      className="rounded-full"
                                      disabled={editPending || !editingDraft.trim()}
                                    >
                                      <Check size={14} strokeWidth={2.1} aria-hidden="true" />
                                      <span>{editPending ? 'Saving...' : 'Save'}</span>
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="rounded-full"
                                      onClick={cancelEditingMessage}
                                      disabled={editPending}
                                    >
                                      <X size={14} strokeWidth={2.1} aria-hidden="true" />
                                      <span>Cancel</span>
                                    </Button>
                                  </div>
                                </form>
                              ) : (
                                <>
                                  <p>{message.content}</p>
                                  <div className="chat-message-meta">
                                    <span>{isMine ? 'You' : getParticipantLabel(selectedParticipant)}</span>
                                    <span>{formatMessageTimestamp(message.created_at)}</span>
                                    {message.edited && <span>Edited</span>}
                                  </div>

                                  <div className="chat-message-controls">
                                    <div className="chat-reaction-list">
                                      {reactionGroups.map((reaction) => {
                                        const reactionPending = messageActionKey === `reaction:${message.id}:${reaction.emoji}`
                                        return (
                                          <button
                                            key={`${message.id}-${reaction.emoji}`}
                                            type="button"
                                            className={`chat-reaction-chip ${reaction.active ? 'active' : ''}`.trim()}
                                            onClick={() => handleToggleReaction(message.id, reaction.emoji)}
                                            disabled={reactionPending}
                                          >
                                            <span>{reaction.emoji}</span>
                                            <span>{reaction.count}</span>
                                          </button>
                                        )
                                      })}
                                    </div>

                                    <div className="chat-message-actions">
                                      {QUICK_REACTIONS.map((emoji) => {
                                        const reactionPending = messageActionKey === `reaction:${message.id}:${emoji}`
                                        return (
                                          <button
                                            key={`${message.id}-${emoji}-quick`}
                                            type="button"
                                            className="chat-message-action"
                                            onClick={() => handleToggleReaction(message.id, emoji)}
                                            disabled={reactionPending}
                                            aria-label={`Toggle ${emoji} reaction`}
                                          >
                                            <span>{reactionPending ? '...' : emoji}</span>
                                          </button>
                                        )
                                      })}

                                      {canEditCurrentMessage && (
                                        <button
                                          type="button"
                                          className="chat-message-action"
                                          onClick={() => startEditingMessage(message)}
                                          disabled={Boolean(messageActionKey) && !editPending}
                                        >
                                          <Pencil size={14} strokeWidth={2.1} aria-hidden="true" />
                                          <span>Edit</span>
                                        </button>
                                      )}

                                      {isMine && (
                                        <button
                                          type="button"
                                          className="chat-message-action destructive"
                                          onClick={() => handleDeleteMessage(message.id)}
                                          disabled={messageActionKey === `delete:${message.id}`}
                                        >
                                          <Trash2 size={14} strokeWidth={2.1} aria-hidden="true" />
                                          <span>{messageActionKey === `delete:${message.id}` ? 'Deleting...' : 'Delete'}</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </article>
                        )
                      })}
                      {typingUsers.length > 0 && (
                        <div className="chat-typing-indicator">
                          {typingUsers.map((typingUserId) => getParticipantLabel(profiles[typingUserId])).join(', ')} typing...
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <EmptyState
                      eyebrow="No messages yet"
                      title="Start the conversation"
                      message="Ask a quick question about timing, pickup, or the rental workflow."
                    />
                  )}
                </div>

                <form className="chat-composer" onSubmit={handleSend}>
                  <textarea
                    value={composer}
                    onChange={(event) => handleComposerChange(event.target.value)}
                    placeholder="Type your message..."
                    rows={3}
                  />
                  <div className="chat-composer-actions">
                    <span className="subtitle">
                      {selectedConversation.is_muted
                        ? 'This thread is muted locally, but messages still arrive in real time.'
                        : 'Messages are sent in real time when the connection is live.'}
                    </span>
                    <Button type="submit" variant="primary" className="rounded-full" disabled={!composer.trim()}>
                      <SendHorizontal size={16} strokeWidth={2.1} aria-hidden="true" />
                      <span>Send</span>
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <EmptyState
                eyebrow="Select a conversation"
                title="Choose a chat from the inbox"
                message="Start from a listing or booking workflow if you do not have any active conversations yet."
                actions={[
                  emptyStateAction
                ]}
              />
            )}
          </section>
        </section>
      </DashboardShell>
    </div>
  )
}
