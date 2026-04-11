import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes without conflicts.
 * Used by all shadcn/ui components.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
