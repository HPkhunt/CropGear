import client from './api.js'

export const reviewService = {
  async listEquipment(equipmentId, { page = 1, pageSize = 6 } = {}) {
    const { data } = await client.get(`/reviews/equipment/${equipmentId}`, {
      params: {
        page,
        page_size: pageSize
      }
    })
    return data
  },
  async listUser(userId, { page = 1, pageSize = 10 } = {}) {
    const { data } = await client.get(`/reviews/user/${userId}`, {
      params: {
        page,
        page_size: pageSize
      }
    })
    return data
  },
  async mine({ view = 'all', page = 1, pageSize = 100 } = {}) {
    const { data } = await client.get('/reviews/mine', {
      params: {
        view,
        page,
        page_size: pageSize
      }
    })
    return data
  },
  async create(payload) {
    const { data } = await client.post('/reviews', payload)
    return data
  },
  async respond(reviewId, message) {
    const { data } = await client.post(`/reviews/${reviewId}/response`, { message })
    return data
  },
  async dispute(reviewId, reason) {
    const { data } = await client.post(`/reviews/${reviewId}/dispute`, { reason })
    return data
  },
  async flag(reviewId, reason) {
    const { data } = await client.post(`/reviews/${reviewId}/flag`, { reason })
    return data
  },
  async moderationQueue({ statusFilter = 'pending', page = 1, pageSize = 50 } = {}) {
    const { data } = await client.get('/reviews/moderation', {
      params: {
        status_filter: statusFilter,
        page,
        page_size: pageSize
      }
    })
    return data
  },
  async moderate(reviewId, payload) {
    const { data } = await client.post(`/reviews/${reviewId}/moderate`, payload)
    return data
  },
  async ownerAnalytics(ownerId = null) {
    const { data } = await client.get('/reviews/analytics/owner', {
      params: ownerId ? { owner_id: ownerId } : undefined
    })
    return data
  }
}
