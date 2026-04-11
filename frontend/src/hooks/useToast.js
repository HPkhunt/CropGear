import { useCallback } from 'react'
import { toast as sonnerToast } from 'sonner'

const TOAST_DURATION = 5000

const TOAST_METHODS = {
  success: (message, options) => sonnerToast.success(message, options),
  error: (message, options) => sonnerToast.error(message, options),
  warning: (message, options) => sonnerToast.warning?.(message, options) ?? sonnerToast(message, options),
  info: (message, options) => sonnerToast(message, options),
}

export default function useToast() {
  const addToast = useCallback((message, type = 'info') => {
    const content = String(message || '').trim()

    if (!content) return

    const normalizedType = String(type || 'info').toLowerCase()
    const showToast = TOAST_METHODS[normalizedType] || TOAST_METHODS.info

    showToast(content, {
      duration: TOAST_DURATION,
    })
  }, [])

  return { addToast }
}
