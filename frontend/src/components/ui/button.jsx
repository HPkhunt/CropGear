import * as React from 'react'
import { cva } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 cursor-pointer disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md hover:from-primary-700 hover:to-primary-600 hover:shadow-lg active:shadow-sm',
        default:
          'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md hover:from-primary-700 hover:to-primary-600 hover:shadow-lg active:shadow-sm',
        secondary:
          'bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 hover:border-primary-300',
        outline:
          'border-2 border-primary-500 text-primary-700 bg-transparent hover:bg-primary-50',
        soil:
          'bg-soil-100 text-soil-800 border border-soil-200 hover:bg-soil-200 hover:border-soil-300',
        accent:
          'bg-gradient-to-r from-accent-500 to-accent-400 text-white shadow-md hover:from-accent-600 hover:to-accent-500 hover:shadow-lg',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-red-600 shadow-md',
        ghost:
          'text-primary-700 hover:bg-primary-50 hover:text-primary-800',
        link:
          'text-primary-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-md',
        md: 'h-10 px-5 text-sm rounded-lg',
        lg: 'h-12 px-8 text-base rounded-lg',
        icon: 'h-10 w-10 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

const Button = React.forwardRef(
  ({ className, variant, size, loading = false, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
