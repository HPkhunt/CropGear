import { describe, expect, it } from 'vitest'
import {
  canCancelBooking,
  canPayForBooking,
  countBookingsByStatuses,
  formatBookingStatusLabel,
  getBookingStatusClass,
  normalizeBookingStatus,
  summarizeBookings
} from './bookings.js'

describe('bookings utils', () => {
  it('normalizes and formats booking statuses for UI labels', () => {
    expect(normalizeBookingStatus('In_Progress')).toBe('in_progress')
    expect(normalizeBookingStatus()).toBe('pending')
    expect(formatBookingStatusLabel('in_progress')).toBe('in progress')
    expect(getBookingStatusClass('completed')).toBe('status-success')
    expect(getBookingStatusClass('cancelled')).toBe('status-error')
  })

  it('summarizes booking counts by status and filters selected groups', () => {
    const bookings = [
      { booking_status: 'pending' },
      { booking_status: 'confirmed' },
      { booking_status: 'confirmed' },
      { booking_status: 'in_progress' },
      { booking_status: 'completed' },
      { booking_status: 'cancelled' },
      { booking_status: 'unknown' }
    ]

    expect(summarizeBookings(bookings)).toEqual({
      pending: 1,
      confirmed: 2,
      in_progress: 1,
      completed: 1,
      cancelled: 1,
      rejected: 0
    })
    expect(countBookingsByStatuses(bookings, ['confirmed', 'completed'])).toBe(3)
  })

  it('exposes the correct payment and cancellation actions by booking state', () => {
    expect(canPayForBooking({ booking_status: 'confirmed', payment_status: 'pending' })).toBe(true)
    expect(canPayForBooking({ booking_status: 'in_progress', payment_status: 'pending' })).toBe(true)
    expect(canPayForBooking({ booking_status: 'confirmed', payment_status: 'completed' })).toBe(false)
    expect(canPayForBooking({ booking_status: 'pending', payment_status: 'pending' })).toBe(false)

    expect(canCancelBooking({ booking_status: 'pending', payment_status: 'pending' })).toBe(true)
    expect(canCancelBooking({ booking_status: 'confirmed', payment_status: 'pending' })).toBe(true)
    expect(canCancelBooking({ booking_status: 'confirmed', payment_status: 'completed' })).toBe(false)
    expect(canCancelBooking({ booking_status: 'completed', payment_status: 'completed' })).toBe(false)
  })
})
