import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import { authService } from '../services/authService.js'
import { getErrorMessage } from '../utils/helpers.js'
import useToast from '@/hooks/useToast'
import SmartImage from './SmartImage.jsx'
import PageHero from './PageHero.jsx'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const redirects = {
  farmer: '/farmer/dashboard',
  equipment_owner: '/owner/dashboard',
  admin: '/admin/dashboard'
}

const portalRoutes = {
  farmer: '/farmer-login',
  equipment_owner: '/owner-login',
  admin: '/admin-login'
}

export default function AuthPortal({
  role,
  eyebrow,
  title,
  subtitle,
  accent = 'primary',
  image,
  highlights = []
}) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { addToast } = useToast()
  const [credential, setCredential] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const accentClass = accent === 'secondary' ? 'portal-secondary' : accent === 'admin' ? 'portal-admin' : 'portal-primary'

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)

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

      login(result.token, result.user, result.sessionId, result.refreshToken)
      addToast(`Welcome back, ${result.user.full_name || 'User'}!`, 'success')
      navigate(redirects[role] || '/')
    } catch (err) {
      addToast(getErrorMessage(err, 'Unable to sign in with these credentials.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container space-y-6 py-6 sm:space-y-8 sm:py-8">
      <PageHero
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        className={accentClass}
        aside={(
          <div className="hero-visual-wrapper">
            <SmartImage
              src={image}
              fallbackSrc="/hero.svg"
              alt={`${title} preview`}
              className="page-hero-media"
            />
            <div className="hero-floating-card">
              <div className="card-mini-stat">
                <span>{highlights.length || 3}</span>
                <small>Portal benefits</small>
              </div>
            </div>
          </div>
        )}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <Card className="overflow-hidden rounded-[28px] border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
          <SmartImage
            src={image}
            fallbackSrc="/hero.svg"
            alt={`${title} workspace`}
            className="h-56 w-full object-cover"
          />
          <CardContent className="space-y-5 p-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Why this portal</p>
              <h2 className="text-2xl font-semibold text-slate-950">Built around your role workflow</h2>
              <p className="text-sm leading-6 text-slate-600">Jump straight into the controls and data that matter for your day-to-day operations.</p>
            </div>

            <div className="space-y-3">
              {highlights.map((highlight) => (
                <div key={highlight.title} className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4">
                  <strong className="block text-sm text-slate-950">{highlight.title}</strong>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{highlight.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-white/70 bg-white/95 shadow-xl shadow-slate-200/60 backdrop-blur">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="space-y-3">
              <Tabs value={role} onValueChange={(nextRole) => navigate(portalRoutes[nextRole] || portalRoutes.farmer)}>
                <TabsList>
                  <TabsTrigger value="farmer">Farmer</TabsTrigger>
                  <TabsTrigger value="equipment_owner">Owner</TabsTrigger>
                  <TabsTrigger value="admin">Admin</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-slate-950">Sign In</h2>
                <p className="text-sm leading-6 text-slate-600">Use your account credentials to continue into the {role.replace('_', ' ')} workspace.</p>
              </div>
            </div>

            <Alert variant="info" className="rounded-2xl">
              <AlertTitle>Portal scoped access</AlertTitle>
              <AlertDescription>This login accepts only {role.replace('_', ' ')} accounts so each workspace stays role-specific.</AlertDescription>
            </Alert>

            <form className="space-y-5" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor={`auth-credential-${role}`}>Email or Phone Number</Label>
                <Input
                  id={`auth-credential-${role}`}
                  type="text"
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`auth-password-${role}`}>Password</Label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    id={`auth-password-${role}`}
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

              <Button className="w-full rounded-full" size="lg" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="space-y-2 text-sm text-slate-600">
              <p className="text-center">
                Forgot your password? <Link className="font-semibold text-primary-700 hover:text-primary-800" to="/auth/forgot-password">Reset it here</Link>
              </p>
              <p className="text-center">
                Need another portal? <Link className="font-semibold text-primary-700 hover:text-primary-800" to="/auth/login">View all login options</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
