import * as React from 'react'
import ReactDOM from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

/* ── Overlay ── */
const DialogOverlay = React.forwardRef(({ className, open, ...props }, ref) => {
  if (!open) return null
  return (
    <div
      ref={ref}
      className={cn(
        'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity',
        className
      )}
      {...props}
    />
  )
})
DialogOverlay.displayName = 'DialogOverlay'

/* ── Root wrapper (manages open state) ── */
function Dialog({ open, onOpenChange, children }) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [open])

  if (!open) return null

  return ReactDOM.createPortal(
    <>
      <DialogOverlay open={open} onClick={() => onOpenChange?.(false)} />
      {children}
    </>,
    document.body
  )
}

/* ── Content panel ── */
const DialogContent = React.forwardRef(
  ({ className, children, onClose, ...props }, ref) => (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      className={cn(
        'fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border bg-background p-6 shadow-xl transition-all',
        className
      )}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
      {onClose && (
        <button
          type="button"
          className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
)
DialogContent.displayName = 'DialogContent'

/* ── Header ── */
const DialogHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

/* ── Footer ── */
const DialogFooter = ({ className, ...props }) => (
  <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />
)
DialogFooter.displayName = 'DialogFooter'

/* ── Title ── */
const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
DialogTitle.displayName = 'DialogTitle'

/* ── Description ── */
const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = 'DialogDescription'

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
