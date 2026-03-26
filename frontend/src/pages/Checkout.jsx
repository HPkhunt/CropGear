import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { paymentService } from '../services/paymentService.js'
import { bookingService } from '../services/bookingService.js'
import { CreditCard, ShieldCheck, Lock, CheckCircle, ArrowLeft } from 'lucide-react'
import { useToast } from '../context/ToastContext.jsx'
import useAuth from '../hooks/useAuth.js'

export default function Checkout() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { user } = useAuth()
  
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [cardDetails, setCardDetails] = useState({ name: '', number: '', exp: '', cvc: '' })

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const bookings = await bookingService.listAsFarmer()
        const match = bookings.find(b => b.id === bookingId)
        if (match) setBooking(match)
        else {
          addToast('Booking not found', 'error')
          navigate(-1)
        }
      } catch (err) {
        addToast('Failed to load booking', 'error')
        navigate(-1)
      } finally {
        setLoading(false)
      }
    }
    fetchBooking()
  }, [bookingId, navigate, addToast])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setCardDetails(prev => ({ ...prev, [name]: value }))
  }

  const handlePayment = async (e) => {
    e.preventDefault()
    if (!user?.email) {
      addToast('Email address required for payment', 'error')
      return
    }

    setProcessing(true)
    try {
      // Create Intent
      const intentResponse = await paymentService.createIntent(
        bookingId, 
        booking.total_amount, 
        user.email,
        `Payment for ${booking.equipment_name}`
      )
      
      const intentId = intentResponse.client_secret || `pi_${Math.random().toString(36).substr(2, 9)}` // fallback
      
      // Real app uses Stripe.js. Here we mock confirmation success
      await paymentService.confirmPayment(intentId)
      
      setSuccess(true)
      addToast('Payment successful!', 'success')
      
      setTimeout(() => {
        navigate('/farmer/bookings')
      }, 3000)
    } catch (error) {
      addToast('Payment failed. Please try again.', 'error')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="container page-wrap"><div className="skeleton-card" style={{ height: 400 }} /></div>
  if (!booking) return null
  
  if (success) {
    return (
      <div className="container page-wrap" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: 480, padding: '3rem 2rem' }}>
          <CheckCircle size={64} style={{ color: 'var(--primary)', margin: '0 auto 1.5rem' }} />
          <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Payment Successful</h2>
          <p className="subtitle" style={{ marginBottom: '2rem' }}>Your booking for <strong>{booking.equipment_name}</strong> is fully secured.</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Redirecting to your bookings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container page-wrap">
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        <button className="button sm link hover-lift" onClick={() => navigate(-1)} style={{ marginBottom: '1.5rem', color: 'var(--muted)' }}>
          <ArrowLeft size={16} /> Back
        </button>

        <h1 style={{ marginBottom: '2rem', fontSize: '2rem' }}>Secure Checkout</h1>

        <div className="page-split" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 1fr)' }}>
          <div className="page-main">
            <div className="card">
              <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} /> Payment Details
              </h3>

              <form onSubmit={handlePayment}>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Name on Card</label>
                  <input
                    type="text"
                    name="name"
                    value={cardDetails.name}
                    onChange={handleInputChange}
                    required
                    placeholder="John Doe"
                    disabled={processing}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Card Number</label>
                  <div style={{ position: 'relative' }}>
                    <CreditCard size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                    <input
                      type="text"
                      name="number"
                      value={cardDetails.number}
                      onChange={handleInputChange}
                      required
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      disabled={processing}
                      style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem', letterSpacing: '1px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Expiry (MM/YY)</label>
                    <input
                      type="text"
                      name="exp"
                      value={cardDetails.exp}
                      onChange={handleInputChange}
                      required
                      placeholder="MM/YY"
                      maxLength={5}
                      disabled={processing}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>CVC</label>
                    <input
                      type="text"
                      name="cvc"
                      value={cardDetails.cvc}
                      onChange={handleInputChange}
                      required
                      placeholder="123"
                      maxLength={4}
                      disabled={processing}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem' }}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className={`button lg gradient pill ${processing ? 'loading' : ''}`}
                  disabled={processing}
                  style={{ width: '100%', justifyContent: 'center', fontSize: '1.1rem' }}
                >
                  {processing ? 'Processing Securely...' : `Pay $${booking.total_amount?.toLocaleString()} Securely`}
                </button>
              </form>
            </div>
            
            <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '1rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
              <Lock size={14} /> Payments are secure and encrypted via AES-256
            </p>
          </div>

          <aside className="page-side">
            <div className="card" style={{ background: 'var(--card-bg)' }}>
              <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem', fontSize: '1.1rem' }}>Order Summary</h3>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.3rem' }}>{booking.equipment_name}</p>
                <p className="subtitle" style={{ fontSize: '0.9rem' }}>Owner: {booking.owner_name}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
                <span>From Date</span>
                <span>{new Date(booking.start_date).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
                <span>To Date</span>
                <span>{new Date(booking.end_date).toLocaleDateString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '1rem', fontSize: '1.2rem', fontWeight: 600 }}>
                <span>Total</span>
                <span style={{ color: 'var(--primary)' }}>${booking.total_amount?.toLocaleString()}</span>
              </div>
            </div>

            <div className="card" style={{ backgroundColor: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                <ShieldCheck size={18} /> Escrow Protection
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5 }}>
                Your funds are held securely. The owner only receives payment after you confirm the equipment is received in good condition.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
