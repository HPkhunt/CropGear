import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Flag, MessageSquareText, ShieldAlert } from 'lucide-react'
import DashboardShell from '../../components/DashboardShell.jsx'
import PageHero from '../../components/PageHero.jsx'
import Loader from '../../components/Loader.jsx'
import SmartImage from '../../components/SmartImage.jsx'
import useToast from '@/hooks/useToast'
import ReviewCard from '../../components/reviews/ReviewCard.jsx'
import ReviewTextActionModal from '../../components/reviews/ReviewTextActionModal.jsx'
import { reviewService } from '../../services/reviewService.js'
import { getErrorMessage } from '../../utils/helpers.js'
import { adminDashboardLinks } from '../../utils/dashboardLinks.js'
import {
  getAverageReviewRating,
  normalizeReviewStatus
} from '../../utils/reviews.js'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'approved', label: 'Approved' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All statuses' }
]

const MODERATION_COPY = {
  approve: {
    title: 'Approve review',
    description: 'Approve this review to make it visible in listing and reputation surfaces.',
    submitLabel: 'Approve review',
    placeholder: 'Optional moderation note explaining the approval decision.'
  },
  reject: {
    title: 'Reject review',
    description: 'Reject this review when it violates platform policy or cannot be verified.',
    submitLabel: 'Reject review',
    placeholder: 'Add an optional rejection reason for audit context.'
  },
  hide: {
    title: 'Hide review',
    description: 'Hide this review from public surfaces without permanently deleting the record.',
    submitLabel: 'Hide review',
    placeholder: 'Add an optional note about why the review is being hidden.'
  },
  restore: {
    title: 'Restore review',
    description: 'Restore this review to the published state if moderation concerns are resolved.',
    submitLabel: 'Restore review',
    placeholder: 'Add an optional restoration note.'
  }
}

function getModerationActions(review) {
  const status = normalizeReviewStatus(review?.status)

  if (status === 'approved') {
    return [{ action: 'hide', label: 'Hide', className: 'button sm soil' }]
  }

  if (status === 'hidden' || status === 'rejected') {
    return [{ action: 'restore', label: 'Restore', className: 'button sm secondary' }]
  }

  return [
    { action: 'approve', label: 'Approve', className: 'button sm secondary' },
    { action: 'reject', label: 'Reject', className: 'button sm soil' },
    { action: 'hide', label: 'Hide', className: 'button sm outline' }
  ]
}

export default function AdminReviews() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [q, setQ] = useState('')
  const [moderationTarget, setModerationTarget] = useState(null)
  const { addToast } = useToast()

  const refresh = useCallback(async (filter = statusFilter) => {
    const response = await reviewService.moderationQueue({ statusFilter: filter, pageSize: 100 })
    setItems(Array.isArray(response?.items) ? response.items : [])
  }, [statusFilter])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await refresh(statusFilter)
      } catch (error) {
        addToast(getErrorMessage(error, 'Unable to load the review moderation queue.'), 'error')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [addToast, refresh, statusFilter])

  const visible = useMemo(() => {
    const search = q.trim().toLowerCase()
    if (!search) return items

    return items.filter((review) => {
      const fields = [
        review?.reviewer_name,
        review?.recipient_name,
        review?.equipment_name,
        review?.title,
        review?.comment,
        review?.status
      ]

      return fields.some((value) => String(value || '').toLowerCase().includes(search))
    })
  }, [items, q])

  const statusCounts = useMemo(() => {
    return items.reduce((counts, review) => {
      const status = normalizeReviewStatus(review?.status)
      counts[status] = (counts[status] || 0) + 1
      return counts
    }, {})
  }, [items])

  const flaggedOrDisputedCount = useMemo(
    () => items.filter((review) => ['flagged', 'disputed'].includes(normalizeReviewStatus(review?.status))).length,
    [items]
  )
  const averageRating = useMemo(() => getAverageReviewRating(items), [items])
  const stats = [
    { value: items.length, label: 'Queue size' },
    { value: visible.length, label: 'Visible reviews' },
    { value: flaggedOrDisputedCount, label: 'Needs attention' },
    { value: averageRating ? averageRating.toFixed(1) : '--', label: 'Avg queue rating' }
  ]
  const handleModerationSubmit = async (reason) => {
    const { review, action } = moderationTarget
    await reviewService.moderate(review.id, { action, reason })
    await refresh()
    addToast(`Review for ${review.equipment_name || 'the listing'} updated with ${action}.`, 'success')
  }

  if (loading) return <Loader />

  return (
    <div className="container page-wrap">
      <DashboardShell title="Admin Control" subtitle="Review governance" links={adminDashboardLinks}>
        <PageHero
          eyebrow="Review Moderation"
          title="Moderate trust signals across the marketplace"
          subtitle="Review flagged content, resolve disputes, and approve verified rental feedback without leaving the admin workspace."
          className="portal-admin"
          stats={stats}
          aside={(
            <SmartImage
              src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=1280&auto=format&fit=crop"
              fallbackSrc="/hero.svg"
              alt="Review moderation"
              className="page-hero-media"
            />
          )}
        />

        <section className="page-split">
          <div className="page-main">
            <section className="card filter-shell">
              <div className="filter-bar">
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Search by reviewer, listing, title, or comment"
                />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="filter-meta">
                <span>{visible.length} reviews visible</span>
              </div>
            </section>

            <section className="card review-list-shell">


              <div className="review-section-head">
                <div>
                  <p className="review-section-eyebrow">Moderation Queue</p>
                  <h3>Reviews waiting for moderation decisions</h3>
                </div>
                <span className="subtitle">{statusFilter === 'all' ? 'All statuses' : STATUS_OPTIONS.find((item) => item.value === statusFilter)?.label}</span>
              </div>

              {visible.length ? (
                <div className="review-list">
                  {visible.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      showModeration
                      footer={(
                        <div className="button-row review-inline-actions">
                          {getModerationActions(review).map((action) => (
                            <button
                              key={`${review.id}-${action.action}`}
                              type="button"
                              className={action.className}
                              onClick={() => {
                                setModerationTarget({ review, action: action.action })
                              }}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    />
                  ))}
                </div>
              ) : (
                <p className="subtitle">No reviews match the current filter.</p>
              )}
            </section>
          </div>

          <aside className="page-side">
            <section className="card">
              <h3>Queue Snapshot</h3>
              <div className="panel-list-premium">
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">
                    <MessageSquareText size={18} strokeWidth={2.1} aria-hidden="true" />
                  </div>
                  <div className="stat-info-wrap">
                    <strong>{items.length}</strong>
                    <span>Total loaded reviews</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">
                    <Flag size={18} strokeWidth={2.1} aria-hidden="true" />
                  </div>
                  <div className="stat-info-wrap">
                    <strong>{statusCounts.flagged || 0}</strong>
                    <span>Flagged reviews</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">
                    <ShieldAlert size={18} strokeWidth={2.1} aria-hidden="true" />
                  </div>
                  <div className="stat-info-wrap">
                    <strong>{statusCounts.disputed || 0}</strong>
                    <span>Open disputes</span>
                  </div>
                </div>
              </div>
              <p className="panel-note">Moderation actions immediately update public listing and reputation surfaces.</p>
            </section>

            <section className="card">
              <h3>Decision Checklist</h3>
              <ul className="feature-list">
                <li><span>Approve verified rental-backed feedback that matches platform policy.</span></li>
                <li><span>Reject or hide reviews with abuse, unverifiable claims, or policy violations.</span></li>
                <li><span>Use restore after flags or disputes are resolved and the review is safe to publish again.</span></li>
              </ul>
            </section>
          </aside>
        </section>
      </DashboardShell>

      <ReviewTextActionModal
        isOpen={Boolean(moderationTarget)}
        title={MODERATION_COPY[moderationTarget?.action || 'approve']?.title || 'Update review'}
        description={MODERATION_COPY[moderationTarget?.action || 'approve']?.description || ''}
        label="Moderation note"
        placeholder={MODERATION_COPY[moderationTarget?.action || 'approve']?.placeholder || ''}
        submitLabel={MODERATION_COPY[moderationTarget?.action || 'approve']?.submitLabel || 'Save update'}
        initialValue=""
        minLength={0}
        onClose={() => setModerationTarget(null)}
        onSubmit={handleModerationSubmit}
      />
    </div>
  )
}
