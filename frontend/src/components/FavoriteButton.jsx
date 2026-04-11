import React, { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import useAuth from '../hooks/useAuth.js'
import useToast from '@/hooks/useToast'
import { userService } from '../services/userService.js'
import {
  FAVORITES_STORAGE_EVENT,
  isFavoriteEquipment,
  setFavoriteEquipmentIds,
  toggleFavoriteEquipment
} from '../utils/favorites.js'
import { getErrorMessage } from '../utils/helpers.js'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export default function FavoriteButton({ equipmentId, onFavoriteChange }) {
  const { isAuthenticated } = useAuth()
  const { addToast } = useToast()
  const [isFavorite, setIsFavorite] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const syncFromStorage = () => {
      setIsFavorite(isFavoriteEquipment(equipmentId))
    }

    syncFromStorage()
    if (typeof window === 'undefined') return undefined

    window.addEventListener(FAVORITES_STORAGE_EVENT, syncFromStorage)
    return () => {
      window.removeEventListener(FAVORITES_STORAGE_EVENT, syncFromStorage)
    }
  }, [equipmentId])

  const handleToggle = async () => {
    if (saving) return

    try {
      setSaving(true)
      let nextIds = []
      let nextActive = false

      if (isAuthenticated) {
        const result = await userService.toggleFavoriteEquipment(equipmentId, !isFavorite)
        nextActive = result.active
        nextIds = setFavoriteEquipmentIds(result.equipmentIds)
      } else {
        const result = toggleFavoriteEquipment(equipmentId)
        nextActive = result.active
        nextIds = result.ids
      }

      setIsFavorite(nextActive)
      onFavoriteChange?.(nextIds)
    } catch (error) {
      addToast(getErrorMessage(error, 'Unable to update favorites right now.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      type="button"
      className={cn(
        buttonVariants({
          variant: isFavorite ? 'accent' : 'outline',
          size: 'sm',
        }),
        'absolute right-3 top-3 z-20 h-10 rounded-full border-white/80 bg-white/90 px-3 text-slate-700 shadow-lg shadow-slate-950/10 backdrop-blur',
        isFavorite && 'border-accent-300 text-accent-800'
      )}
      onClick={handleToggle}
      aria-pressed={isFavorite}
      aria-busy={saving}
      disabled={saving}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star
        className="favorite-icon"
        size={16}
        strokeWidth={1.9}
        fill={isFavorite ? 'currentColor' : 'none'}
        aria-hidden="true"
      />
      <span>{saving ? 'Saving...' : isFavorite ? 'Saved' : 'Save'}</span>
    </button>
  )
}
