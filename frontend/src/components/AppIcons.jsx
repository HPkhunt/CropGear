import React from 'react'
import {
  BadgeInfo,
  CircleCheckBig,
  CircleX,
  Clock3,
  Droplets,
  FlaskConical,
  Pickaxe,
  Sprout,
  Tractor,
  Wheat
} from 'lucide-react'

const CATEGORY_ICONS = {
  all: Tractor,
  tractor: Tractor,
  harvester: Wheat,
  seeder: Sprout,
  tillage: Pickaxe,
  irrigation: Droplets,
  crop_care: FlaskConical
}

const STATUS_ICONS = {
  confirmed: CircleCheckBig,
  completed: CircleCheckBig,
  approved: CircleCheckBig,
  rejected: CircleX,
  cancelled: CircleX,
  error: CircleX,
  in_progress: BadgeInfo,
  pending: Clock3
}

export function CategoryIcon({ category, ...props }) {
  const Icon = CATEGORY_ICONS[category] || Tractor
  return <Icon aria-hidden="true" {...props} />
}

export function StatusIcon({ status, ...props }) {
  const normalizedStatus = String(status || '').toLowerCase()
  const Icon = STATUS_ICONS[normalizedStatus] || Clock3
  return <Icon aria-hidden="true" {...props} />
}
