import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '../../services/authService.js'
import { getErrorMessage } from '../../utils/helpers.js'
import useToast from '@/hooks/useToast'
import PageHero from '../../components/PageHero.jsx'
import SmartImage from '../../components/SmartImage.jsx'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    <div className="container space-y-6 py-6 sm:space-y-8 sm:py-8">
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

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
        <Card className="overflow-hidden rounded-[28px] border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
          <SmartImage
            src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1280&auto=format&fit=crop"
            fallbackSrc="/hero.svg"
            alt="Account recovery"
            className="h-56 w-full object-cover"
          />
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-950">Recovery checklist</h2>
              <p className="text-sm leading-6 text-slate-600">A secure reset email is the fastest path back into your account.</p>
            </div>
            <div className="grid gap-3">
              <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4 text-sm text-slate-700">Enter the email you used to create the account.</div>
              <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4 text-sm text-slate-700">Look for a message with a reset link and token.</div>
              <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4 text-sm text-slate-700">Your reset link expires after a short window.</div>
            </div>
            <p className="text-sm text-slate-600">Need help? Contact support for manual recovery.</p>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-white/70 bg-white/95 shadow-xl shadow-slate-200/60 backdrop-blur">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-950">Request Reset</h2>
              <p className="text-sm leading-6 text-slate-600">We will send you a secure reset link if the account exists.</p>
            </div>

            {sent ? (
              <Alert variant="success">
                <AlertTitle>Check your inbox</AlertTitle>
                <AlertDescription>The reset link and token are on the way.</AlertDescription>
              </Alert>
            ) : null}

            <form className="space-y-5" onSubmit={submit}>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <Button type="submit" className="w-full rounded-full" size="lg" disabled={loading}>
                {loading ? 'Processing...' : 'Send Recovery Link'}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-600">
              Remembered your password? <Link className="font-semibold text-primary-700 hover:text-primary-800" to="/auth/login">Return to sign in</Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
