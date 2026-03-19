import { authService } from '../services/authService.js'
import React, { createContext, useEffect, useMemo, useState } from 'react'

export const AuthContext = createContext(null)

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)

  const isAuthenticated = !!token

  useEffect(() => {
    if (token && !user) {
      authService.me().then(setUser).catch(() => {
        // Token is stale or invalid — clear it to avoid ghost-auth state
        localStorage.removeItem('token')
        setToken('')
        setUser(null)
      })
    }
  }, [token])

  const login = (t, u) => {
    localStorage.setItem('token', t)
    setToken(t)
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken('')
    setUser(null)
  }

  const value = useMemo(() => ({ token, user, isAuthenticated, login, logout }), [token, user, isAuthenticated])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
