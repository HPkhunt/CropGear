import client from './api.js'

export const adminService = {
  async dashboard() {
    const { data } = await client.get('/admin/dashboard')
    return data
  },
  async reports(period = '30d') {
    const { data } = await client.get('/admin/reports', { params: { period } })
    return data
  },
  async approvalQueue({ statusFilter = 'pending', roleFilter = 'all' } = {}) {
    const { data } = await client.get('/admin/users', {
      params: {
        status_filter: statusFilter,
        role_filter: roleFilter
      }
    })
    return Array.isArray(data) ? data : []
  },
  async decideUser(userId, decision) {
    const { data } = await client.post(`/admin/users/${userId}/decision`, { decision })
    return data
  },
  async decideKyc(userId, decision, notes = '') {
    const { data } = await client.post(`/admin/users/${userId}/kyc-decision`, {
      decision,
      notes
    })
    return data
  },
  async equipmentList() {
    const { data } = await client.get('/admin/equipment')
    return Array.isArray(data) ? data : []
  },
  async setEquipmentVisibility(equipmentId, visible) {
    const { data } = await client.post(`/admin/equipment/${equipmentId}/visibility`, { visible })
    return data
  },
  async listNewsletters() {
    const { data } = await client.get('/admin/newsletters')
    return Array.isArray(data) ? data : []
  },
  async deleteNewsletter(email) {
    const { data } = await client.delete(`/admin/newsletters/${encodeURIComponent(email)}`)
    return data
  },
  async listTestimonials() {
    const { data } = await client.get('/admin/testimonials')
    return Array.isArray(data) ? data : []
  }
}
