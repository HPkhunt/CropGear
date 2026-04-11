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
  async getTracking(id) {
    const { data } = await client.get(`/bookings/${id}/tracking`)
    return data
  },
  async addTrackingUpdate(id, payload) {
    const { data } = await client.post(`/bookings/${id}/tracking`, {
      label: payload.label,
      status: payload.status,
      latitude: Number(payload.latitude),
      longitude: Number(payload.longitude),
      note: payload.note || '',
      eta_label: payload.etaLabel || ''
    })
    return data
  },
  async getServiceTickets(id) {
    const { data } = await client.get(`/bookings/${id}/service-tickets`)
    return data
  },
  async createServiceTicket(id, payload) {
    const { data } = await client.post(`/bookings/${id}/service-tickets`, {
      title: payload.title,
      issue_type: payload.issueType,
      priority: payload.priority,
      description: payload.description
    })
    return data
  },
  async updateServiceTicketStatus(id, ticketId, payload) {
    const { data } = await client.post(`/bookings/${id}/service-tickets/${ticketId}/status`, {
      status: payload.status,
      note: payload.note || ''
    })
    return data
  },
  async requests(statusFilter = 'all') {
    const { data } = await client.get('/bookings/requests', {
      params: statusFilter && statusFilter !== 'all' ? { status_filter: statusFilter } : undefined
    })
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
  async cancel(id) {
    const { data } = await client.post(`/bookings/${id}/cancel`)
    return data
  },
  async start(id) {
    const { data } = await client.post(`/bookings/${id}/start`)
    return data
  },
  async complete(id) {
    const { data } = await client.post(`/bookings/${id}/complete`)
    return data
  }
}
