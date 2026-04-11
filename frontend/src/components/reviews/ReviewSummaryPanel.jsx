import React from 'react'
import { MessageSquareText, ShieldCheck, Sparkles } from 'lucide-react'
import ReviewStars from './ReviewStars.jsx'
import { getRecommendationRate } from '../../utils/reviews.js'

export default function ReviewSummaryPanel({
  title,
  subtitle,
  averageRating = 0,
  totalReviews = 0,
  ratingBreakdown = {},
  highlights = [],
  className = ''
}) {
  const recommendationRate = getRecommendationRate(
    Object.entries(ratingBreakdown || {}).flatMap(([rating, count]) => (
      Array.from({ length: Number(count || 0) }, () => ({ rating: Number(rating) }))
    ))
  )

  const rows = [5, 4, 3, 2, 1].map((rating) => {
    const count = Number(ratingBreakdown?.[rating] || ratingBreakdown?.[String(rating)] || 0)
    const percentage = totalReviews ? Math.round((count / totalReviews) * 100) : 0
    return {
      rating,
      count,
      percentage
    }
  })

  const defaultHighlights = [
    { icon: Sparkles, label: 'Recommendation rate', value: `${recommendationRate}%` },
    { icon: MessageSquareText, label: 'Verified reviews', value: totalReviews },
    { icon: ShieldCheck, label: 'Rental-backed feedback', value: totalReviews ? 'Live' : 'Pending' }
  ]
  const visibleHighlights = highlights.length ? highlights : defaultHighlights

  return (
    <section className={`card review-summary-panel ${className}`.trim()}>
      <div className="review-summary-copy">
        <p className="review-section-eyebrow">Review Snapshot</p>
        <h3>{title}</h3>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>

      <div className="review-summary-grid">
        <div className="review-summary-score">
          <div className="review-score-ring">
            <strong>{Number(averageRating || 0).toFixed(1)}</strong>
            <span>out of 5</span>
          </div>
          <ReviewStars rating={averageRating} size={18} showValue={false} />
          <p className="subtitle">
            {totalReviews ? `${totalReviews} verified review${totalReviews === 1 ? '' : 's'}` : 'No reviews yet'}
          </p>
        </div>

        <div className="review-breakdown">
          {rows.map((row) => (
            <div key={row.rating} className="review-breakdown-row">
              <span>{row.rating} star</span>
              <div className="review-breakdown-track" aria-hidden="true">
                <div className="review-breakdown-fill" style={{ width: `${row.percentage}%` }} />
              </div>
              <strong>{row.count}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="review-highlight-grid">
        {visibleHighlights.map((item) => {
          const Icon = item.icon || Sparkles
          return (
            <div key={item.label} className="review-highlight-card">
              <div className="review-highlight-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={2.1} />
              </div>
              <div>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
