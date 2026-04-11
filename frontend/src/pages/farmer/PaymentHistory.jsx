import React, { useEffect, useMemo, useState } from 'react'
import { CreditCard, ReceiptText } from 'lucide-react'
import { Link } from 'react-router-dom'
import DashboardShell from '../../components/DashboardShell.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import PageHero from '../../components/PageHero.jsx'
import { paymentService } from '../../services/paymentService.js'
import { formatCurrency, getErrorMessage } from '../../utils/helpers.js'
import { farmerDashboardLinks } from '../../utils/dashboardLinks.js'

export default function PaymentHistory() {
  const [payments, setPayments] = useState([])
  const [paymentConfig, setPaymentConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [history, config] = await Promise.all([
          paymentService.history(),
          paymentService.getConfig()
        ])
        if (ignore) return
        setPayments(Array.isArray(history?.payments) ? history.payments : [])
        setPaymentConfig(config)
      } catch (err) {
        if (ignore) return
        setError(getErrorMessage(err, 'Unable to load payment history right now.'))
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
  }, [])

  const stats = useMemo(() => {
    const completed = payments.filter((item) => item.status === 'completed')
    const pending = payments.filter((item) => item.status === 'pending')
    const totalAmount = completed.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    return [
      { value: payments.length, label: 'Payments tracked' },
      { value: completed.length, label: 'Completed' },
      { value: pending.length, label: 'Pending' },
      { value: formatCurrency(totalAmount), label: 'Completed value' }
    ]
  }, [payments])

  return (
    <div className="container page-wrap">
      <DashboardShell title="Farmer Panel" subtitle="Payments" links={farmerDashboardLinks}>
        <PageHero
          eyebrow="Payment History"
          title="Review completed and pending charges"
          subtitle="Keep receipts close, trace booking spend, and monitor whether checkout is currently available."
          className="portal-primary"
          stats={stats}
          actions={
            <div className="button-row">
              <Link className="button outline" to="/farmer/bookings">Open bookings</Link>
              <Link className="button secondary" to="/farmer/equipments">Browse equipment</Link>
            </div>
          }
        />

        {!loading && paymentConfig && !paymentConfig.stripe_enabled && (
          <section className="card payment-banner-card">
            <h3>Payments are currently unavailable</h3>
            <p className="subtitle">{paymentConfig.message || 'Stripe checkout is disabled right now.'}</p>
          </section>
        )}

        {loading && (
          <section className="card">
            <p className="subtitle">Loading payment history...</p>
          </section>
        )}

        {!loading && error && (
          <section className="card">
            <p className="error-banner">{error}</p>
          </section>
        )}

        {!loading && !error && !payments.length && (
          <EmptyState
            eyebrow="No payments yet"
            title="Your payment history is empty"
            message="Once you complete a booking checkout, receipts and payment statuses will appear here."
            tips={[
              'Confirmed and active bookings can be paid from the booking list.',
              'Completed payments will include receipt links when Stripe provides them.',
              'Pending payments stay visible until they succeed or fail.'
            ]}
            actions={[
              { to: '/farmer/bookings', label: 'Review bookings', className: 'button gradient' },
              { to: '/farmer/equipments', label: 'Browse equipment', className: 'button outline' }
            ]}
          />
        )}

        {!loading && !error && payments.length > 0 && (
          <section className="payment-layout payment-layout-single">
            <div className="card">
              <div className="payment-table-head">
                <div>
                  <h3>Payment ledger</h3>
                  <p className="subtitle">Every payment is tied back to its booking so you can audit spend quickly.</p>
                </div>
                <div className="payment-table-icons">
                  <CreditCard size={18} strokeWidth={2.1} aria-hidden="true" />
                  <ReceiptText size={18} strokeWidth={2.1} aria-hidden="true" />
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Equipment</th>
                      <th>Booking</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Completed</th>
                      <th>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => {
                      const status = (payment.status || 'pending').toLowerCase()
                      const statusClass = status === 'completed'
                        ? 'status-success'
                        : status === 'failed' || status === 'refunded'
                          ? 'status-error'
                          : 'status-pending'

                      return (
                        <tr key={payment.payment_intent_id}>
                          <td>
                            <strong>{payment.equipment_name || 'Equipment rental'}</strong>
                            <div className="subtitle">{payment.owner_name || 'Owner not listed'}</div>
                          </td>
                          <td>
                            <Link className="payment-table-link" to={`/farmer/bookings/${payment.booking_id}/pay`}>
                              {payment.booking_id}
                            </Link>
                          </td>
                          <td>{formatCurrency(payment.amount)}</td>
                          <td><span className={`status-badge ${statusClass}`}>{status}</span></td>
                          <td>{payment.completed_at ? new Date(payment.completed_at).toLocaleString() : '—'}</td>
                          <td>
                            {payment.receipt_url ? (
                              <a href={payment.receipt_url} target="_blank" rel="noreferrer" className="button sm accent">
                                Receipt
                              </a>
                            ) : (
                              <span className="subtitle">Pending</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </DashboardShell>
    </div>
  )
}
