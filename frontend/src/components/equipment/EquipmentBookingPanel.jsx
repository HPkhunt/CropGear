import React from 'react'
import { Link } from 'react-router-dom'

export default function EquipmentBookingPanel({
  dailyRate,
  isAuthenticated,
  startDate,
  endDate,
  bookingPreview,
  requesting,
  onStartDateChange,
  onEndDateChange,
  onSubmit
}) {
  const today = new Date().toISOString().split('T')[0]
  const formattedDailyRate = Number(dailyRate || 0).toLocaleString()

  return (
    <div className="price-panel">
      <strong>${formattedDailyRate} / day</strong>
      {isAuthenticated ? (
        <form className="form-stack" onSubmit={onSubmit}>
          <label>
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
              required
              min={today}
            />
          </label>
          <label>
            End date
            <input
              type="date"
              value={endDate}
              onChange={(event) => onEndDateChange(event.target.value)}
              required
              min={startDate || today}
            />
          </label>

          {bookingPreview && (
            <div className="booking-summary">
              <div className="booking-summary-row">
                <span>${formattedDailyRate} x {bookingPreview.durationDays} days</span>
                <span>${bookingPreview.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="booking-summary-row booking-summary-row-muted">
                <span>Platform fee (10%)</span>
                <span>${bookingPreview.platformFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="booking-summary-total">
                <span>Total</span>
                <span>${bookingPreview.finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          <button className="button lg secondary booking-request-button" type="submit" disabled={requesting}>
            {requesting ? 'Sending request...' : 'Request Booking'}
          </button>
        </form>
      ) : (
        <p className="subtitle booking-auth-copy">
          Sign in to create booking requests. <Link to="/auth/login">Login</Link>
        </p>
      )}
    </div>
  )
}
