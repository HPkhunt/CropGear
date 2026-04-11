import React, { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
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
import { Select, SelectItem } from '@/components/ui/select'

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
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const navigate = useNavigate()
  const { addToast } = useToast()

  const passwordChecks = getPasswordChecks(password)

  React.useEffect(() => {
    if (step !== 'verify' || resendCooldown <= 0) return undefined
    const timer = window.setTimeout(() => {
      setResendCooldown((value) => Math.max(value - 1, 0))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [step, resendCooldown])

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      if (!isPasswordPolicySatisfied(password)) {
        addToast(PASSWORD_POLICY_MESSAGE, 'error')
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
      setResendCooldown(60)
      setStep('verify')
    } catch (err) {
      addToast(getErrorMessage(err, 'Registration failed. Please try again.'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async () => {
    if (!email.trim() || resending || resendCooldown > 0) return
    setResending(true)
    try {
      await authService.requestRegisterOtp(email.trim())
      addToast('A fresh verification code has been sent to your email.', 'success')
      setResendCooldown(60)
    } catch (err) {
      addToast(getErrorMessage(err, 'Unable to resend the verification code right now.'), 'error')
    } finally {
      setResending(false)
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
    <div className="container space-y-6 py-6 sm:space-y-8 sm:py-8">
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

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
        <Card className="overflow-hidden rounded-[28px] border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
          <SmartImage
            src="https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop"
            fallbackSrc="/hero.svg"
            alt="Registration process"
            className="h-56 w-full object-cover"
          />
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-950">Registration process</h2>
              <p className="text-sm leading-6 text-slate-600">Create your account in one pass, then verify it with a short code sent to your email.</p>
            </div>
            <div className="grid gap-3">
              <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4 text-sm text-slate-700">Fill in your basic information.</div>
              <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4 text-sm text-slate-700">Password must pass the security checks listed.</div>
              <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4 text-sm text-slate-700">Admin approval is required before login.</div>
            </div>
            <p className="text-sm text-slate-600">Quick and simple registration process.</p>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-white/70 bg-white/95 shadow-xl shadow-slate-200/60 backdrop-blur">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-950">Register</h2>
              <p className="text-sm leading-6 text-slate-600">Create your account to get started.</p>
            </div>

            {step === 'register' ? (
              <form className="space-y-5" onSubmit={submit}>
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <Label>Phone Number (Optional)</Label>
                  <Input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter your phone number"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onChange={(e) => setRole(e.target.value)}>
                    <SelectItem value="farmer">Farmer</SelectItem>
                    <SelectItem value="equipment_owner">Equipment Owner</SelectItem>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Password</Label>
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
                  <Label>Confirm Password</Label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full rounded-full" size="lg" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            ) : (
              <form className="space-y-5" onSubmit={verify}>
                <Alert variant="success">
                  <AlertTitle>Verification code sent</AlertTitle>
                  <AlertDescription>Verification code sent to <strong>{email}</strong>. It may take a minute to arrive.</AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Verification Code</Label>
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="######"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    className="text-center text-2xl font-extrabold tracking-[0.35em]"
                  />
                </div>

                <Button type="submit" className="w-full rounded-full" size="lg" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify & Complete'}
                </Button>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 rounded-full"
                    onClick={resendOtp}
                    disabled={loading || resending || resendCooldown > 0}
                  >
                    {resending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-full"
                    onClick={() => setStep('register')}
                  >
                    Back to Details
                  </Button>
                </div>
              </form>
            )}

            <p className="text-center text-sm text-slate-600">
              Already registered? <Link className="font-semibold text-primary-700 hover:text-primary-800" to="/auth/login">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
