import client from './api.js'

let paymentConfigCache = null
let paymentConfigPromise = null

export const paymentService = {
  async getConfig({ force = false } = {}) {
    if (!force && paymentConfigCache) {
      return paymentConfigCache
    }
    if (!force && paymentConfigPromise) {
      return paymentConfigPromise
    }
    paymentConfigPromise = client.get('/payments/config')
      .then(({ data }) => {
        paymentConfigCache = data
        return data
      })
      .finally(() => {
        paymentConfigPromise = null
      })
    return paymentConfigPromise
  },
  async createIntent(bookingId, amount, email) {
    const { data } = await client.post('/payments/create-intent', { booking_id: bookingId, amount, email })
    return data
  },
  async confirmPayment(paymentIntentId) {
    const { data } = await client.post('/payments/confirm-payment', { payment_intent_id: paymentIntentId })
    return data
  },
  async history(limit = 50) {
    const { data } = await client.get('/payments/history', { params: { limit } })
    return data
  }
}
