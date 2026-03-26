import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { equipmentService } from '../../services/equipmentService.js'
import { bookingService } from '../../services/bookingService.js'
import { reviewService } from '../../services/reviewService.js'
import { chatService } from '/src/services/chatService.js'
import Loader from '../../components/Loader.jsx'
import PageHero from '../../components/PageHero.jsx'
import { StarRatingDisplay } from '../../components/StarRating.jsx'
import ReviewCard from '../../components/ReviewCard.jsx'
import RatingBreakdown from '../../components/RatingBreakdown.jsx'
import { User, MapPin, Tag, ClipboardList, MessageCircle } from 'lucide-react'
import { getEquipmentImage } from '../../utils/equipmentImages.js'
import useAuth from '../../hooks/useAuth.js'
import { getErrorMessage } from '../../utils/helpers.js'
import SmartImage from '../../components/SmartImage.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const CATEGORY_GALLERY = {
  tractor: [
    'https://images.unsplash.com/photo-1530267981375-f0de937f5f13?q=80&w=1280&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1592805144716-feeccccef5ac?q=80&w=1280&auto=format&fit=crop'
  ],
  harvester: [
    'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1280&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1574943320219-553eb213f72d?q=80&w=1280&auto=format&fit=crop'
  ],
  seeder: [
    'https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=1280&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?q=80&w=1280&auto=format&fit=crop'
  ],
  tillage: [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1280&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=1280&auto=format&fit=crop'
  ],
  irrigation: [
    'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?q=80&w=1280&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1586771107445-b3f7e4c1b25a?q=80&w=1280&auto=format&fit=crop'
  ],
  crop_care: [
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=1280&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?q=80&w=1280&auto=format&fit=crop'
  ],
  default: [
    'https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1280&auto=format&fit=crop'
  ]
}

export default function EquipmentDetails() {
  const { id } = useParams()
  const { isAuthenticated, user } = useAuth()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [reviews, setReviews] = useState([])
  const [reviewMeta, setReviewMeta] = useState({ total: 0, breakdown: {} })
  const { addToast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await equipmentService.get(id)
        setItem(data)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  useEffect(() => {
    if (!id) return
    reviewService.getEquipmentReviews(id, 1, 10)
      .then(data => {
        const list = data?.reviews || data?.items || (Array.isArray(data) ? data : [])
        setReviews(list)
        setReviewMeta({
          total: data?.total || list.length,
          breakdown: data?.breakdown || {}
        })
      })
      .catch(() => {})
  }, [id])

  const image = useMemo(() => getEquipmentImage(item || {}), [item])
  const galleryImages = useMemo(
    () => CATEGORY_GALLERY[item?.category] || CATEGORY_GALLERY.default,
    [item?.category]
  )
  const stats = [
    { value: `$${Number(item?.daily_rate || 0).toLocaleString()}`, label: 'Daily rate' },
    { value: Number(item?.rating || item?.average_rating || 0).toFixed(1), label: 'Rating' },
    { value: item?.reviews_count || item?.total_reviews || reviews.length || 0, label: 'Reviews' },
    { value: item?.is_available === false ? 'Unavailable' : 'Available', label: 'Status' }
  ]
  const ownerName = item?.owner_name || 'Equipment Owner'
  const specCount = item?.specs?.length || 0

  const bookingPreview = useMemo(() => {
    if (!startDate || !endDate) return null;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s) || isNaN(e) || e < s) return null;
    const diffTime = Math.abs(e - s);
    const durationDays = Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1, 1);

    const baseRate = Number(item?.daily_rate || 0);
    const subtotal = baseRate * durationDays;
    const platformFee = subtotal * 0.10;
    const finalTotal = subtotal + platformFee;

    return { durationDays, subtotal, platformFee, finalTotal };
  }, [startDate, endDate, item]);

  const onRequestBooking = async (event) => {
    event.preventDefault()

    if (!isAuthenticated) {
      addToast('Please sign in first to send booking requests.', 'error')
      return
    }
    if (user?.role !== 'farmer' && user?.role !== 'admin') {
      addToast('Only farmer accounts can create booking requests.', 'error')
      return
    }
    if (!bookingPreview) {
      addToast('Please provide valid start and end dates.', 'error')
      return
    }

    setRequesting(true)
    try {
      const booking = await bookingService.create({
        equipment_id: item.id,
        start_date: startDate,
        end_date: endDate
      })
      addToast(`Booking request ${booking.id} created successfully.`, 'success')
      setStartDate('')
      setEndDate('')
    } catch (error) {
      addToast(getErrorMessage(error, 'Unable to create booking request.'), 'error')
    } finally {
      setRequesting(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      addToast('Page link copied to clipboard.', 'success')
    } catch {
      addToast('Could not copy link.', 'error')
    }
  }

  const contactOwner = async () => {
    if (!isAuthenticated) {
      addToast('Please sign in to contact the owner.', 'error')
      return
    }

    if (user?.id === item.owner_id) {
      addToast('You cannot contact yourself.', 'error')
      return
    }

    try {
      const conversation = await chatService.createConversation(
        item.owner_id,
        `Hi, I'm interested in your ${item.name}. Can we discuss availability?`
      )
      addToast('Chat started! Check your messages.', 'success')
    } catch (error) {
      addToast(getErrorMessage(error, 'Unable to start chat.'), 'error')
    }
  }

  if (loading) return <Loader />
  if (!item) {
    return (
      <div className="container page-wrap">
        <section className="card empty-state">
          <h3>Equipment not found</h3>
          <p className="subtitle">The requested equipment entry is unavailable.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="container page-wrap">
      <PageHero
        eyebrow="Equipment Details"
        title={item.name}
        subtitle={`${item.category} in ${item.location} | Rating ${item.rating || 'N/A'}`}
        className="portal-primary"
        stats={stats}
        aside={
          <SmartImage
            src={image}
            fallbackSrc="/tractor.svg"
            alt={item.name}
            className="page-hero-media"
          />
        }
        actions={<Link className="button outline" to="/farmer/equipments">Back to Browse</Link>}
      />

      <section className="page-split">
        <div className="page-main">
          <section className="card details-card">
            <div className="details-media-grid">
              <SmartImage src={image} fallbackSrc="/tractor.svg" alt={item.name} labelForFallback={item.name} />
              <SmartImage src={galleryImages[0]} fallbackSrc="/fields.svg" alt="Field operations" />
            </div>
            <div className="details-thumb-grid">
              <SmartImage src={galleryImages[1]} fallbackSrc="/hero.svg" alt="Equipment close view" />
              <SmartImage src="https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop" fallbackSrc="/tractor.svg" alt="Maintenance detail" />
              <SmartImage src="https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop" fallbackSrc="/fields.svg" alt="Farm landscape detail" />
            </div>

            <p className="subtitle">{item.description}</p>

            <div className="details-grid">
              <div>
                <h3>Specifications</h3>
                {(item.specs || []).length > 0 ? (
                  <ul className="feature-list">
                    {item.specs.map((spec, index) => <li key={index}><span>{spec}</span></li>)}
                  </ul>
                ) : (
                  <p className="subtitle">No specifications listed for this equipment.</p>
                )}
              </div>

              {(!isAuthenticated || user?.role === 'farmer' || user?.role === 'admin') && (
                <div className="price-panel">
                  <strong>${Number(item.daily_rate || 0).toLocaleString()} / day</strong>
                  {isAuthenticated ? (
                    <form className="form-stack" onSubmit={onRequestBooking}>
                      <label>
                        Start date
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required min={new Date().toISOString().split('T')[0]} />
                      </label>
                      <label>
                        End date
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required min={startDate || new Date().toISOString().split('T')[0]} />
                      </label>

                      {bookingPreview && (
                        <div className="booking-summary">
                          <div className="booking-summary-row">
                            <span>${Number(item.daily_rate || 0).toLocaleString()} x {bookingPreview.durationDays} days</span>
                            <span>${bookingPreview.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="booking-summary-row" style={{ color: 'var(--muted)' }}>
                            <span>Platform fee (10%)</span>
                            <span>${bookingPreview.platformFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="booking-summary-total">
                            <span>Total</span>
                            <span>${bookingPreview.finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      )}

                      <button className="button lg secondary" type="submit" disabled={requesting} style={{ marginTop: '16px' }}>
                        {requesting ? 'Sending request...' : 'Request Booking'}
                      </button>
                    </form>
                  ) : (
                    <p className="subtitle" style={{ marginTop: '12px' }}>Sign in to create booking requests. <Link to="/auth/login">Login</Link></p>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="page-side">
          <section className="card">
            <h3>Listing Summary</h3>
            <div className="panel-list-premium">
              <div className="insight-stat-row">
                <div className="stat-icon-wrap"><User size={18} /></div>
                <div className="stat-info-wrap">
                  <strong>{ownerName}</strong>
                  <span>Owner</span>
                </div>
              </div>
              <div className="insight-stat-row">
                <div className="stat-icon-wrap"><MapPin size={18} /></div>
                <div className="stat-info-wrap">
                  <strong>{item.location || 'Location'}</strong>
                  <span>Location</span>
                </div>
              </div>
              <div className="insight-stat-row">
                <div className="stat-icon-wrap"><Tag size={18} /></div>
                <div className="stat-info-wrap">
                  <strong>{item.category || 'Category'}</strong>
                  <span>Category</span>
                </div>
              </div>
              <div className="insight-stat-row">
                <div className="stat-icon-wrap"><ClipboardList size={18} /></div>
                <div className="stat-info-wrap">
                  <strong>{specCount}</strong>
                  <span>Specs listed</span>
                </div>
              </div>
            </div>
            <p className="panel-note">Confirm dates before sending a booking request.</p>
          </section>

          <section className="card">
            <h3>Booking Checklist</h3>
            <ul className="feature-list">
              <li><span>Match equipment capacity with field size.</span></li>
              <li><span>Confirm pickup and return dates.</span></li>
              <li><span>Review specs and availability status.</span></li>
            </ul>
            <div className="button-row">
              <Link className="button sm secondary pill hover-lift" to="/farmer/equipments">Browse More</Link>
              <button className="button sm outline pill hover-lift" onClick={copyLink}>Copy Link</button>
              {isAuthenticated && user?.role === 'farmer' && user?.id !== item.owner_id && (
                <button className="button sm primary pill hover-lift" onClick={contactOwner}>
                  <MessageCircle size={16} /> Contact Owner
                </button>
              )}
            </div>
          </section>
        </aside>
      </section>

      {/* Reviews Section */}
      <section className="reviews-section">
        <div className="card">
          <div className="reviews-section-header">
            <div className="reviews-summary">
              <span className="reviews-avg-big">{Number(item.average_rating || item.rating || 0).toFixed(1)}</span>
              <div>
                <StarRatingDisplay rating={item.average_rating || item.rating || 0} size={20} showValue={false} />
                <p className="subtitle" style={{ margin: '4px 0 0' }}>{reviewMeta.total || reviews.length} review{(reviewMeta.total || reviews.length) !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {Object.keys(reviewMeta.breakdown).length > 0 && (
              <RatingBreakdown breakdown={reviewMeta.breakdown} total={reviewMeta.total} />
            )}
          </div>

          {reviews.length > 0 ? (
            <div className="reviews-grid">
              {reviews.map((review, i) => (
                <ReviewCard key={review.id || i} review={review} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p className="subtitle">No reviews yet for this equipment.</p>
              {isAuthenticated && user?.role === 'farmer' && (
                <p className="subtitle">Book and try this equipment — then be the first to leave a review!</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
