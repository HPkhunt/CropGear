import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero.jsx'
import Loader from '../components/Loader.jsx'
import { paymentService } from '../services/paymentService.js'
import { CreditCard, Calendar, Receipt, SearchX, CheckCircle, Clock } from 'lucide-react'

export default function PaymentHistory() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await paymentService.history()
        setPayments(data || [])
      } catch (err) {
        console.error('Failed to fetch payment history:', err)
        setPayments([])
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  if (loading) return <Loader />

  const totalSpent = payments.filter(p => p.status === 'succeeded').reduce((sum, p) => sum + (p.amount || 0), 0)

  return (
    <div className="container page-wrap">
      <PageHero
        eyebrow="Billing"
        title="Payment History"
        subtitle="View your past transactions, receipts, and payment statuses."
        className="portal-primary"
      />

      <section className="page-split" style={{ marginTop: '2rem' }}>
        <div className="page-main">
          <div className="card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
              <Receipt size={20} /> Transaction Ledger
            </h3>

            {payments.length === 0 ? (
              <div className="empty-search-state" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                <div className="empty-icon"><SearchX size={48} style={{ color: 'var(--muted)' }} /></div>
                <h3>No payments found</h3>
                <p className="subtitle" style={{ margin: '0.5rem 0 1.5rem' }}>You haven't made any payments yet. Book equipment to see your transactions.</p>
                <Link to="/browse-equipment" className="button primary sm pill">Book Equipment</Link>
              </div>
            ) : (
              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--muted)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Amount</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Transaction ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(payment => (
                      <tr key={payment.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '16px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} style={{ color: 'var(--muted)' }} />
                            {new Date(payment.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td style={{ padding: '16px', fontWeight: 600 }}>
                          ${(payment.amount || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span className={`status-badge ${payment.status === 'succeeded' ? 'status-success' : 'status-pending'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {payment.status === 'succeeded' ? <CheckCircle size={12} /> : <Clock size={12} />}
                            {payment.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px', fontFamily: 'monospace', color: 'var(--muted)', fontSize: '0.9em' }}>
                          {payment.stripe_payment_intent_id || payment.id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <aside className="page-side">
          <div className="card">
            <h3>Billing Insights</h3>
            <div className="panel-list-premium">
              <div className="insight-stat-row">
                <div className="stat-icon-wrap"><CreditCard size={18} /></div>
                <div className="stat-info-wrap">
                  <strong>${totalSpent.toLocaleString()}</strong>
                  <span>Total Spent</span>
                </div>
              </div>
              <div className="insight-stat-row">
                <div className="stat-icon-wrap"><Receipt size={18} /></div>
                <div className="stat-info-wrap">
                  <strong>{payments.length}</strong>
                  <span>Total Transactions</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="card">
            <h3>Need Help?</h3>
            <p className="subtitle" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
              If you have questions about a specific charge or need a detailed tax invoice, please contact support.
            </p>
            <Link to="/contact" className="button sm outline pill" style={{ width: '100%', justifyContent: 'center' }}>
              Contact Support
            </Link>
          </div>
        </aside>
      </section>
    </div>
  )
}
