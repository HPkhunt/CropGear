import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '../../services/authService.js'
import { getErrorMessage } from '../../utils/helpers.js'
import { useToast } from '../../context/ToastContext.jsx'
import PageHero from '../../components/PageHero.jsx'
import SmartImage from '../../components/SmartImage.jsx'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { addToast } = useToast()

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await authService.requestPasswordReset(email.trim())
      setSent(true)
      addToast(response?.message || 'Password reset instructions sent.', 'success')
    } catch (err) {
      addToast(getErrorMessage(err, 'Unable to send password reset email right now.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container page-wrap">
      <PageHero
        eyebrow="Account Recovery"
        title="Restore access to your account"
        subtitle="Provide your registered email address, and we'll send you a secure bypass link to update your credentials."
        className="portal-secondary"
        aside={
          <div className="hero-visual-wrapper">
            <SmartImage
              src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1280&auto=format&fit=crop"
              fallbackSrc="/hero.svg"
              alt="Password reset assistance"
              className="page-hero-media"
            />
          </div>
        }
      />

      <section className="auth-layout auth-split">
        <aside className="card info-panel auth-showcase">
          <SmartImage
            src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1280&auto=format&fit=crop"
            fallbackSrc="/hero.svg"
            alt="Account recovery"
            className="auth-showcase-image"
          />
          <h2>Recovery Checklist</h2>
          <ul className="feature-list">
            <li><span>Enter the email you used to create the account.</span></li>
            <li><span>Look for a message with a reset link and token.</span></li>
            <li><span>Your reset link expires after a short window.</span></li>
          </ul>
          <p className="subtitle">Need help? Contact support for manual recovery.</p>
        </aside>

        <section className="card auth-card portal-secondary single-card auth-form">
          <h2>Request Reset</h2>
          <p className="subtitle">We will send you a secure reset link if the account exists.</p>
          {sent && (
            <p className="success-banner">Check your inbox for the reset link and token.</p>
          )}

          <form className="form-stack" onSubmit={submit}>
            <label>
              Email Address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <button type="submit" className="button lg gradient pill" disabled={loading}>
              {loading ? 'Processing...' : 'Send Recovery Link'}
            </button>
          </form>

          <p className="switch-link">
            Remembered your password? <Link to="/auth/login">Return to sign in</Link>
          </p>
        </section>
      </section>
    </div>
  )
}
