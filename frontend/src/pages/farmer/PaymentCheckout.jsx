import React, { useEffect, useMemo, useState } from 'react'
import { Elements, CardElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { ArrowLeft, CreditCard, ReceiptText, ShieldCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import DashboardShell from '../../components/DashboardShell.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import PageHero from '../../components/PageHero.jsx'
import { bookingService } from '../../services/bookingService.js'
import { paymentService } from '../../services/paymentService.js'
import useAuth from '../../hooks/useAuth.js'
import useToast from '@/hooks/useToast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCurrency, getErrorMessage } from '../../utils/helpers.js'
import { farmerDashboardLinks } from '../../utils/dashboardLinks.js'
import {
  canPayForBooking,
  formatBookingStatusLabel,
  getBookingStatusClass,
  normalizeBookingStatus
} from '../../utils/bookings.js'

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#1a1f1c',
      fontFamily: '"Manrope", sans-serif',
      fontSize: '16px',
      '::placeholder': {
        color: '#6b7c73'
      }
    },
    invalid: {
      color: '#b42318'
    }
  }
}

function CheckoutForm({ booking, currentUser, onCompleted }) {
  const stripe = useStripe()
  const elements = useElements()
  const { addToast } = useToast()
  const [email, setEmail] = useState(currentUser?.email || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!email && currentUser?.email) {
      setEmail(currentUser.email)
    }
  }, [currentUser?.email, email])

  const submit = async (event) => {
    event.preventDefault()
    if (!stripe || !elements || submitting) return

    setSubmitting(true)
    setError('')

    try {
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error('Card entry is not ready yet.')
      }

      const intent = await paymentService.createIntent(
        booking.id,
        Number(booking.total_amount || 0),
        email.trim()
      )

      const confirmation = await stripe.confirmCardPayment(intent.client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            email: email.trim(),
            name: currentUser?.full_name || currentUser?.name || 'CropGear User'
          }
        }
      })

      if (confirmation.error) {
        throw new Error(confirmation.error.message || 'Card confirmation failed.')
      }

      if (confirmation.paymentIntent?.status !== 'succeeded') {
        throw new Error(`Payment status is ${confirmation.paymentIntent?.status || 'unknown'}.`)
      }

      const finalized = await paymentService.confirmPayment(confirmation.paymentIntent.id)
      const payment = finalized?.payment || null
      onCompleted(payment)
      addToast('Payment completed and receipt is ready.', 'success')
    } catch (err) {
      const message = getErrorMessage(err, 'Unable to complete payment right now.')
      setError(message)
      addToast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="payment-form" onSubmit={submit}>
      <div className="payment-form-section">
        <label>
          Receipt Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
      </div>

      <div className="payment-form-section">
        <label>
          Card Details
          <div className="payment-card-element">
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        </label>
      </div>

      {error && <p className="error-banner">{error}</p>}

      <div className="payment-form-footer">
        <div className="payment-security-note">
          <ShieldCheck size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>Payments are processed securely by Stripe.</span>
        </div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="rounded-full"
          disabled={!stripe || submitting}
        >
          {submitting ? 'Processing payment...' : `Pay ${formatCurrency(booking.total_amount)}`}
        </Button>
      </div>
    </form>
  )
}

export default function PaymentCheckout() {
  const { id } = useParams()
  const { user } = useAuth()
  const [booking, setBooking] = useState(null)
  const [paymentConfig, setPaymentConfig] = useState(null)
  const [completedPayment, setCompletedPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [bookingData, config] = await Promise.all([
          bookingService.get(id),
          paymentService.getConfig()
        ])
        if (ignore) return
        setBooking(bookingData)
        setPaymentConfig(config)
      } catch (err) {
        if (ignore) return
        setError(getErrorMessage(err, 'Unable to load checkout details.'))
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadData()
    return () => {
      ignore = true
    }
  }, [id])

  const stripePromise = useMemo(() => {
    if (!paymentConfig?.stripe_enabled || !paymentConfig?.publishable_key) {
      return null
    }
    return loadStripe(paymentConfig.publishable_key)
  }, [paymentConfig?.publishable_key, paymentConfig?.stripe_enabled])

  const stats = booking
    ? [
        { value: formatCurrency(booking.total_amount), label: 'Total due' },
        { value: formatBookingStatusLabel(booking.booking_status), label: 'Booking status' },
        { value: booking.payment_status || 'pending', label: 'Payment status' }
      ]
    : []
  const bookingStatus = normalizeBookingStatus(booking?.booking_status)
  const paymentReady = canPayForBooking(booking)
  const statusClass = getBookingStatusClass(bookingStatus)
  const statusLabel = formatBookingStatusLabel(bookingStatus)

  let blockedState = null
  if (booking && !paymentReady && booking.payment_status !== 'completed') {
    if (bookingStatus === 'pending') {
      blockedState = {
        eyebrow: 'Awaiting approval',
        title: 'Payment opens after approval',
        message: 'Owners need to confirm the booking before checkout can begin.',
      }
    } else if (bookingStatus === 'completed') {
      blockedState = {
        eyebrow: 'Rental closed',
        title: 'This booking is already completed',
        message: 'Completed bookings can no longer open a new checkout session. Review your payment history for finished charges.',
      }
    } else if (bookingStatus === 'cancelled') {
      blockedState = {
        eyebrow: 'Booking cancelled',
        title: 'This booking was cancelled',
        message: 'Cancelled bookings cannot be paid. If you still need this rental, submit a new request from the marketplace.',
      }
    } else if (bookingStatus === 'rejected') {
      blockedState = {
        eyebrow: 'Request declined',
        title: 'This booking was not approved',
        message: 'Rejected bookings cannot proceed to payment. You can request different dates or browse similar equipment.',
      }
    }
  }

  return (
    <div className="container page-wrap">
      <DashboardShell title="Farmer Panel" subtitle="Payments" links={farmerDashboardLinks}>
        <PageHero
          eyebrow="Checkout"
          title="Complete your rental payment"
          subtitle="Confirm your booking with a secure card payment and keep the receipt ready for your records."
          className="portal-primary"
          stats={stats}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                to="/farmer/bookings"
              >
                <ArrowLeft size={16} strokeWidth={2.1} aria-hidden="true" />
                <span>Back to bookings</span>
              </Link>
              <Link
                className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'rounded-full')}
                to="/farmer/payments"
              >
                <ReceiptText size={16} strokeWidth={2.1} aria-hidden="true" />
                <span>Payment history</span>
              </Link>
            </div>
          }
        />

        {loading && (
          <section className="card payment-layout">
            <p className="subtitle">Loading checkout details...</p>
          </section>
        )}

        {!loading && error && (
          <Alert
            variant="destructive"
            className="mb-6 border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur"
          >
            <AlertDescription className="space-y-3">
              <span className="text-sm text-slate-900">{error}</span>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/farmer/bookings"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                >
                  Back to bookings
                </Link>
                <Link
                  to="/farmer/payments"
                  className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'rounded-full')}
                >
                  Open payment history
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!loading && !error && booking && completedPayment && (
          <section className="payment-layout">
            <Alert className="mb-6 border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
              <AlertDescription className="space-y-3">
                <span className="text-sm text-slate-900">
                  Your booking for {booking.equipment_name || 'this equipment'} is fully paid.
                </span>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/farmer/payments"
                    className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'rounded-full')}
                  >
                    View payment history
                  </Link>
                  <Link
                    to="/farmer/bookings"
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                  >
                    Return to bookings
                  </Link>
                </div>
              </AlertDescription>
            </Alert>
            <div className="card payment-summary-card">
              <h3>Receipt Summary</h3>
              <dl className="payment-receipt-grid">
                <div>
                  <dt>Equipment</dt>
                  <dd>{booking.equipment_name || 'Equipment booking'}</dd>
                </div>
                <div>
                  <dt>Amount</dt>
                  <dd>{formatCurrency(completedPayment.amount)}</dd>
                </div>
                <div>
                  <dt>Payment ID</dt>
                  <dd>{completedPayment.payment_intent_id}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{completedPayment.status}</dd>
                </div>
              </dl>
              {completedPayment.receipt_url && (
                <a
                  className={cn(buttonVariants({ variant: 'accent', size: 'sm' }), 'rounded-full')}
                  href={completedPayment.receipt_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Stripe receipt
                </a>
              )}
            </div>
          </section>
        )}

        {!loading && !error && booking && !completedPayment && (
          <>
            {booking.payment_status === 'completed' ? (
              <EmptyState
                eyebrow="Already paid"
                title="This booking is already paid"
                message="The payment was completed earlier. You can review the receipt and full history from your payment center."
                actions={[
                  { to: '/farmer/payments', label: 'Open payment history' },
                  { to: '/farmer/bookings', label: 'Back to bookings' }
                ]}
              />
            ) : blockedState ? (
              <EmptyState
                eyebrow={blockedState.eyebrow}
                title={blockedState.title}
                message={blockedState.message}
                actions={[
                  { to: '/farmer/bookings', label: 'Review bookings' }
                ]}
              />
            ) : !paymentConfig?.stripe_enabled || !stripePromise ? (
              <EmptyState
                eyebrow="Payments unavailable"
                title="Stripe checkout is turned off"
                message={paymentConfig?.message || 'Payments are unavailable right now. Please contact support or try again later.'}
                actions={[
                  { to: '/farmer/bookings', label: 'Back to bookings' },
                  { to: '/farmer/payments', label: 'Open payment history' }
                ]}
              />
            ) : (
              <section className="payment-layout">
                <div className="card payment-summary-card">
                  <div className="payment-summary-head">
                    <div>
                      <p className="page-hero-eyebrow">Booking Summary</p>
                      <h3>{booking.equipment_name || 'Equipment booking'}</h3>
                    </div>
                    <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
                  </div>
                  <dl className="payment-receipt-grid">
                    <div>
                      <dt>Owner</dt>
                      <dd>{booking.owner_name || 'Equipment owner'}</dd>
                    </div>
                    <div>
                      <dt>Rental dates</dt>
                      <dd>{booking.start_date} to {booking.end_date}</dd>
                    </div>
                    <div>
                      <dt>Total amount</dt>
                      <dd>{formatCurrency(booking.total_amount)}</dd>
                    </div>
                    <div>
                      <dt>Payout split</dt>
                      <dd>{formatCurrency(booking.owner_payout || 0)} owner / {formatCurrency(booking.admin_cut || 0)} platform</dd>
                    </div>
                  </dl>
                  <div className="payment-trust-list">
                    <div>
                      <CreditCard size={18} strokeWidth={2.1} aria-hidden="true" />
                      <span>Secure card checkout</span>
                    </div>
                    <div>
                      <ReceiptText size={18} strokeWidth={2.1} aria-hidden="true" />
                      <span>Email receipt delivery</span>
                    </div>
                    <div>
                      <ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />
                      <span>Booking status updates after confirmation</span>
                    </div>
                  </div>
                </div>

                <div className="card payment-checkout-card">
                  <h3>Card payment</h3>
                  <p className="subtitle">Use a test or live card based on your Stripe environment. Your receipt will be available right after confirmation.</p>
                  <Elements stripe={stripePromise}>
                    <CheckoutForm booking={booking} currentUser={user} onCompleted={setCompletedPayment} />
                  </Elements>
                </div>
              </section>
            )}
          </>
        )}
      </DashboardShell>
    </div>
  )
}
