import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import { authService } from '../../services/authService.js'
import { getErrorMessage } from '../../utils/helpers.js'
import PageHero from '../../components/PageHero.jsx'
import SmartImage from '../../components/SmartImage.jsx'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

      login(result.token, result.user, result.sessionId, result.refreshToken)
      navigate(redirectForRole[result.user.role] || '/farmer/dashboard')
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid credentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container space-y-6 py-6 sm:space-y-8 sm:py-8">
      <PageHero
        eyebrow="Login"
        title="Welcome Back to CropGear"
        subtitle="Sign in to your account to manage your operations."
        className="portal-primary"
        aside={(
          <div className="hero-visual-wrapper">
            <SmartImage
              src="https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop"
              fallbackSrc="/hero.svg"
              alt="CropGear sign in"
              className="page-hero-media"
            />
          </div>
        )}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
        <Card className="overflow-hidden rounded-[28px] border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
          <SmartImage
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1280&auto=format&fit=crop"
            fallbackSrc="/hero.svg"
            alt="Portal shortcuts"
            className="h-56 w-full object-cover"
          />
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Portal shortcuts</p>
              <h2 className="text-2xl font-semibold text-slate-950">Jump into your role-specific workspace</h2>
              <p className="text-sm leading-6 text-slate-600">Use the dedicated portal if you want role-scoped sign-in and tailored onboarding copy.</p>
            </div>
            <div className="grid gap-3">
              <Link to="/farmer-login" className="rounded-2xl border border-primary-100 bg-primary-50/70 px-4 py-4 transition hover:border-primary-200 hover:bg-primary-50">
                <strong className="block text-sm text-slate-950">Farmer portal</strong>
                <span className="mt-1 block text-sm text-slate-600">Browse equipment and track booking status.</span>
              </Link>
              <Link to="/owner-login" className="rounded-2xl border border-primary-100 bg-primary-50/70 px-4 py-4 transition hover:border-primary-200 hover:bg-primary-50">
                <strong className="block text-sm text-slate-950">Owner portal</strong>
                <span className="mt-1 block text-sm text-slate-600">Manage listings, requests, and renter trust.</span>
              </Link>
              <Link to="/admin-login" className="rounded-2xl border border-primary-100 bg-primary-50/70 px-4 py-4 transition hover:border-primary-200 hover:bg-primary-50">
                <strong className="block text-sm text-slate-950">Admin portal</strong>
                <span className="mt-1 block text-sm text-slate-600">Moderate operations and platform health.</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-white/70 bg-white/95 shadow-xl shadow-slate-200/60 backdrop-blur">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-950">Sign In</h2>
              <p className="text-sm leading-6 text-slate-600">Enter your credentials to continue.</p>
            </div>

            {error ? (
              <Alert variant="error">
                <AlertTitle>Unable to sign in</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="login-credential">Email or Phone Number</Label>
                <Input
                  id="login-credential"
                  type="text"
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
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

              <Button type="submit" className="w-full rounded-full" size="lg" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="space-y-2 text-sm text-slate-600">
              <p className="text-center">
                Forgot your password? <Link className="font-semibold text-primary-700 hover:text-primary-800" to="/auth/forgot-password">Reset it here</Link>
              </p>
              <p className="text-center">
                New to CropGear? <Link className="font-semibold text-primary-700 hover:text-primary-800" to="/auth/register">Create an account</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
