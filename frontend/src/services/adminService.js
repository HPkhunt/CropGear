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
  async ownerVerifications(statusFilter = 'all') {
    const { data } = await client.get('/admin/owners', { params: { status_filter: statusFilter } })
    return Array.isArray(data) ? data : []
  },
  async setOwnerVerificationStatus(ownerId, status) {
    const { data } = await client.post(`/admin/owners/${ownerId}/status`, { status })
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
  async listTestimonials() {
    const { data } = await client.get('/admin/testimonials')
    return Array.isArray(data) ? data : []
  }
}
