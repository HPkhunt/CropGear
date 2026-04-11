export const AUTH_STORAGE_EVENT = 'cropgear:auth-changed'

function readValue(key) {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(key) || ''
}

function dispatchAuthChanged(detail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(AUTH_STORAGE_EVENT, { detail }))
}

export function readStoredAuth() {
  return {
    token: readValue('token'),
    refreshToken: readValue('refresh_token'),
    sessionId: readValue('session_id')
  }
}

export function writeStoredAuth({ token = '', refreshToken = '', sessionId = '' }) {
  if (typeof window === 'undefined') return

  if (token) localStorage.setItem('token', token)
  else localStorage.removeItem('token')

  if (refreshToken) localStorage.setItem('refresh_token', refreshToken)
  else localStorage.removeItem('refresh_token')

  if (sessionId) localStorage.setItem('session_id', sessionId)
  else localStorage.removeItem('session_id')

  dispatchAuthChanged({
    token: token || '',
    refreshToken: refreshToken || '',
    sessionId: sessionId || ''
  })
}

export function clearStoredAuth() {
  writeStoredAuth({ token: '', refreshToken: '', sessionId: '' })
}
