import client from './api.js'

export const userService = {
  async me() {
    const { data } = await client.get('/users/me')
    return data
  },
  async get(userId) {
    const { data } = await client.get(`/users/${userId}`)
    return data
  },
  async updateMe(payload) {
    const { data } = await client.put('/users/me', payload)
    return data
  },
  async changePassword(payload) {
    const { data } = await client.post('/users/me/password', payload)
    return data
  },
  async getKyc() {
    const { data } = await client.get('/users/me/kyc')
    return data
  },
  async saveKyc(payload) {
    const { data } = await client.put('/users/me/kyc', payload)
    return data
  },
  async favoriteEquipmentIds() {
    const { data } = await client.get('/users/me/favorites')
    return Array.isArray(data?.equipment_ids) ? data.equipment_ids.map((id) => String(id)) : []
  },
  async replaceFavoriteEquipmentIds(equipmentIds = []) {
    const { data } = await client.put('/users/me/favorites', {
      equipment_ids: Array.isArray(equipmentIds) ? equipmentIds : []
    })
    return Array.isArray(data?.equipment_ids) ? data.equipment_ids.map((id) => String(id)) : []
  },
  async toggleFavoriteEquipment(equipmentId, active) {
    const { data } = await client.post(`/users/me/favorites/${equipmentId}`, { active })
    return {
      active: Boolean(data?.active),
      equipmentIds: Array.isArray(data?.equipment_ids) ? data.equipment_ids.map((id) => String(id)) : []
    }
  }
}
