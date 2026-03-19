import client from './api.js'

export const bookingService = {
  async myBookings() {
    const { data } = await client.get('/bookings')
    return Array.isArray(data) ? data : []
  },
  async create(payload) {
    const { data } = await client.post('/bookings', payload)
    return data
  },
  async requests() {
    const { data } = await client.get('/bookings/requests')
    return Array.isArray(data) ? data : []
  },
  async approve(id) {
    const { data } = await client.post(`/bookings/${id}/approve`)
    return data
  },
  async reject(id) {
    const { data } = await client.post(`/bookings/${id}/reject`)
    return data
  }
}
