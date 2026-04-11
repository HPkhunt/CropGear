import tractorImg from '../assets/images/category_tractor_1772246270519.png';
import harvesterImg from '../assets/images/category_harvester_1772246289195.png';
import seederImg from '../assets/images/category_seeder_1772246342425.png';
import tillageImg from '../assets/images/category_plough_1772246305462.png';
import irrigationImg from '../assets/images/equip_rotavator_1772246357421.png';
import cropCareImg from '../assets/images/cta_bg_1772246513626.png';
import defaultImg from '../assets/images/hero_banner_1772246252951.png';

const CATEGORY_IMAGES = {
  tractor: tractorImg,
  harvester: harvesterImg,
  seeder: seederImg,
  tillage: tillageImg,
  irrigation: irrigationImg,
  crop_care: cropCareImg,
  default: defaultImg
}

// Accept a variety of spellings/plurals from the UI or API
const CATEGORY_ALIASES = {
  tractors: 'tractor',
  tractor: 'tractor',
  harvesters: 'harvester',
  harvester: 'harvester',
  seeders: 'seeder',
  seeder: 'seeder',
  tillage: 'tillage',
  plough: 'tillage',
  plow: 'tillage',
  rotavator: 'irrigation',
  irrigation: 'irrigation',
  irrigations: 'irrigation',
  'crop care': 'crop_care',
  cropcare: 'crop_care',
  crop_care: 'crop_care'
}

const normalizeCategory = (raw) => {
  if (!raw) return 'default'
  const key = String(raw).trim().toLowerCase().replace(/[-]/g, ' ')
  if (CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key]
  if (CATEGORY_IMAGES[key]) return key
  return 'default'
}

export function getEquipmentImage(equipment) {
  if (equipment?.image_url) return equipment.image_url
  const normalized = normalizeCategory(equipment?.category)
  return CATEGORY_IMAGES[normalized] || CATEGORY_IMAGES.default
}

export function getCategoryImage(category = 'default') {
  const normalized = normalizeCategory(category)
  return CATEGORY_IMAGES[normalized] || CATEGORY_IMAGES.default
}

export const FEATURE_IMAGES = {
  dashboard: harvesterImg,
  reports: tractorImg,
  docs: cropCareImg
}
