import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardShell from '../../components/DashboardShell.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import PageHero from '../../components/PageHero.jsx'
import PageSkeleton from '../../components/PageSkeleton.jsx'
import SmartImage from '../../components/SmartImage.jsx'
import ReviewCard from '../../components/reviews/ReviewCard.jsx'
import ReviewComposerModal from '../../components/reviews/ReviewComposerModal.jsx'
import ReviewSummaryPanel from '../../components/reviews/ReviewSummaryPanel.jsx'
import { bookingService } from '../../services/bookingService.js'
import { reviewService } from '../../services/reviewService.js'
import { getErrorMessage } from '../../utils/helpers.js'
import { farmerDashboardLinks } from '../../utils/dashboardLinks.js'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  buildReviewLookup,
  formatReviewStatusLabel,
  getAverageReviewRating,
  getPendingBookingsForReview,
  normalizeReviewStatus
} from '../../utils/reviews.js'

export default function MyReviews() {
  const [bookings, setBookings] = useState([])
  const [writtenReviews, setWrittenReviews] = useState([])
  const [receivedReviews, setReceivedReviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [selectedBooking, setSelectedBooking] = useState(null)

  const refresh = async () => {
    const [bookingRows, writtenResponse, receivedResponse] = await Promise.all([
      bookingService.myBookings(),
      reviewService.mine({ view: 'written', pageSize: 100 }),
      reviewService.mine({ view: 'received', pageSize: 100 })
    ])

    setBookings(Array.isArray(bookingRows) ? bookingRows : [])
    setWrittenReviews(
      Array.isArray(writtenResponse?.items)
        ? writtenResponse.items.filter((review) => review.review_type === 'equipment')
        : []
    )
    setReceivedReviews(
      Array.isArray(receivedResponse?.items)
        ? receivedResponse.items.filter((review) => review.review_type === 'user')
        : []
    )
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError('')
      try {
        await refresh()
      } catch (loadError) {
        setError(getErrorMessage(loadError, 'Unable to load your review center right now.'))
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const writtenLookup = useMemo(() => buildReviewLookup(writtenReviews), [writtenReviews])
  const pendingBookings = useMemo(
    () => getPendingBookingsForReview(bookings, writtenLookup, 'equipment'),
    [bookings, writtenLookup]
  )
  const approvedReceivedReviews = useMemo(
    () => receivedReviews.filter((review) => normalizeReviewStatus(review.status) === 'approved'),
    [receivedReviews]
  )
  const receivedBreakdown = useMemo(() => (
    approvedReceivedReviews.reduce((counts, review) => {
      const rating = String(review.rating || '')
      if (rating) {
        counts[rating] = (counts[rating] || 0) + 1
      }
      return counts
    }, {})
  ), [approvedReceivedReviews])
  const trustScore = useMemo(
    () => getAverageReviewRating(approvedReceivedReviews),
    [approvedReceivedReviews]
  )
  const awaitingModerationCount = useMemo(
    () => writtenReviews.filter((review) => normalizeReviewStatus(review.status) === 'pending').length,
    [writtenReviews]
  )

  const stats = [
    { value: pendingBookings.length, label: 'Needs your review' },
    { value: writtenReviews.length, label: 'Submitted reviews' },
    { value: trustScore ? trustScore.toFixed(1) : '--', label: 'Owner trust score' },
    { value: awaitingModerationCount, label: 'Awaiting moderation' }
  ]

  const handleReviewSubmitted = async () => {
    await refresh()
    setActionMessage('Review submitted. It will appear on the listing after moderation.')
  }

  if (loading) return <PageSkeleton variant="table" />

  return (
    <div className="container page-wrap">
      <DashboardShell title="Farmer Panel" subtitle="Review center" links={farmerDashboardLinks}>
        <PageHero
          eyebrow="Review Center"
          title="Capture the quality of every rental"
          subtitle="Leave verified equipment feedback after completed bookings and keep track of the reputation owners build around your account."
          className="portal-primary"
          stats={stats}
          aside={(
            <SmartImage
              src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=1280&auto=format&fit=crop"
              fallbackSrc="/fields.svg"
              alt="Rental feedback"
              className="page-hero-media"
            />
          )}
          actions={(
            <div className="button-row">
              <Link
                className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'rounded-full')}
                to="/farmer/bookings"
              >
                Open bookings
              </Link>
              <Link
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                to="/farmer/equipments"
              >
                Browse equipment
              </Link>
            </div>
          )}
        />

        <section className="page-split">
          <div className="page-main">
            {actionMessage && (
              <Alert className="mb-4 border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-slate-900">{actionMessage}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setActionMessage('')}
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert
                variant="destructive"
                className="mb-4 border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur"
              >
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-slate-900">{error}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setError('')}
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <section className="card review-task-board">
              <div className="review-section-head">
                <div>
                  <p className="review-section-eyebrow">Ready To Publish</p>
                  <h3>Completed bookings waiting for feedback</h3>
                </div>
                <span className="status-badge status-info">{pendingBookings.length} open</span>
              </div>

              {pendingBookings.length ? (
                <div className="review-task-grid">
                  {pendingBookings.map((booking) => (
                    <article key={booking.id} className="review-task-card">
                      <div className="review-task-card-copy">
                        <strong>{booking.equipment_name}</strong>
                        <span>{booking.start_date} to {booking.end_date}</span>
                        <p className="subtitle">
                          Share field performance, equipment condition, and owner communication while the details are still fresh.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        Write review
                      </Button>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  eyebrow="Queue is clear"
                  title="No completed rentals need feedback right now"
                  message="Once a booking is completed, it will appear here so you can leave verified rental feedback."
                  actions={[
                    { to: '/farmer/bookings', label: 'Open bookings' },
                    { to: '/farmer/equipments', label: 'Browse equipment' }
                  ]}
                />
              )}
            </section>

            <section className="card review-list-shell">
              <div className="review-section-head">
                <div>
                  <p className="review-section-eyebrow">Your Published Trail</p>
                  <h3>Written equipment reviews</h3>
                </div>
                <span className="subtitle">{writtenReviews.length} total</span>
              </div>

              {writtenReviews.length ? (
                <div className="review-list">
                  {writtenReviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      footer={(
                        <div className="button-row review-inline-actions">
                          <Link
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                            to={`/equipment/${review.equipment_id}`}
                          >
                            View listing
                          </Link>
                          <span className="subtitle">{formatReviewStatusLabel(review.status)}</span>
                        </div>
                      )}
                    />
                  ))}
                </div>
              ) : (
                <p className="subtitle">Your written equipment reviews will appear here after your first completed rental.</p>
              )}
            </section>
          </div>

          <aside className="page-side">
            <ReviewSummaryPanel
              title="How owners currently rate you"
              subtitle="Only approved renter feedback contributes to your reputation snapshot."
              averageRating={trustScore}
              totalReviews={approvedReceivedReviews.length}
              ratingBreakdown={receivedBreakdown}
              highlights={[
                { label: 'Approved owner reviews', value: approvedReceivedReviews.length },
                { label: 'Pending writebacks', value: pendingBookings.length },
                { label: 'Awaiting moderation', value: awaitingModerationCount }
              ]}
            />

            <section className="card review-list-shell">
              <div className="review-section-head">
                <div>
                  <p className="review-section-eyebrow">Reputation Feed</p>
                  <h3>Reviews about you</h3>
                </div>
                <span className="subtitle">{receivedReviews.length} total</span>
              </div>

              {receivedReviews.length ? (
                <div className="review-list">
                  {receivedReviews.slice(0, 4).map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              ) : (
                <p className="subtitle">Owner feedback about your rentals will appear here once the first booking is completed and reviewed.</p>
              )}
            </section>

            <section className="card">
              <h3>Best review signals</h3>
              <ul className="feature-list">
                <li><span>Mention field conditions, crop stage, and the actual workload the machine handled.</span></li>
                <li><span>Call out maintenance condition and whether photos matched the delivered equipment.</span></li>
                <li><span>Leave feedback quickly so owners and future renters trust the context.</span></li>
              </ul>
            </section>
          </aside>
        </section>
      </DashboardShell>

      <ReviewComposerModal
        isOpen={Boolean(selectedBooking)}
        booking={selectedBooking}
        reviewType="equipment"
        subjectName={selectedBooking?.equipment_name || ''}
        onClose={() => setSelectedBooking(null)}
        onSubmitted={handleReviewSubmitted}
      />
    </div>
  )
}
