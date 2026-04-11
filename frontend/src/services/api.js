import axios from 'axios'
import { clearStoredAuth, readStoredAuth, writeStoredAuth } from './authStorage.js'
import { isRequestCanceled } from '../utils/helpers.js'

const apiBase = import.meta.env.VITE_API_BASE || '/api/v1'

const client = axios.create({ baseURL: apiBase, timeout: 10000 })
let refreshPromise = null

export const resetApiBase = () => {
  // No-op: base URL is fixed to relative path unless VITE_API_BASE is set.
}

client.interceptors.request.use((config) => {
  const { token } = readStoredAuth()
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.baseURL = config.baseURL || apiBase
  return config
})

function isAuthRefreshRequest(config) {
  const url = `${config?.url || ''}`
  return url.includes('/auth/refresh')
}

function shouldAttemptRefresh(error) {
  const statusCode = error?.response?.status
  const config = error?.config || {}
  const url = `${config.url || ''}`
  if (statusCode !== 401 || config._retry) return false
  if (isAuthRefreshRequest(config)) return false
  if (url.includes('/auth/login') || url.includes('/auth/logout')) return false
  return Boolean(readStoredAuth().refreshToken)
}

async function refreshAuthTokens() {
  if (!refreshPromise) {
    const { refreshToken, sessionId } = readStoredAuth()
    refreshPromise = axios.post(
      '/auth/refresh',
      {
        refresh_token: refreshToken,
        session_id: sessionId || null
      },
      {
        baseURL: apiBase,
        timeout: 10000
      }
    )
      .then(({ data }) => {
        const nextToken = data?.token || data?.access_token || ''
        const nextRefreshToken = data?.refresh_token || ''
        const nextSessionId = data?.session_id || data?.sessionId || sessionId || ''
        if (!nextToken || !nextRefreshToken) {
          throw new Error('Refresh response is incomplete.')
        }
        writeStoredAuth({
          token: nextToken,
          refreshToken: nextRefreshToken,
          sessionId: nextSessionId
        })
        return nextToken
      })
      .catch((error) => {
        clearStoredAuth()
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (isRequestCanceled(error)) {
      return Promise.reject(error)
    }

    if (shouldAttemptRefresh(error)) {
      try {
        const nextToken = await refreshAuthTokens()
        const retryConfig = { ...error.config, _retry: true }
        retryConfig.headers = { ...(retryConfig.headers || {}), Authorization: `Bearer ${nextToken}` }
        return client.request(retryConfig)
      } catch (refreshError) {
        return Promise.reject(refreshError)
      }
    }

    if (!error.response) {
      error.message = 'Cannot reach backend API. Ensure the backend is running and available at the same origin.'
      _dispatchApiError('network', 'Network Error: Cannot reach backend application.')
    } else if (error.response.status >= 500) {
      _dispatchApiError('server', 'Service Disruption: Backend services are currently unavailable or degraded.')
    }
    return Promise.reject(error)
  }
)

// Throttle api-error events to at most one per 5 seconds to prevent banner spam
let _lastApiErrorTime = 0
function _dispatchApiError(type, message) {
  const now = Date.now()
  if (now - _lastApiErrorTime < 5000) return
  _lastApiErrorTime = now
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('api-error', { detail: { type, message } }))
  }
}

export default client
