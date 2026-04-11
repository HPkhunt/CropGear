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
  async predictPricing({ category, location = '', currentRate = 0 }) {
    const { data } = await client.post('/equipment/pricing/predict', {
      category,
      location,
      current_rate: Number(currentRate || 0)
    })
    return data
  },
  async uploadImage(file) {
    return mediaService.uploadEquipmentImage(file)
  },
  async get(id) {
    const { data } = await client.get(`/equipment/${id}`)
    return data
  },
  async compare(equipmentIds) {
    const { data } = await client.post('/equipment/compare', {
      equipment_ids: Array.isArray(equipmentIds) ? equipmentIds : []
    })
    return data
  },
  async searchHistory(limit = 8) {
    const { data } = await client.get('/equipment/search/history', {
      params: { limit }
    })
    return Array.isArray(data?.history) ? data.history : []
  },
  async saveSearchHistory({ query = '', category = '', resultsCount = 0, filters = {} }) {
    const { data } = await client.post('/equipment/search/history', {
      query,
      category: category && category !== 'all' ? category : null,
      results_count: resultsCount,
      filters
    })
    return data
  },
  async locationSearch({
    query = '',
    category = '',
    latitude,
    longitude,
    radiusKm = 50,
    minPrice = 0,
    maxPrice = 100000,
    availableOnly = false,
    verifiedOnly = false
  }) {
    const { data } = await client.post('/equipment/search/location', {
      query,
      category: category && category !== 'all' ? category : null,
      location: {
        latitude: Number(latitude),
        longitude: Number(longitude),
        radius_km: Number(radiusKm || 50)
      },
      min_price: Number(minPrice || 0),
      max_price: Number(maxPrice || 100000),
      available_only: Boolean(availableOnly),
      owner_verified_only: Boolean(verifiedOnly)
    })

    return {
      items: Array.isArray(data?.items) ? data.items : [],
      count: Number(data?.count || 0),
      center: data?.center || null,
      radiusKm: Number(data?.radius_km || radiusKm || 50)
    }
  },
  async remove(id) {
    const { data } = await client.delete(`/equipment/${id}`)
    return data
  },
  async search(filters = {}, options = {}) {
    const normalized = typeof filters === 'string' ? { query: filters } : { ...filters }
    const page = Number(options.page ?? normalized.page ?? 1)
    const pageSize = Number(options.pageSize ?? normalized.page_size ?? normalized.pageSize ?? 100)
    const payload = {
      query: normalized.query ?? normalized.q ?? '',
      category: normalized.category && normalized.category !== 'all' ? normalized.category : null,
      min_price: Number(normalized.min_price ?? normalized.minPrice ?? 0),
      max_price: Number(normalized.max_price ?? normalized.maxPrice ?? 100000),
      min_condition: Number(normalized.min_condition ?? normalized.minCondition ?? 1),
      min_rating: Number(normalized.min_rating ?? normalized.minRating ?? 0),
      available_only: normalized.available_only ?? normalized.availableOnly ?? false,
      condition_types: Array.isArray(normalized.condition_types ?? normalized.conditionTypes)
        ? (normalized.condition_types ?? normalized.conditionTypes)
        : ['excellent', 'good', 'fair'],
      features: Array.isArray(normalized.features) ? normalized.features : []
    }
    const { data } = await client.post('/equipment/search/advanced', payload, {
      params: {
        page,
        page_size: pageSize
      }
    })
    return Array.isArray(data?.items) ? data.items : []
  }
}
