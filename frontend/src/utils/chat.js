export { getDashboardLinksForRole } from './dashboardLinks.js'

export function getMessagesRoute(role) {
  if (role === 'equipment_owner') return '/owner/messages'
  if (role === 'admin') return '/admin/messages'
  return '/farmer/messages'
}

export function getWorkspaceTitleForRole(role) {
  if (role === 'equipment_owner') return 'Owner Panel'
  if (role === 'admin') return 'Admin Control'
  return 'Farmer Panel'
}

export function getWorkspaceSubtitleForRole(role) {
  if (role === 'equipment_owner') return 'Chat workspace'
  if (role === 'admin') return 'Messaging oversight'
  return 'Messages'
}

export function getOtherParticipantId(conversation, currentUserId) {
  const participants = Array.isArray(conversation?.participants) ? conversation.participants : []
  return participants.find((participantId) => participantId !== currentUserId) || participants[0] || ''
}

export function formatMessageTimestamp(value) {
  if (!value) return 'Just now'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Just now'

  const now = new Date()
  const isToday = parsed.toDateString() === now.toDateString()

  return parsed.toLocaleString(undefined, isToday
    ? { hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function getMessagePreview(message) {
  if (!message?.content) return 'Conversation started'
  return String(message.content).trim()
}

export function canEditMessage(message, currentUserId, windowMinutes = 15) {
  if (!message || message.sender_id !== currentUserId) return false

  const createdAt = new Date(message.created_at)
  if (Number.isNaN(createdAt.getTime())) return false

  return (Date.now() - createdAt.getTime()) <= windowMinutes * 60 * 1000
}

export function getReactionGroups(reactions = [], currentUserId = '') {
  const groups = new Map()

  reactions.forEach((reaction) => {
    const emoji = reaction?.emoji
    if (!emoji) return

    const current = groups.get(emoji) || {
      emoji,
      count: 0,
      active: false
    }
    current.count += 1
    current.active = current.active || reaction?.user_id === currentUserId
    groups.set(emoji, current)
  })

  return [...groups.values()]
}

export function isLastConversationMessage(conversation, messageId) {
  return Boolean(conversation?.last_message?.id && conversation.last_message.id === messageId)
}
