const FAVORITES_KEY = 'cropgear_favorite_equipment_ids'

function readFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeFavorites(ids) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...new Set(ids)]))
}

export function getFavoriteEquipmentIds() {
  return readFavorites()
}

export function isFavoriteEquipment(id) {
  return readFavorites().includes(String(id))
}

export function toggleFavoriteEquipment(id) {
  const stringId = String(id)
  const ids = readFavorites()
  if (ids.includes(stringId)) {
    const next = ids.filter((item) => item !== stringId)
    writeFavorites(next)
    return { active: false, ids: next }
  }

  const next = [...ids, stringId]
  writeFavorites(next)
  return { active: true, ids: next }
}

export function clearFavoriteEquipment() {
  writeFavorites([])
}
