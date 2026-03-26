import React from 'react'
import { StarRatingDisplay } from './StarRating.jsx'
import SmartImage from './SmartImage.jsx'

export default function ReviewCard({ review, showEquipment = false }) {
  const date = review.created_at
    ? new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : ''

  const photos = review.photos || []
  const response = review.response || null

  return (
    <article className="review-card card">
      <header className="review-card-header">
        <div className="review-card-meta">
          <strong className="review-card-author">{review.reviewer_name || 'User'}</strong>
          {date && <time className="review-card-date">{date}</time>}
        </div>
        <StarRatingDisplay rating={review.rating} size={16} showValue={false} />
      </header>

      {review.title && <h4 className="review-card-title">{review.title}</h4>}

      {showEquipment && review.equipment_name && (
        <p className="review-card-equipment">
          <small>Equipment: <strong>{review.equipment_name}</strong></small>
        </p>
      )}

      {review.comment && <p className="review-card-comment">{review.comment}</p>}

      {photos.length > 0 && (
        <div className="review-card-photos">
          {photos.slice(0, 5).map((url, i) => (
            <SmartImage
              key={i}
              src={url}
              alt={`Review photo ${i + 1}`}
              className="review-card-photo"
            />
          ))}
        </div>
      )}

      {response && (
        <div className="review-card-response">
          <div className="review-response-header">
            <strong>{response.responder_name || 'Owner'}</strong> responded
          </div>
          <p>{response.message}</p>
        </div>
      )}
    </article>
  )
}
