import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authService } from '../../services/authService.js'
import { getErrorMessage } from '../../utils/helpers.js'
import { useToast } from '../../context/ToastContext.jsx'
import PageHero from '../../components/PageHero.jsx'
import SmartImage from '../../components/SmartImage.jsx'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const initialToken = params.get('token') || ''
  const [token, setToken] = useState(initialToken)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { addToast } = useToast()
  const navigate = useNavigate()

  const passwordChecks = useMemo(
    () => [
      { label: 'At least 8 characters', ok: password.length >= 8 },
      { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
      { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
      { label: 'Number', ok: /\d/.test(password) },
      { label: 'Special character', ok: /[^A-Za-z0-9]/.test(password) }
    ],
    [password]
  )

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      if (!token.trim()) {
        addToast('Paste the reset token from your email.', 'error')
        return
      }
      if (!passwordChecks.every((check) => check.ok)) {
        addToast('Password does not meet the required characteristics.', 'error')
        return
      }
      if (password !== confirmPassword) {
        addToast('Password and confirm password do not match.', 'error')
        return
      }
      await authService.confirmPasswordReset(token.trim(), password)
      setSuccess(true)
      addToast('Password updated. Redirecting to login...', 'success')
      setTimeout(() => navigate('/auth/login'), 2000)
    } catch (err) {
      addToast(getErrorMessage(err, 'Unable to reset password.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container page-wrap">
      <PageHero
        eyebrow="Security Gateway"
        title="Finalize your new password"
        subtitle="Secure your account with a high-entropy password. Enter the one-time token received via email."
        className="portal-primary"
        aside={
          <div className="hero-visual-wrapper">
            <SmartImage
              src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1280&auto=format&fit=crop"
              fallbackSrc="/hero.svg"
              alt="Secure password update"
              className="page-hero-media"
            />
          </div>
        }
      />

      <section className="auth-layout auth-split">
        <aside className="card info-panel auth-showcase">
          <SmartImage
            src="https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=1280&auto=format&fit=crop"
            fallbackSrc="/hero.svg"
            alt="Reset details"
            className="auth-showcase-image"
          />
          <h2>Before You Reset</h2>
          <ul className="feature-list">
            <li><span>Open the reset email and copy the secure token.</span></li>
            <li><span>Choose a password that meets every security check.</span></li>
            <li><span>Tokens expire quickly for your protection.</span></li>
          </ul>
          <p className="subtitle">Need a new token? Request another reset email.</p>
        </aside>

        <section className="card auth-card portal-primary single-card auth-form">
          <h2>Set New Password</h2>
          <p className="subtitle">Enter the reset token and choose a new password.</p>
          {success && (
            <p className="success-banner">Password updated. Redirecting you to sign in.</p>
          )}

          <form className="form-stack" onSubmit={submit}>
            <label>
              Reset Token
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste the token from your email"
                required
              />
            </label>

            <label>
              New Password
              <div className="password-row">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

            <ul className="password-rules">
              {passwordChecks.map((check) => (
                <li key={check.label} className={check.ok ? 'ok' : ''}>
                  {check.ok ? 'Passed:' : 'Required:'} {check.label}
                </li>
              ))}
            </ul>

            <label>
              Confirm New Password
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </label>

            <button type="submit" className="button lg gradient pill" disabled={loading}>
              {loading ? 'Securing account...' : 'Finalize Password'}
            </button>
          </form>

          <p className="switch-link">
            Need another reset email? <Link to="/auth/forgot-password">Request again</Link>
          </p>
        </section>
      </section>
    </div>
  )
}
