import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../../components/PageHero.jsx'
import DashboardShell from '../../components/DashboardShell.jsx'
import Loader from '../../components/Loader.jsx'
import { reviewService } from '../../services/reviewService.js'
import { useToast } from '../../context/ToastContext.jsx'
import { MessageSquareOff, User, Flag, ShieldAlert, CheckCircle, SearchX } from 'lucide-react'

export default function ReviewModeration() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('flagged')
  const { addToast } = useToast()

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const data = await reviewService.moderationQueue(
        activeTab === 'all' ? undefined : activeTab, 1, 50
      )
      setReviews(data?.items || data?.reviews || [])
    } catch {
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [activeTab])

  const handleAction = async (reviewId, action) => {
    try {
      if (action === 'approve') await reviewService.moderateReview(reviewId, 'approved')
      if (action === 'hide') await reviewService.moderateReview(reviewId, 'hidden')
      
      addToast(`Review marked as ${action}`, 'success')
      fetchReviews()
    } catch (err) {
      addToast('Failed to update review status', 'error')
    }
  }

  const sidebarLinks = [
    { to: '/admin/dashboard', label: 'Overview' },
    { to: '/admin/verify-owners', label: 'Verifications' },
    { to: '/admin/equipment', label: 'Equipment' },
    { to: '/admin/reviews', label: 'Review Moderation' },
    { to: '/admin/reports', label: 'Reports' },
  ]

  return (
    <div className="container page-wrap">
      <DashboardShell title="Admin Panel" subtitle="Moderation tools" links={sidebarLinks}>
        <PageHero
          eyebrow="Trust & Safety"
          title="Review Moderation Queue"
          subtitle="Manage flagged reviews, resolve disputes, and maintain platform quality standards."
          className="portal-primary"
        />

        <div className="status-tabs" style={{ marginTop: '2rem' }}>
          {['all', 'flagged', 'hidden', 'approved'].map(tab => (
            <button
              key={tab}
              className={`status-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              style={{ textTransform: 'capitalize' }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="page-main">
          {loading ? <Loader /> : reviews.length === 0 ? (
            <div className="card empty-search-state" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
              <div className="empty-icon"><SearchX size={48} style={{ color: 'var(--muted)' }} /></div>
              <h3>No reviews found</h3>
              <p className="subtitle" style={{ margin: '0.5rem 0' }}>There are no {activeTab === 'all' ? '' : activeTab} reviews requiring attention right now.</p>
            </div>
          ) : (
            <div className="feature-grid">
              {reviews.map(review => (
                <div key={review.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <span className="status-badge status-pending" style={{ textTransform: 'capitalize' }}>{review.status || 'Flagged'}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '0.5rem', fontWeight: 600 }}>
                    <User size={16} color="var(--primary)" /> {review.reviewer_name || 'User'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                    <Flag size={14} /> Equipment: {review.equipment_name || 'N/A'}
                  </div>

                  <p style={{ fontStyle: 'italic', background: 'var(--card-bg)', padding: '12px', borderRadius: '8px', marginBottom: '1.5rem', flexGrow: 1, border: '1px solid var(--border)' }}>
                    "{review.comment}"
                  </p>

                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <button 
                      className="button sm gradient" 
                      onClick={() => handleAction(review.id, 'approve')}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button 
                      className="button sm outline" 
                      onClick={() => handleAction(review.id, 'hide')}
                      style={{ flex: 1, justifyContent: 'center', borderColor: 'var(--error)', color: 'var(--error)' }}
                    >
                      <MessageSquareOff size={14} /> Hide
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardShell>
    </div>
  )
}
