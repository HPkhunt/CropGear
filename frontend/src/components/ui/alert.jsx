import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { CircleAlert, CircleCheckBig, Info, TriangleAlert } from 'lucide-react'

const alertVariants = cva(
  'relative w-full rounded-xl border p-4 flex gap-3 items-start',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground border-border',
        info: 'bg-blue-50 text-blue-900 border-blue-200',
        success: 'bg-green-50 text-green-900 border-green-200',
        warning: 'bg-accent-50 text-accent-900 border-accent-200',
        error: 'bg-red-50 text-red-900 border-red-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const ALERT_ICONS = {
  default: Info,
  info: Info,
  success: CircleCheckBig,
  warning: TriangleAlert,
  error: CircleAlert,
}

const Alert = React.forwardRef(({ className, variant = 'default', children, ...props }, ref) => {
  const Icon = ALERT_ICONS[variant]
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1">{children}</div>
    </div>
  )
})
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription }
