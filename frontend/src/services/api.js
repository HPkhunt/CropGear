import axios from 'axios'
import { getErrorMessage, isRateLimitError, isRequestCanceled } from '../utils/helpers.js'

const apiBase = import.meta.env.VITE_API_BASE || '/api/v1'

const client = axios.create({ baseURL: apiBase, timeout: 10000 })

export const resetApiBase = () => {
  // No-op: base URL is fixed to relative path unless VITE_API_BASE is set.
}

client.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.baseURL = config.baseURL || apiBase
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isRequestCanceled(error)) {
      return Promise.reject(error)
    }

    if (!error.response) {
      error.message = 'Cannot reach backend API. Ensure the backend is running and available at the same origin.'
      _dispatchApiError('network', 'Network Error: Cannot reach backend application.')
    } else if (isRateLimitError(error)) {
      error.message = getErrorMessage(error, 'Too many requests right now. Please wait a moment and try again.')
      _dispatchApiError('rate_limit', error.message)
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
