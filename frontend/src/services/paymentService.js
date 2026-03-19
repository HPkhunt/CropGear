import client from './api.js'

export const paymentService = {
  async createIntent(bookingId, amount, email) {
    const { data } = await client.post('/payments/intent', { booking_id: bookingId, amount, email })
    return data
  }
}
