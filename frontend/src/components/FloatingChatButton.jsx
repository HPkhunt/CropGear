import React, { useMemo } from 'react'
import { MessageCircleMore } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import useAuth from '../hooks/useAuth.js'
import { getMessagesRoute } from '../utils/chat.js'

export default function FloatingChatButton() {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  const chatPath = useMemo(
    () => (isAuthenticated ? getMessagesRoute(user?.role) : '/auth/login'),
    [isAuthenticated, user?.role]
  )

  const isActive = location.pathname === chatPath

  return (
    <Link
      to={chatPath}
      aria-label="Open chat"
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        buttonVariants({ variant: isActive ? 'secondary' : 'default', size: 'md' }),
        'fixed bottom-5 right-5 z-[70] rounded-full px-5 py-3 shadow-2xl shadow-primary-200/70 sm:bottom-6 sm:right-6'
      )}
    >
      <MessageCircleMore className="h-5 w-5" aria-hidden="true" />
      <span>Chat</span>
    </Link>
  )
}
