import React, { useState } from 'react'

/**
 * Read-only star rating display
 */
export function StarRatingDisplay({ rating = 0, max = 5, size = 18, showValue = true, reviewCount = null, className = '' }) {
  const clamped = Math.min(Math.max(Number(rating) || 0, 0), max)
  const fullStars = Math.floor(clamped)
  const hasHalf = clamped - fullStars >= 0.25 && clamped - fullStars < 0.75
  const emptyStars = max - fullStars - (hasHalf ? 1 : 0)

  return (
    <span className={`star-rating-display ${className}`} aria-label={`${clamped.toFixed(1)} out of ${max} stars`}>
      <span className="star-icons" style={{ fontSize: `${size}px` }}>
        {Array.from({ length: fullStars }, (_, i) => (
          <span key={`full-${i}`} className="star star-full" aria-hidden="true">★</span>
        ))}
        {hasHalf && <span className="star star-half" aria-hidden="true">★</span>}
        {Array.from({ length: emptyStars }, (_, i) => (
          <span key={`empty-${i}`} className="star star-empty" aria-hidden="true">★</span>
        ))}
      </span>
      {showValue && <span className="star-value">{clamped.toFixed(1)}</span>}
      {reviewCount !== null && <span className="star-count">({reviewCount})</span>}
    </span>
  )
}

/**
 * Interactive star rating input
 */
export function StarRatingInput({ value = 0, onChange, max = 5, size = 28, disabled = false, className = '' }) {
  const [hover, setHover] = useState(0)

  return (
    <span
      className={`star-rating-input ${disabled ? 'disabled' : ''} ${className}`}
      role="radiogroup"
      aria-label="Rating"
    >
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1
        const isFilled = starValue <= (hover || value)
        return (
          <button
            key={starValue}
            type="button"
            className={`star-btn ${isFilled ? 'star-btn-active' : ''}`}
            style={{ fontSize: `${size}px` }}
            onClick={() => !disabled && onChange?.(starValue)}
            onMouseEnter={() => !disabled && setHover(starValue)}
            onMouseLeave={() => setHover(0)}
            disabled={disabled}
            role="radio"
            aria-checked={starValue === value}
            aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
          >
            ★
          </button>
        )
      })}
      {value > 0 && <span className="star-input-label">{value} / {max}</span>}
    </span>
  )
}
