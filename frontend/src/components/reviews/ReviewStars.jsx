import React from 'react'
import { Star } from 'lucide-react'

export default function ReviewStars({
  rating = 0,
  size = 16,
  className = '',
  showValue = false
}) {
  const normalizedRating = Math.max(0, Math.min(5, Number(rating || 0)))

  return (
    <div className={`review-stars ${className}`.trim()} aria-label={`${normalizedRating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => {
        const starNumber = index + 1
        const isFilled = normalizedRating >= starNumber
        const isHalf = !isFilled && normalizedRating >= starNumber - 0.5

        return (
          <span
            key={starNumber}
            className={`review-star ${isFilled ? 'filled' : ''} ${isHalf ? 'half' : ''}`.trim()}
          >
            <Star size={size} fill={isFilled || isHalf ? 'currentColor' : 'none'} strokeWidth={1.8} />
          </span>
        )
      })}
      {showValue && <strong className="review-stars-value">{normalizedRating.toFixed(1)}</strong>}
    </div>
  )
}
