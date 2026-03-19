import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import { authService } from '../../services/authService.js'
import { getErrorMessage } from '../../utils/helpers.js'
import PageHero from '../../components/PageHero.jsx'
import SmartImage from '../../components/SmartImage.jsx'

const redirectForRole = {
  farmer: '/farmer/dashboard',
  equipment_owner: '/owner/dashboard',
  admin: '/admin/dashboard'
}

export default function Login() {
  const [credential, setCredential] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await authService.login(credential.trim(), password)
      if (!result?.token || !result?.user) {
        setError('Login response is incomplete. Verify backend compatibility.')
        return
      }

      login(result.token, result.user)
      navigate(redirectForRole[result.user.role] || '/farmer/dashboard')
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid credentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container page-wrap">
      <PageHero
        eyebrow="Login"
        title="Welcome Back to CropGear"
        subtitle="Sign in to your account to manage your operations."
        className="portal-primary"
      />

      <section className="auth-layout" style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div className="card auth-card portal-primary auth-form">
          <h2>Sign In</h2>
          <p className="subtitle">Enter your credentials to continue.</p>
          {error && <p className="error-banner">{error}</p>}

          <form onSubmit={submit} className="form-stack">
            <label htmlFor="login-credential">
              Email or Phone Number
              <input
                id="login-credential"
                type="text"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                required
                autoComplete="username"
              />
            </label>

            <label htmlFor="login-password">
              Password
              <div className="password-row">
                <input
                  id="login-password"
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

            <button type="submit" className="button lg gradient" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
            <p className="switch-link" style={{ textAlign: 'center', marginBottom: 0 }}>
              Forgot your password? <Link to="/auth/forgot-password">Reset it here</Link>
            </p>
            <p className="switch-link" style={{ textAlign: 'center', marginBottom: 0 }}>
              New to CropGear? <Link to="/auth/register">Create an account</Link>
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
              <Link to="/farmer-login" className="button sm outline">Farmer Login</Link>
              <Link to="/owner-login" className="button sm outline">Owner Login</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
