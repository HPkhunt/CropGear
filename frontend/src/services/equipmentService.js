import client from './api.js'
import { mediaService } from './mediaService.js'

export const equipmentService = {
  async list(params = {}) {
    const { data } = await client.get('/equipment', { params })
    return Array.isArray(data) ? data : []
  },
  async browse(params = {}, options = {}) {
    const { data } = await client.get('/equipment/browse', { params, ...options })
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        pageSize: data.length || 12,
        totalPages: 1
      }
    }
    if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
      throw new Error('Invalid browse payload')
    }
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      total: Number(data?.total || 0),
      page: Number(data?.page || 1),
      pageSize: Number(data?.page_size || 12),
      totalPages: Number(data?.total_pages || 1)
    }
  },
  async mine() {
    const { data } = await client.get('/equipment/mine')
    return Array.isArray(data) ? data : []
  },
  async create(payload) {
    const body = {
      ...payload,
      daily_rate: Number(payload.daily_rate ?? payload.dailyRate ?? 0)
    }
    const { data } = await client.post('/equipment', body)
    return data
  },
  async uploadImage(file) {
    return mediaService.uploadEquipmentImage(file)
  },
  async get(id) {
    const { data } = await client.get(`/equipment/${id}`)
    return data
  },
  async remove(id) {
    const { data } = await client.delete(`/equipment/${id}`)
    return data
  },
  async search(q) {
    const { data } = await client.get('/equipment', { params: { q } })
    return Array.isArray(data) ? data : []
  }
}
