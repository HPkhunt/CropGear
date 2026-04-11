import client from './api.js'

export const miscService = {
  async getStats() {
    const { data } = await client.get('/stats')
    return data
  },
  async getTestimonials() {
    const { data } = await client.get('/testimonials')
    return Array.isArray(data) ? data : []
  },
  async subscribeNewsletter(email) {
    const { data } = await client.post('/newsletter', { email })
    return data
  }
}
