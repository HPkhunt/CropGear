export function normalizeBookingStatus(status) {
  return String(status || 'pending').toLowerCase()
}

export function normalizePaymentStatus(status) {
  return String(status || 'pending').toLowerCase()
}

export function formatBookingStatusLabel(status) {
  return normalizeBookingStatus(status).replace(/_/g, ' ')
}

export function getBookingStatusClass(status) {
  const normalizedStatus = normalizeBookingStatus(status)
  if (normalizedStatus === 'confirmed' || normalizedStatus === 'completed') {
    return 'status-success'
  }
  if (normalizedStatus === 'in_progress') {
    return 'status-info'
  }
  if (normalizedStatus === 'rejected' || normalizedStatus === 'cancelled') {
    return 'status-error'
  }
  return 'status-pending'
}

export function summarizeBookings(bookings) {
  const counts = {
    pending: 0,
    confirmed: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    rejected: 0
  }

  bookings.forEach((booking) => {
    const status = normalizeBookingStatus(booking?.booking_status)
    if (status in counts) {
      counts[status] += 1
    }
  })

  return counts
}

export function countBookingsByStatuses(bookings, statuses) {
  const allowed = new Set(statuses.map((status) => normalizeBookingStatus(status)))
  return bookings.reduce((count, booking) => (
    allowed.has(normalizeBookingStatus(booking?.booking_status)) ? count + 1 : count
  ), 0)
}

export function canPayForBooking(booking) {
  const status = normalizeBookingStatus(booking?.booking_status)
  const paymentStatus = normalizePaymentStatus(booking?.payment_status)
  return paymentStatus !== 'completed' && (status === 'confirmed' || status === 'in_progress')
}

export function canCancelBooking(booking) {
  const status = normalizeBookingStatus(booking?.booking_status)
  const paymentStatus = normalizePaymentStatus(booking?.payment_status)
  return status === 'pending' || (status === 'confirmed' && paymentStatus !== 'completed')
}

export function getBookingOperationsPath(bookingId, role) {
  const normalizedRole = String(role || 'farmer')
  if (normalizedRole === 'equipment_owner') {
    return `/owner/requests/${bookingId}/operations`
  }
  if (normalizedRole === 'admin') {
    return `/admin/bookings/${bookingId}/operations`
  }
  return `/farmer/bookings/${bookingId}/operations`
}
