import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import BookingCard from './BookingCard.jsx'

const {
  addToastMock,
  cancelMock,
  getConfigMock,
  navigateMock
} = vi.hoisted(() => ({
  addToastMock: vi.fn(),
  cancelMock: vi.fn(),
  getConfigMock: vi.fn(),
  navigateMock: vi.fn()
}))

vi.mock('@/hooks/useToast', () => ({
  default: () => ({ addToast: addToastMock })
}))

vi.mock('../services/bookingService.js', () => ({
  bookingService: {
    cancel: cancelMock
  }
}))

vi.mock('../services/paymentService.js', () => ({
  paymentService: {
    getConfig: getConfigMock
  }
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => navigateMock
  }
})

function renderBookingCard(props = {}) {
  const booking = {
    id: 'booking-1',
    equipment_name: 'John Deere 5075E',
    owner_name: 'Alex Farmer',
    start_date: '2026-04-10',
    end_date: '2026-04-12',
    total_amount: 320,
    booking_status: 'confirmed',
    payment_status: 'pending',
    ...props.booking
  }

  return render(
    <MemoryRouter>
      <BookingCard booking={booking} onUpdated={props.onUpdated} />
    </MemoryRouter>
  )
}

describe('BookingCard', () => {
  beforeEach(() => {
    addToastMock.mockReset()
    cancelMock.mockReset()
    getConfigMock.mockReset()
    navigateMock.mockReset()
  })

  it('loads payment availability and routes to checkout for payable bookings', async () => {
    const user = userEvent.setup()
    getConfigMock.mockResolvedValue({ stripe_enabled: true })

    renderBookingCard()

    expect(screen.getByRole('button', { name: 'Checking payments...' })).toBeDisabled()

    const payButton = await screen.findByRole('button', { name: 'Pay now' })
    expect(payButton).toBeEnabled()

    await user.click(payButton)

    expect(getConfigMock).toHaveBeenCalledTimes(1)
    expect(navigateMock).toHaveBeenCalledWith('/farmer/bookings/booking-1/pay')
  })

  it('cancels a booking and refreshes the parent list', async () => {
    const user = userEvent.setup()
    const onUpdated = vi.fn()
    cancelMock.mockResolvedValue({ ok: true })

    renderBookingCard({
      booking: {
        booking_status: 'pending',
        payment_status: 'pending'
      },
      onUpdated
    })

    const cancelButton = screen.getByRole('button', { name: 'Cancel booking' })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(cancelMock).toHaveBeenCalledWith('booking-1')
    })
    expect(onUpdated).toHaveBeenCalledTimes(1)
    expect(addToastMock).toHaveBeenCalledWith('Booking cancelled successfully.', 'success')
    expect(getConfigMock).not.toHaveBeenCalled()
  })

  it('surfaces cancellation failures through the toast system', async () => {
    const user = userEvent.setup()
    cancelMock.mockRejectedValue(new Error('Server unavailable'))

    renderBookingCard({
      booking: {
        booking_status: 'pending',
        payment_status: 'pending'
      }
    })

    await user.click(screen.getByRole('button', { name: 'Cancel booking' }))

    await waitFor(() => {
      expect(addToastMock).toHaveBeenCalledWith('Server unavailable', 'error')
    })
  })
})
