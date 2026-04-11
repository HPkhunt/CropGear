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
import ReviewTextActionModal from '../../components/reviews/ReviewTextActionModal.jsx'
import { bookingService } from '../../services/bookingService.js'
import { reviewService } from '../../services/reviewService.js'
import { getErrorMessage } from '../../utils/helpers.js'
import { ownerDashboardLinks } from '../../utils/dashboardLinks.js'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  buildReviewLookup,
  countReviewsNeedingResponse,
  getEmptyOwnerAnalytics,
  getPendingBookingsForReview,
  normalizeReviewStatus
} from '../../utils/reviews.js'

export default function OwnerReviews() {
  const [bookings, setBookings] = useState([])
  const [receivedReviews, setReceivedReviews] = useState([])
  const [writtenReviews, setWrittenReviews] = useState([])
  const [analytics, setAnalytics] = useState(getEmptyOwnerAnalytics())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [responseTarget, setResponseTarget] = useState(null)

  const refresh = async () => {
    const [bookingRows, receivedResponse, writtenResponse, analyticsResponse] = await Promise.all([
      bookingService.requests(),
      reviewService.mine({ view: 'received', pageSize: 100 }),
      reviewService.mine({ view: 'written', pageSize: 100 }),
      reviewService.ownerAnalytics()
    ])

    setBookings(Array.isArray(bookingRows) ? bookingRows : [])
    setReceivedReviews(
      Array.isArray(receivedResponse?.items)
        ? receivedResponse.items.filter((review) => review.review_type === 'equipment')
        : []
    )
    setWrittenReviews(
      Array.isArray(writtenResponse?.items)
        ? writtenResponse.items.filter((review) => review.review_type === 'user')
        : []
    )
    setAnalytics({ ...getEmptyOwnerAnalytics(), ...(analyticsResponse || {}) })
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError('')
      try {
        await refresh()
      } catch (loadError) {
        setError(getErrorMessage(loadError, 'Unable to load owner reviews right now.'))
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const writtenLookup = useMemo(() => buildReviewLookup(writtenReviews), [writtenReviews])
  const pendingRenterReviews = useMemo(
    () => getPendingBookingsForReview(bookings, writtenLookup, 'user'),
    [bookings, writtenLookup]
  )
  const responseQueueCount = useMemo(
    () => countReviewsNeedingResponse(receivedReviews),
    [receivedReviews]
  )
  const topPerformers = useMemo(
    () => (Array.isArray(analytics?.equipment_performance) ? analytics.equipment_performance.slice(0, 4) : []),
    [analytics]
  )

  const stats = [
    { value: analytics?.average_rating ? Number(analytics.average_rating).toFixed(1) : '--', label: 'Average listing rating' },
    { value: analytics?.total_reviews || 0, label: 'Published reviews' },
    { value: responseQueueCount, label: 'Need a response' },
    { value: pendingRenterReviews.length, label: 'Renter feedback to write' }
  ]

  const handleReviewSubmitted = async () => {
    await refresh()
    setActionMessage('Renter feedback submitted. It will become visible after moderation.')
  }

  const handleResponseSubmit = async (message) => {
    await reviewService.respond(responseTarget.id, message)
    await refresh()
    setActionMessage('Owner response published on the review.')
  }

  if (loading) return <PageSkeleton variant="table" />

  return (
    <div className="container page-wrap">
      <DashboardShell title="Owner Panel" subtitle="Review operations" links={ownerDashboardLinks}>
        <PageHero
          eyebrow="Owner Reviews"
          title="Protect trust across every listing"
          subtitle="Write renter feedback, respond to customer reviews quickly, and keep your listing reputation healthy without leaving the owner workspace."
          className="portal-secondary"
          stats={stats}
          aside={(
            <SmartImage
              src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1280&auto=format&fit=crop"
              fallbackSrc="/tractor.svg"
              alt="Owner reviews"
              className="page-hero-media"
            />
          )}
          actions={(
            <div className="button-row">
              <Link
                className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'rounded-full')}
                to="/owner/requests"
              >
                Manage requests
              </Link>
              <Link
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                to="/owner/equipment"
              >
                Open listings
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
                  <p className="review-section-eyebrow">Renter Reputation</p>
                  <h3>Completed rentals waiting on your renter feedback</h3>
                </div>
                <span className="status-badge status-info">{pendingRenterReviews.length} open</span>
              </div>

              {pendingRenterReviews.length ? (
                <div className="review-task-grid">
                  {pendingRenterReviews.map((booking) => (
                    <article key={booking.id} className="review-task-card">
                      <div className="review-task-card-copy">
                        <strong>{booking.farmer_name || 'Farmer'}</strong>
                        <span>{booking.equipment_name}</span>
                        <p className="subtitle">
                          Capture communication, equipment care, and return quality while the rental is still fresh in your ops memory.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        Write renter feedback
                      </Button>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  eyebrow="Feedback queue clear"
                  title="No renter reviews are waiting on you"
                  message="Completed bookings will land here when they are ready for your reputation feedback."
                  actions={[
                    { to: '/owner/requests', label: 'Review requests' },
                    { to: '/owner/equipment', label: 'Open listings' }
                  ]}
                />
              )}
            </section>

            <section className="card review-list-shell">
              <div className="review-section-head">
                <div>
                  <p className="review-section-eyebrow">Customer Voice</p>
                  <h3>Reviews on your equipment</h3>
                </div>
                <span className="subtitle">{receivedReviews.length} total</span>
              </div>

              {receivedReviews.length ? (
                <div className="review-list">
                  {receivedReviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      footer={(
                        <div className="button-row review-inline-actions">
                          <Link
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                            to={`/equipment/${review.equipment_id}`}
                          >
                            Open listing
                          </Link>
                          {normalizeReviewStatus(review.status) === 'approved' && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="rounded-full"
                              onClick={() => setResponseTarget(review)}
                            >
                              {review.response?.message ? 'Edit response' : 'Respond'}
                            </Button>
                          )}
                        </div>
                      )}
                    />
                  ))}
                </div>
              ) : (
                <p className="subtitle">Customer reviews on your equipment will show up here after approved rentals are reviewed.</p>
              )}
            </section>
          </div>

          <aside className="page-side">
            <ReviewSummaryPanel
              title="Listing review health"
              subtitle="This summary now comes from the dedicated owner analytics endpoint so it stays aligned with dashboard trust metrics."
              averageRating={analytics?.average_rating}
              totalReviews={analytics?.total_reviews}
              ratingBreakdown={analytics?.rating_breakdown}
              highlights={[
                { label: 'Response rate', value: `${analytics?.response_rate || 0}%` },
                { label: 'Pending moderation', value: analytics?.pending_reviews || 0 },
                { label: 'Need a response', value: responseQueueCount },
                { label: 'Tracked listings', value: analytics?.equipment_count || 0 }
              ]}
            />

            <section className="card review-list-shell">
              <div className="review-section-head">
                <div>
                  <p className="review-section-eyebrow">Fleet Leaders</p>
                  <h3>Top-rated equipment in your portfolio</h3>
                </div>
                <span className="subtitle">{topPerformers.length} shown</span>
              </div>

              {topPerformers.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Equipment</th>
                        <th>Rating</th>
                        <th>Reviews</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPerformers.map((item) => (
                        <tr key={item.equipment_id}>
                          <td>{item.equipment_name}</td>
                          <td>{Number(item.average_rating || 0).toFixed(1)}</td>
                          <td>{item.total_reviews}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="subtitle">Equipment performance analytics will appear here after approved listing reviews accumulate.</p>
              )}
            </section>

            <section className="card review-list-shell">
              <div className="review-section-head">
                <div>
                  <p className="review-section-eyebrow">Your Recent Notes</p>
                  <h3>Renter reviews you have written</h3>
                </div>
                <span className="subtitle">{writtenReviews.length} total</span>
              </div>

              {writtenReviews.length ? (
                <div className="review-list">
                  {writtenReviews.slice(0, 4).map((review) => (
                    <ReviewCard key={review.id} review={review} showRecipient />
                  ))}
                </div>
              ) : (
                <p className="subtitle">Your renter feedback history will appear here after the first completed booking you review.</p>
              )}
            </section>

            <section className="card">
              <h3>Response best practices</h3>
              <ul className="feature-list">
                <li><span>Respond to strong reviews quickly to reinforce trust and repeat bookings.</span></li>
                <li><span>Use calm, factual language when clarifying context on mixed feedback.</span></li>
                <li><span>Keep renter reviews specific so the trust signal stays useful for the platform.</span></li>
              </ul>
            </section>
          </aside>
        </section>
      </DashboardShell>

      <ReviewComposerModal
        isOpen={Boolean(selectedBooking)}
        booking={selectedBooking}
        reviewType="user"
        subjectName={selectedBooking?.farmer_name || 'the renter'}
        onClose={() => setSelectedBooking(null)}
        onSubmitted={handleReviewSubmitted}
      />

      <ReviewTextActionModal
        isOpen={Boolean(responseTarget)}
        title={responseTarget?.response?.message ? 'Update owner response' : 'Respond to review'}
        description="Your response appears directly beneath the public review on the equipment page."
        label="Owner response"
        placeholder="Thank the renter, acknowledge specific context, or clarify next steps for future customers."
        submitLabel={responseTarget?.response?.message ? 'Update response' : 'Publish response'}
        initialValue={responseTarget?.response?.message || ''}
        onClose={() => setResponseTarget(null)}
        onSubmit={handleResponseSubmit}
      />
    </div>
  )
}
