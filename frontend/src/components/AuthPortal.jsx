import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import { authService } from '../services/authService.js'
import { getErrorMessage } from '../utils/helpers.js'
import { useToast } from '../context/ToastContext.jsx'
import PageHero from './PageHero.jsx'
const redirects = {
  farmer: '/farmer/dashboard',
  equipment_owner: '/owner/dashboard',
  admin: '/admin/dashboard'
}

export default function AuthPortal({
  role,
  eyebrow,
  title,
  subtitle,
  highlights,
  accent = 'primary',
  image = null
}) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { addToast } = useToast()
  const [credential, setCredential] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const accentClass = useMemo(() => {
    if (accent === 'secondary') return 'portal-secondary'
    if (accent === 'dark') return 'portal-dark'
    return 'portal-primary'
  }, [accent])

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await authService.login(credential.trim(), password)
      if (!result?.token || !result?.user) {
        addToast('Login response is incomplete. Check backend compatibility.', 'error')
        return
      }
      if (result.user.role !== role) {
        addToast(`This portal is only for ${role.replace('_', ' ')} users.`, 'error')
        return
      }

      login(result.token, result.user)
      addToast(`Welcome back, ${result.user.full_name || 'User'}!`, 'success')
      navigate(redirects[role] || '/')
    } catch (err) {
      addToast(getErrorMessage(err, 'Unable to sign in with these credentials.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const themeClass = role === 'equipment_owner' ? 'theme-owner' : role === 'admin' ? 'theme-admin' : 'theme-primary'

  return (
    <div className={`container page-wrap ${themeClass}`}>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        className={accentClass}
      />

      <section className="auth-layout" style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div className={`card auth-card ${accentClass} auth-form`}>
          <h2>Sign In</h2>
          <p className="subtitle">Use your account credentials to continue.</p>

          <form className="form-stack" onSubmit={submit}>
            <label htmlFor={`auth-credential-${role}`}>
              Email or Phone Number
              <input
                id={`auth-credential-${role}`}
                type="text"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                required
                autoComplete="username"
              />
            </label>

            <label htmlFor={`auth-password-${role}`}>
              Password
              <div className="password-row">
                <input
                  id={`auth-password-${role}`}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="button sm outline"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            <button className="button lg gradient" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
            <p className="switch-link" style={{ textAlign: 'center', marginBottom: 0 }}>
              Forgot your password? <Link to="/auth/forgot-password">Reset it here</Link>
            </p>
            <p className="switch-link" style={{ textAlign: 'center', marginBottom: 0 }}>
              Need another portal? <Link to="/auth/login">View all login options</Link>
            </p>
          </div>
        </div>
      </section >
    </div >
  )
}
