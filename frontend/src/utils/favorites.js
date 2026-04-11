const FAVORITES_KEY = 'cropgear_favorite_equipment_ids'
export const FAVORITES_STORAGE_EVENT = 'cropgear:favorites-changed'

function readFavorites() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? [...new Set(parsed.map((item) => String(item || '').trim()).filter(Boolean))]
      : []
  } catch {
    return []
  }
}

function writeFavorites(ids) {
  if (typeof window === 'undefined') return []
  const normalized = [...new Set((Array.isArray(ids) ? ids : []).map((item) => String(item || '').trim()).filter(Boolean))]
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent(FAVORITES_STORAGE_EVENT, { detail: { ids: normalized } }))
  return normalized
}

export function getFavoriteEquipmentIds() {
  return readFavorites()
}

export function isFavoriteEquipment(id) {
  return readFavorites().includes(String(id))
}

export function setFavoriteEquipmentIds(ids) {
  return writeFavorites(ids)
}

export function mergeFavoriteEquipmentIds(ids) {
  return writeFavorites([...readFavorites(), ...(Array.isArray(ids) ? ids : [])])
}

export function toggleFavoriteEquipment(id, forceActive = null) {
  const stringId = String(id)
  const ids = readFavorites()
  const nextActive = typeof forceActive === 'boolean' ? forceActive : !ids.includes(stringId)

  if (!nextActive) {
    const next = ids.filter((item) => item !== stringId)
    writeFavorites(next)
    return { active: false, ids: next }
  }

  const next = [...ids, stringId]
  writeFavorites(next)
  return { active: true, ids: next }
}

export function clearFavoriteEquipment() {
  return writeFavorites([])
}
