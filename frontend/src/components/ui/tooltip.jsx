import * as React from 'react'
import { cn } from '@/lib/utils'

const TooltipContext = React.createContext(null)

function TooltipProvider({ children }) {
  return children
}

function Tooltip({ children }) {
  const [open, setOpen] = React.useState(false)

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-flex">{children}</div>
    </TooltipContext.Provider>
  )
}

const TooltipTrigger = React.forwardRef(({ asChild = false, children, ...props }, _ref) => {
  const context = React.useContext(TooltipContext)

  const triggerProps = {
    ...props,
    onMouseEnter: () => context?.setOpen(true),
    onMouseLeave: () => context?.setOpen(false),
    onFocus: () => context?.setOpen(true),
    onBlur: () => context?.setOpen(false)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...triggerProps,
      onMouseEnter: (event) => {
        children.props.onMouseEnter?.(event)
        triggerProps.onMouseEnter()
      },
      onMouseLeave: (event) => {
        children.props.onMouseLeave?.(event)
        triggerProps.onMouseLeave()
      },
      onFocus: (event) => {
        children.props.onFocus?.(event)
        triggerProps.onFocus()
      },
      onBlur: (event) => {
        children.props.onBlur?.(event)
        triggerProps.onBlur()
      }
    })
  }

  return (
    <button type="button" {...triggerProps}>
      {children}
    </button>
  )
})
TooltipTrigger.displayName = 'TooltipTrigger'

const TooltipContent = React.forwardRef(({ className, side = 'top', ...props }, ref) => {
  const context = React.useContext(TooltipContext)

  if (!context?.open) return null

  return (
    <div
      ref={ref}
      className={cn(
        'absolute left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg',
        side === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
        className
      )}
      {...props}
    />
  )
})
TooltipContent.displayName = 'TooltipContent'

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
