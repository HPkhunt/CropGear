const DEFAULT_SORT = 'newest'
const DEFAULT_RADIUS_KM = 50
const ALLOWED_SORTS = new Set(['newest', 'rating', 'price_low', 'price_high', 'name'])

const SORT_LABELS = {
  newest: 'Newest',
  rating: 'Top rated',
  price_low: 'Price low-high',
  price_high: 'Price high-low',
  name: 'Name'
}

function normalizePositiveNumber(value) {
  if (value === null || value === undefined || value === '') return ''
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || numericValue <= 0) return ''
  return numericValue
}

function normalizeCoordinate(value, min, max) {
  if (value === null || value === undefined || value === '') return ''
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || numericValue < min || numericValue > max) return ''
  return numericValue
}

function normalizeLocationLabel(value) {
  const cleaned = String(value || '').trim()
  return cleaned || ''
}

export function normalizeSearchHistoryFilters(filters = {}) {
  const rawFilters = filters && typeof filters === 'object' ? filters : {}
  const normalized = {}

  const sort = String(rawFilters.sort || '').trim()
  if (ALLOWED_SORTS.has(sort) && sort !== DEFAULT_SORT) {
    normalized.sort = sort
  }

  if (rawFilters.available_only) normalized.available_only = true
  if (rawFilters.owner_verified_only) normalized.owner_verified_only = true

  const minRate = normalizePositiveNumber(rawFilters.min_rate)
  if (minRate !== '') normalized.min_rate = minRate

  const maxRate = normalizePositiveNumber(rawFilters.max_rate)
  if (maxRate !== '') normalized.max_rate = maxRate

  const minPrice = normalizePositiveNumber(rawFilters.min_price)
  if (minPrice !== '') normalized.min_price = minPrice

  const maxPrice = normalizePositiveNumber(rawFilters.max_price)
  if (maxPrice !== '') normalized.max_price = maxPrice

  const minRating = normalizePositiveNumber(rawFilters.min_rating)
  if (minRating !== '') normalized.min_rating = minRating

  const latitude = normalizeCoordinate(rawFilters.latitude, -90, 90)
  const longitude = normalizeCoordinate(rawFilters.longitude, -180, 180)
  if (latitude !== '' && longitude !== '') {
    normalized.latitude = latitude
    normalized.longitude = longitude
  }

  const radiusKm = normalizePositiveNumber(rawFilters.radius_km)
  if (radiusKm !== '') {
    normalized.radius_km = radiusKm
  } else if (normalized.latitude !== undefined && normalized.longitude !== undefined) {
    normalized.radius_km = DEFAULT_RADIUS_KM
  }

  const locationLabel = normalizeLocationLabel(rawFilters.location_label)
  if (locationLabel) normalized.location_label = locationLabel

  if (Array.isArray(rawFilters.condition_types) && rawFilters.condition_types.length > 0) {
    normalized.condition_types = rawFilters.condition_types
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  }

  if (Array.isArray(rawFilters.features) && rawFilters.features.length > 0) {
    normalized.features = rawFilters.features
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  }

  return normalized
}

export function buildSavedSearchFilters({
  sort = DEFAULT_SORT,
  availableOnly = false,
  verifiedOnly = false,
  minRate = '',
  maxRate = '',
  latitude = '',
  longitude = '',
  radiusKm = '',
  locationLabel = ''
} = {}) {
  return normalizeSearchHistoryFilters({
    sort,
    available_only: availableOnly,
    owner_verified_only: verifiedOnly,
    min_rate: minRate,
    max_rate: maxRate,
    latitude,
    longitude,
    radius_km: radiusKm,
    location_label: locationLabel
  })
}

export function parseBrowseSearchParams(search = '') {
  const params = new URLSearchParams(search)
  const sort = String(params.get('sort') || DEFAULT_SORT)
  const latitude = normalizeCoordinate(params.get('lat'), -90, 90)
  const longitude = normalizeCoordinate(params.get('lng'), -180, 180)
  const radiusKm = normalizePositiveNumber(params.get('radius'))

  return {
    query: params.get('q') || '',
    category: params.get('category') || 'all',
    sort: ALLOWED_SORTS.has(sort) ? sort : DEFAULT_SORT,
    availableOnly: params.get('available') === '1',
    verifiedOnly: params.get('verified') === '1',
    minRate: params.get('minRate') || '',
    maxRate: params.get('maxRate') || '',
    latitude: latitude === '' ? '' : String(latitude),
    longitude: longitude === '' ? '' : String(longitude),
    radiusKm: radiusKm === '' ? '' : String(radiusKm),
    locationLabel: params.get('near') || ''
  }
}

export function buildBrowseSearchParams({
  query = '',
  category = 'all',
  sort = DEFAULT_SORT,
  availableOnly = false,
  verifiedOnly = false,
  minRate = '',
  maxRate = '',
  latitude = '',
  longitude = '',
  radiusKm = '',
  locationLabel = ''
} = {}) {
  const params = new URLSearchParams()

  if (query.trim()) params.set('q', query.trim())
  if (category && category !== 'all') params.set('category', category)
  if (ALLOWED_SORTS.has(sort) && sort !== DEFAULT_SORT) params.set('sort', sort)
  if (availableOnly) params.set('available', '1')
  if (verifiedOnly) params.set('verified', '1')

  const normalizedMinRate = normalizePositiveNumber(minRate)
  if (normalizedMinRate !== '') params.set('minRate', String(normalizedMinRate))

  const normalizedMaxRate = normalizePositiveNumber(maxRate)
  if (normalizedMaxRate !== '') params.set('maxRate', String(normalizedMaxRate))

  const normalizedLatitude = normalizeCoordinate(latitude, -90, 90)
  const normalizedLongitude = normalizeCoordinate(longitude, -180, 180)
  if (normalizedLatitude !== '' && normalizedLongitude !== '') {
    params.set('lat', String(normalizedLatitude))
    params.set('lng', String(normalizedLongitude))
    const normalizedRadius = normalizePositiveNumber(radiusKm)
    params.set('radius', String(normalizedRadius !== '' ? normalizedRadius : DEFAULT_RADIUS_KM))

    const normalizedLabel = normalizeLocationLabel(locationLabel)
    if (normalizedLabel) params.set('near', normalizedLabel)
  }

  return params
}

export function buildSearchHistoryParams(entry = {}) {
  const filters = normalizeSearchHistoryFilters(entry.filters)

  return buildBrowseSearchParams({
    query: entry.query || '',
    category: entry.category || 'all',
    sort: filters.sort || DEFAULT_SORT,
    availableOnly: Boolean(filters.available_only),
    verifiedOnly: Boolean(filters.owner_verified_only),
    minRate: filters.min_rate ?? '',
    maxRate: filters.max_rate ?? '',
    latitude: filters.latitude ?? '',
    longitude: filters.longitude ?? '',
    radiusKm: filters.radius_km ?? '',
    locationLabel: filters.location_label || ''
  })
}

export function hasAdvancedSearchPreset(entry = {}) {
  return Object.keys(normalizeSearchHistoryFilters(entry.filters)).length > 0
}

export function getSavedSearchLabel(entry = {}) {
  const query = String(entry.query || '').trim()
  if (query) return query

  const filters = normalizeSearchHistoryFilters(entry.filters)
  if (filters.location_label) return `Nearby ${filters.location_label}`
  if (filters.latitude !== undefined && filters.longitude !== undefined) return 'Nearby search'
  if (entry.category) return `${entry.category} preset`
  return 'Filtered browse'
}

export function getSavedSearchMeta(entry = {}) {
  const filters = normalizeSearchHistoryFilters(entry.filters)
  const parts = [
    entry.category ? `Category: ${entry.category}` : 'All categories'
  ]

  if (filters.latitude !== undefined && filters.longitude !== undefined) {
    const label = filters.location_label || `${filters.latitude}, ${filters.longitude}`
    parts.push(`Near ${label}`)
    parts.push(`Radius ${filters.radius_km || DEFAULT_RADIUS_KM} km`)
  }

  if (filters.available_only) parts.push('Available only')
  if (filters.owner_verified_only) parts.push('Verified owners')

  const minBudget = filters.min_rate ?? filters.min_price ?? ''
  const maxBudget = filters.max_rate ?? filters.max_price ?? ''
  if (minBudget !== '' || maxBudget !== '') {
    parts.push(`Rate: $${minBudget || 0}-${maxBudget || 'max'}`)
  }

  if (filters.min_rating !== undefined) {
    parts.push(`Rating ${filters.min_rating}+`)
  }

  if (filters.condition_types?.length) {
    parts.push(`${filters.condition_types.length} conditions`)
  }

  if (filters.features?.length) {
    parts.push(`${filters.features.length} features`)
  }

  if (filters.sort) {
    parts.push(`Sort: ${SORT_LABELS[filters.sort] || filters.sort}`)
  }

  return parts
}
