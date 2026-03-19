import React, { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import { useToast } from '../context/ToastContext.jsx'

export default function RoleRoute({ roles = [] }) {
  const { user } = useAuth()
  const { addToast } = useToast()

  const isAllowed = user && (!roles.length || roles.includes(user.role))

  useEffect(() => {
    if (user && !isAllowed) {
      addToast(`This section requires ${roles.join(' or ')} access.`, 'error')
    }
  }, []) // Only on mount

  if (!isAllowed) return <Navigate to="/" replace />
  return <Outlet />
}
