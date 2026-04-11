import { authService } from '../services/authService.js'
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { AUTH_STORAGE_EVENT, clearStoredAuth, readStoredAuth, writeStoredAuth } from '../services/authStorage.js'
import { userService } from '../services/userService.js'
import {
  clearFavoriteEquipment,
  getFavoriteEquipmentIds,
  setFavoriteEquipmentIds
} from '../utils/favorites.js'

export const AuthContext = createContext(null)

function mergeIds(serverFavorites = [], localFavorites = []) {
  return [...new Set([...serverFavorites, ...localFavorites].map((item) => String(item || '').trim()).filter(Boolean))]
}

function idsDiffer(left = [], right = []) {
  if (left.length !== right.length) return true
  const rightSet = new Set(right)
  return left.some((item) => !rightSet.has(item))
}

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readStoredAuth().token)
  const [sessionId, setSessionId] = useState(() => readStoredAuth().sessionId)
  const [user, setUser] = useState(null)

  const isAuthenticated = !!token

  const clearAuthState = useCallback(() => {
    clearStoredAuth()
    setUser(null)
    clearFavoriteEquipment()
  }, [])

  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null)
      return null
    }

    const nextUser = await authService.me()
    setUser(nextUser)
    return nextUser
  }, [token])

  const syncFavorites = useCallback(async () => {
    if (!token) return []

    const [serverFavorites, localFavorites] = await Promise.all([
      userService.favoriteEquipmentIds(),
      Promise.resolve(getFavoriteEquipmentIds())
    ])
    const mergedFavorites = mergeIds(serverFavorites, localFavorites)

    if (idsDiffer(serverFavorites, mergedFavorites)) {
      await userService.replaceFavoriteEquipmentIds(mergedFavorites)
    }

    setFavoriteEquipmentIds(mergedFavorites)
    return mergedFavorites
  }, [token])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const syncAuthState = (event) => {
      const nextState = event?.detail || readStoredAuth()
      setToken(nextState.token || '')
      setSessionId(nextState.sessionId || '')
      if (!nextState.token) {
        setUser(null)
      }
    }

    window.addEventListener(AUTH_STORAGE_EVENT, syncAuthState)
    return () => {
      window.removeEventListener(AUTH_STORAGE_EVENT, syncAuthState)
    }
  }, [])

  useEffect(() => {
    if (!token) return undefined

    let ignore = false

    const loadSession = async () => {
      try {
        const nextUser = await authService.me()
        if (ignore) return
        setUser(nextUser)

        try {
          await syncFavorites()
        } catch (favoriteError) {
          console.warn('Favorite sync failed; continuing with local state.', favoriteError)
        }
      } catch {
        if (ignore) return
        clearAuthState()
      }
    }

    loadSession()

    return () => {
      ignore = true
    }
  }, [clearAuthState, syncFavorites, token])

  const login = (nextToken, nextUser, nextSessionId = '', nextRefreshToken = '') => {
    writeStoredAuth({
      token: nextToken,
      refreshToken: nextRefreshToken,
      sessionId: nextSessionId || ''
    })
    setUser(nextUser)
  }

  const logout = useCallback(async () => {
    const { refreshToken, sessionId: storedSessionId } = readStoredAuth()
    try {
      await authService.logout(sessionId || storedSessionId || null, refreshToken || null)
    } catch (error) {
      console.warn('Logout request failed; clearing local auth state anyway.', error)
    } finally {
      clearAuthState()
    }
  }, [clearAuthState, sessionId])

  const value = useMemo(() => ({
    token,
    sessionId,
    user,
    isAuthenticated,
    login,
    logout,
    refreshUser,
    syncFavorites
  }), [token, sessionId, user, isAuthenticated, logout, refreshUser, syncFavorites])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
