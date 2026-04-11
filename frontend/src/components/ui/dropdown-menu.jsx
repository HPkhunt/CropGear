import * as React from 'react'
import { cn } from '@/lib/utils'

const DropdownMenuContext = React.createContext(null)

function DropdownMenu({ open: openProp, defaultOpen = false, onOpenChange, children }) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  const containerRef = React.useRef(null)
  const open = openProp ?? internalOpen

  const setOpen = React.useCallback(
    (nextValue) => {
      if (openProp === undefined) {
        setInternalOpen(nextValue)
      }
      onOpenChange?.(nextValue)
    },
    [onOpenChange, openProp]
  )

  React.useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, setOpen])

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div ref={containerRef} className="relative inline-flex">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

const DropdownMenuTrigger = React.forwardRef(({ asChild = false, children, ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: (event) => {
        children.props.onClick?.(event)
        context?.setOpen(!context.open)
      }
    })
  }

  return (
    <button ref={ref} type="button" onClick={() => context?.setOpen(!context.open)} {...props}>
      {children}
    </button>
  )
})
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger'

const DropdownMenuContent = React.forwardRef(({ className, align = 'end', ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext)

  if (!context?.open) return null

  return (
    <div
      ref={ref}
      className={cn(
        'absolute top-full z-50 mt-3 min-w-[14rem] rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-xl shadow-slate-200/60',
        align === 'start' ? 'left-0' : 'right-0',
        className
      )}
      {...props}
    />
  )
})
DropdownMenuContent.displayName = 'DropdownMenuContent'

const DropdownMenuLabel = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground', className)} {...props} />
))
DropdownMenuLabel.displayName = 'DropdownMenuLabel'

const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('my-2 h-px bg-border', className)} {...props} />
))
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

const DropdownMenuItem = React.forwardRef(({ className, inset = false, onSelect, ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext)

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-primary-50',
        inset && 'pl-8',
        className
      )}
      onClick={() => {
        onSelect?.()
        context?.setOpen(false)
      }}
      {...props}
    />
  )
})
DropdownMenuItem.displayName = 'DropdownMenuItem'

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
}
