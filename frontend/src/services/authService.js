import client from './api.js'

export const authService = {
  async login(credential, password) {
    const { data } = await client.post('/auth/login', { credential, password })
    const token = data.token || data.access_token
    const refreshToken = data.refresh_token || data.refreshToken || ''
    let user = data.user || null

    if (token && !user) {
      try {
        const me = await client.get('/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        user = me.data
      } catch {
        user = null
      }
    }

    return {
      token,
      refreshToken,
      user,
      sessionId: data.session_id || data.sessionId || null
    }
  },
  async refresh(refreshToken, sessionId = null) {
    const { data } = await client.post('/auth/refresh', {
      refresh_token: refreshToken,
      session_id: sessionId || null
    })
    return data
  },
  async register(payload) {
    const { data } = await client.post('/auth/register', payload)
    return data
  },
  async requestRegisterOtp(email) {
    const { data } = await client.post('/auth/register/request-otp', { email })
    return data
  },
  async verifyOtp(email, otp) {
    const { data } = await client.post('/auth/register/verify-otp', { email, otp })
    return data
  },
  async requestPasswordReset(email) {
    const { data } = await client.post('/auth/password-reset/request', { email })
    return data
  },
  async confirmPasswordReset(token, new_password) {
    const { data } = await client.post('/auth/password-reset/confirm', { token, new_password })
    return data
  },
  async me() {
    const { data } = await client.get('/users/me')
    return data
  },
  async logout(sessionId = null, refreshToken = null) {
    const { data } = await client.post('/auth/logout', {
      session_id: sessionId || null,
      refresh_token: refreshToken || null
    })
    return data
  }
}
