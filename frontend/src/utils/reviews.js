import { normalizeBookingStatus } from './bookings.js'

export function normalizeReviewStatus(status) {
  return String(status || 'pending').toLowerCase()
}

export function formatReviewStatusLabel(status) {
  const normalizedStatus = normalizeReviewStatus(status)
  if (normalizedStatus === 'approved') return 'Published'
  if (normalizedStatus === 'pending') return 'Awaiting moderation'
  if (normalizedStatus === 'flagged') return 'Flagged'
  if (normalizedStatus === 'disputed') return 'In dispute'
  if (normalizedStatus === 'hidden') return 'Hidden'
  if (normalizedStatus === 'rejected') return 'Rejected'
  return normalizedStatus.replace(/_/g, ' ')
}

export function getReviewStatusClass(status) {
  const normalizedStatus = normalizeReviewStatus(status)
  if (normalizedStatus === 'approved') return 'status-success'
  if (normalizedStatus === 'flagged' || normalizedStatus === 'hidden') return 'status-info'
  if (normalizedStatus === 'rejected' || normalizedStatus === 'disputed') return 'status-error'
  return 'status-pending'
}

export function formatReviewDate(value) {
  if (!value) return 'Recently'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Recently'

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function getReviewLookupKey(bookingId, reviewType = 'equipment') {
  return `${String(bookingId || '')}:${String(reviewType || 'equipment')}`
}

export function buildReviewLookup(reviews = []) {
  return reviews.reduce((lookup, review) => {
    lookup.set(getReviewLookupKey(review?.booking_id, review?.review_type), review)
    return lookup
  }, new Map())
}

export function getPendingBookingsForReview(bookings = [], reviewLookup, reviewType) {
  return bookings.filter((booking) => {
    if (normalizeBookingStatus(booking?.booking_status) !== 'completed') {
      return false
    }
    return !reviewLookup.has(getReviewLookupKey(booking?.id, reviewType))
  })
}

export function getAverageReviewRating(reviews = [], { approvedOnly = false } = {}) {
  const filtered = reviews.filter((review) => {
    const rating = Number(review?.rating)
    if (!Number.isFinite(rating) || rating <= 0) return false
    if (!approvedOnly) return true
    return normalizeReviewStatus(review?.status) === 'approved'
  })

  if (!filtered.length) return 0

  const total = filtered.reduce((sum, review) => sum + Number(review.rating || 0), 0)
  return Number((total / filtered.length).toFixed(1))
}

export function getRecommendationRate(reviews = [], minimumRating = 4) {
  const filtered = reviews.filter((review) => {
    const rating = Number(review?.rating)
    return Number.isFinite(rating) && rating > 0
  })

  if (!filtered.length) return 0

  const recommended = filtered.filter((review) => Number(review.rating || 0) >= minimumRating).length
  return Math.round((recommended / filtered.length) * 100)
}

export function countReviewsNeedingResponse(reviews = []) {
  return reviews.filter((review) => (
    normalizeReviewStatus(review?.status) === 'approved' && !review?.response?.message
  )).length
}

export function getEmptyOwnerAnalytics() {
  return {
    owner_id: '',
    equipment_count: 0,
    total_reviews: 0,
    average_rating: 0,
    rating_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    response_rate: 0,
    pending_reviews: 0,
    recent_reviews: [],
    equipment_performance: []
  }
}
