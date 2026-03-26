import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext.jsx'
import useAuth from '../hooks/useAuth.js'
import { bookingService } from '../services/bookingService.js'
import { CreditCard, XCircle, CheckCircle, Star } from 'lucide-react'

export default function BookingCard({ booking, onStatusChange }) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [acting, setActing] = useState(false)

  const [localStatus, setLocalStatus] = useState(booking.booking_status || 'pending')
  const status = localStatus.toLowerCase()
  const statusClass = status === 'confirmed' ? 'status-success' : status === 'rejected' || status === 'cancelled' ? 'status-error' : status === 'completed' ? 'status-info' : 'status-pending'

  const startDate = booking.start_date ? new Date(booking.start_date).toLocaleDateString() : 'TBD'
  const endDate = booking.end_date ? new Date(booking.end_date).toLocaleDateString() : 'TBD'

  const role = user?.role

  const handlePayment = () => {
    navigate(`/checkout/${booking.id}`)
  }

  const handleCancel = async () => {
    setActing(true)
    try {
      await bookingService.cancel(booking.id)
      setLocalStatus('cancelled')
      addToast('Booking cancelled successfully.', 'success')
      if (onStatusChange) onStatusChange(booking.id, 'cancelled')
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to cancel booking.'
      addToast(msg, 'error')
    } finally {
      setActing(false)
    }
  }

  const handleComplete = async () => {
    setActing(true)
    try {
      await bookingService.complete(booking.id)
      setLocalStatus('completed')
      addToast('Booking marked as completed!', 'success')
      if (onStatusChange) onStatusChange(booking.id, 'completed')
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to complete booking.'
      addToast(msg, 'error')
    } finally {
      setActing(false)
    }
  }

  return (
    <article className="card booking-card">
      <header>
        <h3>{booking.equipment_name || 'Equipment Booking'}</h3>
        <span className={`status-badge ${statusClass}`}>{status}</span>
      </header>

      <p className="subtitle">{booking.owner_name ? `Owner: ${booking.owner_name}` : 'Owner details unavailable'}</p>

      <div className="booking-dates">
        <div>
          <small>From</small>
          <strong>{startDate}</strong>
        </div>
        <div>
          <small>To</small>
          <strong>{endDate}</strong>
        </div>
      </div>

      <div className="booking-total">${Number(booking.total_amount || 0).toLocaleString()}</div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
        {status === 'confirmed' && (
          <button
            className="button sm gradient"
            onClick={handlePayment}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <CreditCard size={14} /> Pay ${Number(booking.total_amount || 0).toLocaleString()}
          </button>
        )}

        {status === 'confirmed' && role !== 'farmer' && (
          <button
            className="button sm accent"
            onClick={handleComplete}
            disabled={acting}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <CheckCircle size={14} /> Complete
          </button>
        )}

        {(status === 'pending' || status === 'confirmed') && (
          <button
            className="button sm outline"
            onClick={handleCancel}
            disabled={acting}
            style={{ flex: 1, justifyContent: 'center', color: 'var(--error, #ef4444)', borderColor: 'var(--error, #ef4444)' }}
          >
            <XCircle size={14} /> Cancel
          </button>
        )}

        {status === 'completed' && (
          <button
            className="button sm secondary"
            onClick={() => navigate(`/review/${booking.id}`)}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Star size={14} /> Write Review
          </button>
        )}
      </div>
    </article>
  )
}
