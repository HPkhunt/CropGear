import client from './api.js'

export const reviewService = {
  async submitReview(payload) {
    const { data } = await client.post('/reviews', payload)
    return data
  },

  async getEquipmentReviews(equipmentId, page = 1, pageSize = 10) {
    const { data } = await client.get(`/reviews/equipment/${equipmentId}`, {
      params: { page, page_size: pageSize }
    })
    return data
  },

  async getUserReviews(userId, page = 1, pageSize = 10) {
    const { data } = await client.get(`/reviews/user/${userId}`, {
      params: { page, page_size: pageSize }
    })
    return data
  },

  async myReviews(view = 'all', page = 1, pageSize = 20) {
    const { data } = await client.get('/reviews/mine', {
      params: { view, page, page_size: pageSize }
    })
    return data
  },

  async respondToReview(reviewId, message) {
    const { data } = await client.post(`/reviews/${reviewId}/response`, { message })
    return data
  },

  async flagReview(reviewId, reason) {
    const { data } = await client.post(`/reviews/${reviewId}/flag`, { reason })
    return data
  },

  async moderationQueue(statusFilter = 'pending', page = 1, pageSize = 20) {
    const { data } = await client.get('/reviews/moderation', {
      params: { status_filter: statusFilter, page, page_size: pageSize }
    })
    return data
  },

  async moderateReview(reviewId, action, reason = '') {
    const { data } = await client.post(`/reviews/${reviewId}/moderate`, { action, reason })
    return data
  },

  async ownerAnalytics(ownerId = null) {
    const params = ownerId ? { owner_id: ownerId } : {}
    const { data } = await client.get('/reviews/analytics/owner', { params })
    return data
  }
}
