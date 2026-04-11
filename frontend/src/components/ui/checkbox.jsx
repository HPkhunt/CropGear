import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const Checkbox = React.forwardRef(
  ({ className, checked = false, disabled = false, label, children, onCheckedChange, onChange, ...props }, ref) => {
    const inputId = React.useId()

    const handleChange = (event) => {
      onCheckedChange?.(event.target.checked)
      onChange?.(event)
    }

    return (
      <label
        htmlFor={inputId}
        className={cn(
          'inline-flex items-center gap-3 text-sm text-foreground',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          className
        )}
      >
        <span className="relative inline-flex h-5 w-5 items-center justify-center">
          <input
            id={inputId}
            ref={ref}
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            disabled={disabled}
            onChange={handleChange}
            {...props}
          />
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border-2 border-input bg-background transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/30 peer-checked:border-primary-600 peer-checked:bg-primary-600">
            <Check className="h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100" aria-hidden="true" />
          </span>
        </span>
        <span>{children ?? label ?? props['aria-label']}</span>
      </label>
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
