import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authService } from '../../services/authService.js'
import { getErrorMessage } from '../../utils/helpers.js'
import useToast from '@/hooks/useToast'
import PageHero from '../../components/PageHero.jsx'
import SmartImage from '../../components/SmartImage.jsx'
import { getPasswordChecks, isPasswordPolicySatisfied, PASSWORD_POLICY_MESSAGE } from '../../utils/passwordPolicy.js'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    () => getPasswordChecks(password),
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
      if (!isPasswordPolicySatisfied(password)) {
        addToast(PASSWORD_POLICY_MESSAGE, 'error')
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
    <div className="container space-y-6 py-6 sm:space-y-8 sm:py-8">
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

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
        <Card className="overflow-hidden rounded-[28px] border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
          <SmartImage
            src="https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=1280&auto=format&fit=crop"
            fallbackSrc="/hero.svg"
            alt="Reset details"
            className="h-56 w-full object-cover"
          />
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-950">Before you reset</h2>
              <p className="text-sm leading-6 text-slate-600">Make sure you have the token from your recovery email and choose a strong password.</p>
            </div>
            <div className="grid gap-3">
              <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4 text-sm text-slate-700">Open the reset email and copy the secure token.</div>
              <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4 text-sm text-slate-700">Choose a password that meets every security check.</div>
              <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4 text-sm text-slate-700">Tokens expire quickly for your protection.</div>
            </div>
            <p className="text-sm text-slate-600">Need a new token? Request another reset email.</p>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-white/70 bg-white/95 shadow-xl shadow-slate-200/60 backdrop-blur">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-950">Set New Password</h2>
              <p className="text-sm leading-6 text-slate-600">Enter the reset token and choose a new password.</p>
            </div>

            {success ? (
              <Alert variant="success">
                <AlertTitle>Password updated</AlertTitle>
                <AlertDescription>Redirecting you to sign in.</AlertDescription>
              </Alert>
            ) : null}

            <form className="space-y-5" onSubmit={submit}>
              <div className="space-y-2">
                <Label>Reset Token</Label>
                <Input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste the token from your email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </div>

              <ul className="grid gap-2">
                {passwordChecks.map((check) => (
                  <li
                    key={check.label}
                    className={check.ok
                      ? 'rounded-2xl border border-green-100 bg-green-50/80 px-4 py-3 text-sm text-green-700'
                      : 'rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600'}
                  >
                    {check.ok ? 'Passed:' : 'Required:'} {check.label}
                  </li>
                ))}
              </ul>

              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full rounded-full" size="lg" disabled={loading}>
                {loading ? 'Securing account...' : 'Finalize Password'}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-600">
              Need another reset email? <Link className="font-semibold text-primary-700 hover:text-primary-800" to="/auth/forgot-password">Request again</Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
