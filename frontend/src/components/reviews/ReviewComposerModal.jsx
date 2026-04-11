import React, { useEffect, useMemo, useState } from 'react'
import { ImagePlus, Star, Trash2, UploadCloud } from 'lucide-react'
import Modal from '../Modal.jsx'
import { mediaService } from '../../services/mediaService.js'
import { reviewService } from '../../services/reviewService.js'
import { formatCurrency, getErrorMessage } from '../../utils/helpers.js'

const MAX_REVIEW_PHOTOS = 5

export default function ReviewComposerModal({
  isOpen,
  booking,
  reviewType = 'equipment',
  subjectName = '',
  onClose,
  onSubmitted
}) {
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [uploads, setUploads] = useState([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [capabilities, setCapabilities] = useState({
    review_photo_upload_enabled: false,
    message: ''
  })

  useEffect(() => {
    if (!isOpen) return

    setRating(5)
    setTitle('')
    setComment('')
    setUploads([])
    setError('')

    mediaService.getCapabilities()
      .then((data) => setCapabilities(data || { review_photo_upload_enabled: false }))
      .catch(() => {
        setCapabilities({
          review_photo_upload_enabled: false,
          message: 'Photo uploads are unavailable right now.'
        })
      })
  }, [isOpen, booking?.id])

  const remainingSlots = useMemo(
    () => Math.max(MAX_REVIEW_PHOTOS - uploads.length, 0),
    [uploads.length]
  )

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []).slice(0, remainingSlots)
    event.target.value = ''
    if (!files.length || uploading) return

    setUploading(true)
    setError('')

    try {
      const uploaded = []
      for (const file of files) {
        const result = await mediaService.uploadReviewPhoto(file, { equipment_id: booking?.equipment_id || '' })
        const assetId = result?.asset?.id || result?.asset?._id
        if (!assetId) {
          throw new Error('Review photo upload did not return an asset id.')
        }
        uploaded.push({
          assetId,
          url: result.publicUrl,
          name: file.name
        })
      }
      setUploads((current) => [...current, ...uploaded].slice(0, MAX_REVIEW_PHOTOS))
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, 'Unable to upload review photos right now.'))
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
    if (!title.trim() && !comment.trim()) {
      setError('Add a headline or a comment before submitting your review.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await reviewService.create({
        booking_id: booking?.id,
        review_type: reviewType,
        rating,
        title,
        comment,
        photo_asset_ids: uploads.map((item) => item.assetId)
      })
      await onSubmitted?.()
      onClose()
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Unable to submit review.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting || uploading ? () => {} : onClose}
      title={subjectName ? `Review ${subjectName}` : booking?.equipment_name ? `Review ${booking.equipment_name}` : 'Write review'}
      size="lg"
      footer={(
        <>
          <button type="button" className="button outline pill sm" onClick={onClose} disabled={submitting || uploading}>
            Cancel
          </button>
          <button type="submit" form="review-composer-form" className="button secondary pill sm" disabled={submitting || uploading}>
            {submitting ? 'Submitting...' : 'Submit review'}
          </button>
        </>
      )}
    >
      <form id="review-composer-form" className="form-stack review-composer-form" onSubmit={handleSubmit}>
        <div className="review-composer-summary">
          <div>
            <p className="review-section-eyebrow">Completed Rental</p>
            <h4>{booking?.equipment_name || 'Equipment booking'}</h4>
            <p className="subtitle">
              {booking?.start_date} to {booking?.end_date} · {formatCurrency(booking?.total_amount)}
            </p>
          </div>
          <div className="review-rating-picker" role="radiogroup" aria-label="Select a rating">
            {Array.from({ length: 5 }, (_, index) => {
              const starValue = index + 1
              return (
                <button
                  key={starValue}
                  type="button"
                  className={`review-rating-star ${rating >= starValue ? 'active' : ''}`}
                  onClick={() => setRating(starValue)}
                  aria-label={`Rate ${starValue} star${starValue === 1 ? '' : 's'}`}
                >
                  <Star size={20} fill="currentColor" strokeWidth={1.8} />
                </button>
              )
            })}
          </div>
        </div>

        {error && <p className="error-banner">{error}</p>}

        <label>
          Headline
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={reviewType === 'equipment' ? 'What stood out about this rental?' : 'How did the renter handle this booking?'}
            maxLength={120}
          />
        </label>

        <label>
          Review details
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={reviewType === 'equipment'
              ? 'Share field performance, condition, owner communication, or anything future renters should know.'
              : 'Share how the renter communicated, returned the machine, and handled the booking overall.'}
            rows={6}
            maxLength={2000}
          />
        </label>

        <div className="review-upload-shell">
          <div className="review-upload-copy">
            <div className="review-upload-icon" aria-hidden="true">
              <ImagePlus size={18} strokeWidth={2.1} />
            </div>
            <div>
              <strong>Add field photos</strong>
              <p className="subtitle">
                Upload up to {MAX_REVIEW_PHOTOS} images to show equipment condition or results. Photos are optional.
              </p>
            </div>
          </div>

          {capabilities.review_photo_upload_enabled ? (
            <label className={`review-upload-button ${uploading || !remainingSlots ? 'disabled' : ''}`}>
              <UploadCloud size={16} strokeWidth={2.1} />
              <span>{uploading ? 'Uploading...' : remainingSlots ? 'Upload photos' : 'Photo limit reached'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                onChange={handleFiles}
                disabled={uploading || !remainingSlots}
              />
            </label>
          ) : (
            <p className="subtitle">{capabilities.message || 'Photo uploads are currently unavailable.'}</p>
          )}
        </div>

        {uploads.length > 0 && (
          <div className="review-upload-preview-grid">
            {uploads.map((upload) => (
              <article key={upload.assetId} className="review-upload-preview">
                <img src={upload.url} alt={upload.name} />
                <div className="review-upload-preview-meta">
                  <span>{upload.name}</span>
                  <button
                    type="button"
                    className="button sm outline"
                    onClick={() => setUploads((current) => current.filter((item) => item.assetId !== upload.assetId))}
                  >
                    <Trash2 size={14} strokeWidth={2.1} aria-hidden="true" />
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </form>
    </Modal>
  )
}
