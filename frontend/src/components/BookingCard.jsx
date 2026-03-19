import React, { useState } from 'react'
import { paymentService } from '../services/paymentService.js'
import { useToast } from '../context/ToastContext.jsx'
import useAuth from '../hooks/useAuth.js'

export default function BookingCard({ booking }) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [paying, setPaying] = useState(false)
  
  const status = (booking.booking_status || 'pending').toLowerCase()
  const statusClass = status === 'confirmed' ? 'status-success' : status === 'rejected' || status === 'cancelled' ? 'status-error' : 'status-pending'

  const startDate = booking.start_date ? new Date(booking.start_date).toLocaleDateString() : 'TBD'
  const endDate = booking.end_date ? new Date(booking.end_date).toLocaleDateString() : 'TBD'

  const handlePayment = async () => {
    if (!user?.email) {
      addToast('Email address required for payment', 'error')
      return
    }

    setPaying(true)
    try {
      const intent = await paymentService.createIntent(booking.id, booking.total_amount, user.email)
      // In a real app, this would redirect to Stripe or another payment processor
      // For demo purposes, we'll simulate a successful payment
      addToast(`Payment of $${booking.total_amount} processed successfully!`, 'success')
    } catch (error) {
      addToast('Payment failed. Please try again.', 'error')
    } finally {
      setPaying(false)
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
      
      {status === 'confirmed' && (
        <button 
          className="button sm gradient" 
          onClick={handlePayment}
          disabled={paying}
          style={{ marginTop: '12px', width: '100%' }}
        >
          {paying ? 'Processing...' : `Pay $${Number(booking.total_amount || 0).toLocaleString()}`}
        </button>
      )}
    </article>
  )
}
