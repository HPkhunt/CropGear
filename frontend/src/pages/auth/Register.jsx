import React, { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { authService } from '../../services/authService.js'
import { getErrorMessage } from '../../utils/helpers.js'
import { useToast } from '../../context/ToastContext.jsx'
import PageHero from '../../components/PageHero.jsx'
import SmartImage from '../../components/SmartImage.jsx'

export default function Register() {
  const [params] = useSearchParams()
  const initialRole = params.get('role') === 'equipment_owner' ? 'equipment_owner' : 'farmer'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [role, setRole] = useState(initialRole)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('register') // 'register' or 'verify'
  const [otp, setOtp] = useState('')
  const navigate = useNavigate()
  const { addToast } = useToast()

  const passwordChecks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
    { label: 'Special character', ok: /[^A-Za-z0-9]/.test(password) }
  ]

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      if (!passwordChecks.every((check) => check.ok)) {
        addToast('Password does not meet the required characteristics.', 'error')
        setLoading(false)
        return
      }
      if (password !== confirmPassword) {
        addToast('Password and confirm password do not match.', 'error')
        setLoading(false)
        return
      }
      await authService.register({
        email: email.trim(),
        password,
        full_name: fullName,
        phone_number: phoneNumber,
        role
      })
      await authService.requestRegisterOtp(email.trim())
      addToast('Registration received. Please check your email for a verification code.', 'success')
      setStep('verify')
    } catch (err) {
      addToast(getErrorMessage(err, 'Registration failed. Please try again.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const verify = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      if (otp.length !== 6) {
        addToast('Please enter a valid 6-digit code.', 'error')
        setLoading(false)
        return
      }
      await authService.verifyOtp(email.trim(), otp)
      addToast('Registration submitted. Admin approval is required before login.', 'success')
      setTimeout(() => navigate('/auth/login'), 2500)
    } catch (err) {
      addToast(getErrorMessage(err, 'Verification failed.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container page-wrap">
      <PageHero
        eyebrow="Create Account"
        title="Join the redesigned CropGear platform"
        subtitle="Register as a farmer or equipment owner account."
        className="portal-secondary"
        aside={
          <SmartImage
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1280&auto=format&fit=crop"
            fallbackSrc="/hero.svg"
            alt="Registration workspace"
            className="page-hero-media"
          />
        }
      />

      <section className="auth-layout auth-split">
        <aside className="card info-panel auth-showcase">
          <SmartImage
            src="https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop"
            fallbackSrc="/hero.svg"
            alt="Registration process"
            className="auth-showcase-image"
          />
          <h2>Registration Process</h2>
          <ul className="feature-list">
            <li><span>Fill in your basic information.</span></li>
            <li><span>Password must pass the security checks listed.</span></li>
            <li><span>Admin approval is required before login.</span></li>
          </ul>
          <p className="subtitle">Quick and simple registration process.</p>
        </aside>

        <section className="card auth-card portal-secondary single-card auth-form">
          <h2>Register</h2>
          <p className="subtitle">Create your account to get started.</p>

          {step === 'register' ? (
            <form className="form-stack" onSubmit={submit}>
              <label>
                Full Name
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </label>

              <label>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>

              <label>
                Phone Number (Optional)
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                />
              </label>

              <label>
                Role
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="farmer">Farmer</option>
                  <option value="equipment_owner">Equipment Owner</option>
                </select>
              </label>

              <label>
                Password
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
                Confirm Password
                <div className="password-row">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="button sm outline"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <button type="submit" className="button lg gradient" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          ) : (
            <form className="form-stack" onSubmit={verify}>
              <p className="panel-note" style={{ background: 'rgba(52, 211, 153, 0.1)', padding: '12px', borderRadius: '12px', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Verification code sent to <strong>{email}</strong>. It may take a minute to arrive.
              </p>
              <label>
                Verification Code
                <input
                  type="text"
                  maxLength={6}
                  placeholder="######"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.5rem', fontWeight: 800 }}
                />
              </label>
              <button type="submit" className="button lg gradient" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Complete'}
              </button>
              <button
                type="button"
                className="button sm outline pill"
                style={{ marginTop: '1rem', alignSelf: 'center' }}
                onClick={() => setStep('register')}
              >
                Back to Details
              </button>
            </form>
          )}

          <p className="switch-link">
            Already registered? <Link to="/auth/login">Sign in</Link>
          </p>
        </section>
      </section>
    </div>
  )
}
