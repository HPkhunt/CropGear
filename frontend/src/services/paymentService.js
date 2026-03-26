import client from './api.js'

export const paymentService = {
  async createIntent(bookingId, amount, email, description = '') {
    const { data } = await client.post('/payments/create-intent', {
      booking_id: bookingId,
      amount,
      email,
      description
    })
    return data
  },

  async confirmPayment(paymentIntentId) {
    const { data } = await client.post('/payments/confirm-payment', {
      payment_intent_id: paymentIntentId
    })
    return data
  },

  async history(limit = 50) {
    const { data } = await client.get('/payments/history', { params: { limit } })
    return data
  }
}
