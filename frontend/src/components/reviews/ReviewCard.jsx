import React from 'react'
import { BadgeAlert, MessageCircleReply, ShieldAlert } from 'lucide-react'
import SmartImage from '../SmartImage.jsx'
import ReviewStars from './ReviewStars.jsx'
import {
  formatReviewDate,
  formatReviewStatusLabel,
  getReviewStatusClass
} from '../../utils/reviews.js'

export default function ReviewCard({
  review,
  showStatus = true,
  showRecipient = false,
  showModeration = false,
  footer = null,
  className = ''
}) {
  const photoUrls = Array.isArray(review?.photos) ? review.photos.filter(Boolean) : []
  const hasFlags = Array.isArray(review?.flags) && review.flags.length > 0
  const hasDispute = Boolean(review?.dispute?.status)
  const moderationReason = review?.moderation?.reason

  return (
    <article className={`card review-card ${className}`.trim()}>
      <div className="review-card-head">
        <div>
          <div className="review-card-meta">
            <span className="review-author">{review?.reviewer_name || 'Verified renter'}</span>
            <span>{formatReviewDate(review?.created_at)}</span>
            {review?.equipment_name && <span>{review.equipment_name}</span>}
            {showRecipient && review?.recipient_name && <span>For {review.recipient_name}</span>}
          </div>
          <div className="review-card-rating">
            <ReviewStars rating={review?.rating} size={16} />
            <strong>{Number(review?.rating || 0).toFixed(1)}</strong>
          </div>
        </div>
        {showStatus && (
          <span className={`status-badge ${getReviewStatusClass(review?.status)}`}>
            {formatReviewStatusLabel(review?.status)}
          </span>
        )}
      </div>

      {(review?.title || review?.comment) && (
        <div className="review-card-copy">
          {review?.title && <h4>{review.title}</h4>}
          {review?.comment && <p className="subtitle">{review.comment}</p>}
        </div>
      )}

      {photoUrls.length > 0 && (
        <div className="review-photo-grid">
          {photoUrls.map((photoUrl) => (
            <SmartImage
              key={photoUrl}
              src={photoUrl}
              fallbackSrc="/tractor.svg"
              alt={review?.title || review?.equipment_name || 'Review photo'}
              className="review-photo"
              loading="lazy"
            />
          ))}
        </div>
      )}

      {review?.response?.message && (
        <div className="review-response-panel">
          <div className="review-response-head">
            <MessageCircleReply size={16} strokeWidth={2.1} aria-hidden="true" />
            <strong>{review?.response?.responder_name || 'Owner response'}</strong>
            <span>{formatReviewDate(review?.response?.updated_at || review?.response?.created_at)}</span>
          </div>
          <p>{review.response.message}</p>
        </div>
      )}

      {showModeration && (hasFlags || hasDispute || moderationReason) && (
        <div className="review-admin-strip">
          {hasFlags && (
            <span className="review-admin-flag">
              <BadgeAlert size={14} strokeWidth={2.2} aria-hidden="true" />
              {review.flags.length} flag{review.flags.length === 1 ? '' : 's'}
            </span>
          )}
          {hasDispute && (
            <span className="review-admin-flag">
              <ShieldAlert size={14} strokeWidth={2.2} aria-hidden="true" />
              Dispute: {review.dispute?.status}
            </span>
          )}
          {moderationReason && <span className="subtitle">Note: {moderationReason}</span>}
        </div>
      )}

      {footer && <div className="review-card-footer">{footer}</div>}
    </article>
  )
}
