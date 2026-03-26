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
  async get(id) {
    const { data } = await client.get(`/bookings/${id}`)
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
  },
  async cancel(id, reason = '') {
    const { data } = await client.post(`/bookings/${id}/cancel`, { reason })
    return data
  },
  async complete(id) {
    const { data } = await client.post(`/bookings/${id}/complete`)
    return data
  },
  async checkAvailability(equipmentId, startDate, endDate) {
    const { data } = await client.get('/bookings/check-availability', {
      params: { equipment_id: equipmentId, start_date: startDate, end_date: endDate }
    })
    return data
  }
}
