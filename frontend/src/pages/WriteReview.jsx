import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { StarRatingInput } from '../components/StarRating.jsx'
import { reviewService } from '../services/reviewService.js'
import { useToast } from '../context/ToastContext.jsx'
import { Send, Image, ArrowLeft } from 'lucide-react'
import useAuth from '../hooks/useAuth.js'
import './WriteReview.css'

export default function WriteReview() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { user } = useAuth()

  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [photos, setPhotos] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const handlePhotoAdd = (e) => {
    const files = Array.from(e.target.files)
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setPhotos(prev => [...prev, ...newPhotos].slice(0, 5))
  }

  const removePhoto = (index) => {
    setPhotos(prev => {
      const copy = [...prev]
      URL.revokeObjectURL(copy[index].preview)
      copy.splice(index, 1)
      return copy
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (rating === 0) {
      addToast('Please select a rating', 'error')
      return
    }
    if (!comment.trim()) {
      addToast('Please write a comment', 'error')
      return
    }

    setSubmitting(true)
    try {
      await reviewService.submitReview({
        booking_id: bookingId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
        photos: photos.map(p => p.preview),
      })
      addToast('Review submitted successfully!', 'success')
      navigate(-1)
    } catch (err) {
      addToast(err?.response?.data?.detail || 'Failed to submit review', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container page-wrap">
      <div className="write-review-page">
        <button className="button outline sm pill" onClick={() => navigate(-1)} style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back
        </button>

        <div className="review-form-card card">
          <div className="review-form-header">
            <h2>Write a Review</h2>
            <p className="subtitle">Share your experience with the equipment and help other farmers make better decisions.</p>
          </div>

          <form onSubmit={handleSubmit} className="review-form">
            <div className="form-group">
              <label className="form-label">Your Rating *</label>
              <div className="rating-selector">
                <StarRatingInput value={rating} onChange={setRating} size={32} />
                {rating > 0 && (
                  <span className="rating-text">
                    {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Review Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Summarize your experience..."
                maxLength={120}
                className="review-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Your Review *</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Tell us about the equipment condition, owner responsiveness, and overall experience..."
                rows={5}
                maxLength={2000}
                className="review-textarea"
              />
              <div className="char-count">{comment.length}/2000</div>
            </div>

            <div className="form-group">
              <label className="form-label">Photos (optional, max 5)</label>
              <div className="photo-upload-area">
                {photos.map((photo, idx) => (
                  <div key={idx} className="photo-preview">
                    <img src={photo.preview} alt={`Upload ${idx + 1}`} />
                    <button type="button" className="photo-remove" onClick={() => removePhoto(idx)}>×</button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <label className="photo-add-btn">
                    <Image size={20} />
                    <span>Add Photo</span>
                    <input type="file" accept="image/*" onChange={handlePhotoAdd} hidden multiple />
                  </label>
                )}
              </div>
            </div>

            <button type="submit" className="button gradient pill" disabled={submitting} style={{ width: '100%', marginTop: '1rem' }}>
              {submitting ? 'Submitting...' : <><Send size={16} /> Submit Review</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
