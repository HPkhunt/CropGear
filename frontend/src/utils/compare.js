const COMPARE_KEY = 'cropgear_compare_equipment_ids'
const MAX_COMPARE_ITEMS = 5

function normalizeCompareIds(ids) {
  const nextIds = Array.isArray(ids) ? ids : []
  return [...new Set(
    nextIds
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  )].slice(0, MAX_COMPARE_ITEMS)
}

function readCompareIds() {
  try {
    const raw = localStorage.getItem(COMPARE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return normalizeCompareIds(parsed)
  } catch {
    return []
  }
}

function writeCompareIds(ids) {
  localStorage.setItem(COMPARE_KEY, JSON.stringify(normalizeCompareIds(ids)))
}

export function getComparedEquipmentIds() {
  return readCompareIds()
}

export function isComparedEquipment(id) {
  return readCompareIds().includes(String(id))
}

export function parseComparedEquipmentIds(value) {
  if (!value) return []
  return normalizeCompareIds(String(value).split(','))
}

export function setComparedEquipmentIds(ids) {
  const nextIds = normalizeCompareIds(ids)
  writeCompareIds(nextIds)
  return nextIds
}

export function toggleComparedEquipment(id) {
  const stringId = String(id)
  const ids = readCompareIds()

  if (ids.includes(stringId)) {
    const nextIds = ids.filter((item) => item !== stringId)
    writeCompareIds(nextIds)
    return { active: false, ids: nextIds }
  }

  if (ids.length >= MAX_COMPARE_ITEMS) {
    return {
      active: false,
      ids,
      error: `You can compare up to ${MAX_COMPARE_ITEMS} listings at once.`
    }
  }

  const nextIds = [...ids, stringId]
  writeCompareIds(nextIds)
  return { active: true, ids: nextIds }
}

export function clearComparedEquipment() {
  writeCompareIds([])
}

export function buildComparePath(ids = []) {
  const nextIds = normalizeCompareIds(ids)
  return nextIds.length ? `/compare?ids=${nextIds.join(',')}` : '/compare'
}
