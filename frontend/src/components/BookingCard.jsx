import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useToast from '@/hooks/useToast'
import useAuth from '../hooks/useAuth.js'
import { bookingService } from '../services/bookingService.js'
import { paymentService } from '../services/paymentService.js'
import { getErrorMessage } from '../utils/helpers.js'
import {
  canCancelBooking,
  canPayForBooking,
  formatBookingStatusLabel,
  getBookingOperationsPath,
  normalizeBookingStatus,
  normalizePaymentStatus
} from '../utils/bookings.js'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function formatBookingDate(value) {
  if (!value) return 'TBD'

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match) {
    const [, year, month, day] = match
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString()
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'TBD' : parsed.toLocaleDateString()
}

function getBookingStatusCopy(booking) {
  const status = normalizeBookingStatus(booking?.booking_status)
  const paymentStatus = normalizePaymentStatus(booking?.payment_status)

  if (status === 'pending') {
    return 'Waiting for the owner to review this request.'
  }
  if (status === 'confirmed') {
    return paymentStatus === 'completed'
      ? 'Approved and paid. You are ready for the rental window.'
      : 'Approved. Complete payment before the rental starts.'
  }
  if (status === 'in_progress') {
    return 'This rental is currently active.'
  }
  if (status === 'completed') {
    return booking?.completed_at
      ? `Completed on ${formatBookingDate(booking.completed_at)}.`
      : 'This rental has been completed.'
  }
  if (status === 'cancelled') {
    return 'This booking was cancelled and will not proceed.'
  }
  if (status === 'rejected') {
    return 'This request was declined by the owner.'
  }
  return 'Booking status will update here as the rental progresses.'
}

export default function BookingCard({ booking, onUpdated }) {
  const auth = useAuth() || {}
  const { user } = auth
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [paymentConfig, setPaymentConfig] = useState(null)
  const [isCancelling, setIsCancelling] = useState(false)

  const status = normalizeBookingStatus(booking.booking_status)
  const paymentStatus = normalizePaymentStatus(booking.payment_status)
  const statusLabel = formatBookingStatusLabel(status)
  const statusCopy = getBookingStatusCopy(booking)
  const startDate = formatBookingDate(booking.start_date)
  const endDate = formatBookingDate(booking.end_date)
  const showPaymentAction = canPayForBooking(booking)
  const showCancelAction = canCancelBooking(booking)
  const statusVariant =
    status === 'completed'
      ? 'success'
      : status === 'cancelled' || status === 'rejected'
        ? 'error'
        : status === 'pending'
          ? 'warning'
          : 'info'

  useEffect(() => {
    let ignore = false

    if (!showPaymentAction) {
      setPaymentConfig(null)
      return () => {
        ignore = true
      }
    }

    paymentService.getConfig()
      .then((data) => {
        if (!ignore) {
          setPaymentConfig(data)
        }
      })
      .catch(() => {
        if (!ignore) {
          setPaymentConfig({ stripe_enabled: false, message: 'Unable to verify payment availability right now.' })
        }
      })

    return () => {
      ignore = true
    }
  }, [showPaymentAction])

  const handlePayment = () => {
    if (paymentConfig && !paymentConfig.stripe_enabled) {
      addToast(paymentConfig.message || 'Payments are unavailable right now.', 'info')
      return
    }
    navigate(`/farmer/bookings/${booking.id}/pay`)
  }

  const handleCancel = async () => {
    if (isCancelling) return

    setIsCancelling(true)
    try {
      await bookingService.cancel(booking.id)
      addToast('Booking cancelled successfully.', 'success')
      await onUpdated?.()
    } catch (error) {
      addToast(getErrorMessage(error, 'Unable to cancel booking.'), 'error')
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <Card className="rounded-[28px] border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
      <CardHeader className="space-y-4 p-5 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-950">{booking.equipment_name || 'Equipment Booking'}</h3>
            <p className="text-sm text-slate-600">{booking.owner_name ? `Owner: ${booking.owner_name}` : 'Owner details unavailable'}</p>
          </div>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">From</span>
            <strong className="mt-2 block text-sm text-slate-950">{startDate}</strong>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">To</span>
            <strong className="mt-2 block text-sm text-slate-950">{endDate}</strong>
          </div>
        </div>

        <div className="rounded-2xl border border-primary-100 bg-primary-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">Booking total</p>
          <div className="mt-2 text-2xl font-semibold text-slate-950">${Number(booking.total_amount || 0).toLocaleString()}</div>
        </div>

        <p className="text-sm leading-6 text-slate-600">{statusCopy}</p>

        <div className="flex flex-wrap gap-3">
          <Link className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')} to={getBookingOperationsPath(booking.id, user?.role)}>
            Open tracking and tickets
          </Link>
        </div>

        {paymentStatus === 'completed' ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-green-100 bg-green-50/80 p-4">
            <Badge variant="success">paid</Badge>
            <Link className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')} to="/farmer/payments">
              View receipt history
            </Link>
          </div>
        ) : null}

        {(showPaymentAction || showCancelAction) ? (
          <div className="flex flex-wrap gap-3">
            {showPaymentAction ? (
              <Button
                variant="default"
                size="sm"
                className="rounded-full"
                onClick={handlePayment}
                disabled={paymentConfig ? !paymentConfig.stripe_enabled : true}
              >
                {!paymentConfig ? 'Checking payments...' : paymentConfig.stripe_enabled ? 'Pay now' : 'Payments unavailable'}
              </Button>
            ) : null}
            {showCancelAction ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                type="button"
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel booking'}
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
