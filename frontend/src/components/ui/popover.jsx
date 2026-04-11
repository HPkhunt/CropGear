import * as React from 'react'
import { cn } from '@/lib/utils'

const PopoverContext = React.createContext(null)

function Popover({ open: openProp, defaultOpen = false, onOpenChange, className, children }) {
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
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div ref={containerRef} className={cn('relative inline-flex', className)}>
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

const PopoverTrigger = React.forwardRef(({ asChild = false, children, ...props }, ref) => {
  const context = React.useContext(PopoverContext)

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
PopoverTrigger.displayName = 'PopoverTrigger'

const PopoverContent = React.forwardRef(({ className, align = 'center', side = 'bottom', ...props }, ref) => {
  const context = React.useContext(PopoverContext)

  if (!context?.open) return null

  const alignmentClass =
    align === 'end' ? 'right-0' : align === 'start' ? 'left-0' : 'left-1/2 -translate-x-1/2'
  const sideClass = side === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 min-w-[14rem] rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-xl shadow-slate-200/60',
        alignmentClass,
        sideClass,
        className
      )}
      {...props}
    />
  )
})
PopoverContent.displayName = 'PopoverContent'

export { Popover, PopoverContent, PopoverTrigger }
