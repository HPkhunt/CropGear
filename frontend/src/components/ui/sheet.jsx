import * as React from 'react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const SheetContext = React.createContext(null)

function Sheet({ open: openProp, defaultOpen = false, onOpenChange, children }) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
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

  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  )
}

const SheetTrigger = React.forwardRef(({ asChild = false, children, ...props }, ref) => {
  const context = React.useContext(SheetContext)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: (event) => {
        children.props.onClick?.(event)
        context?.setOpen(true)
      }
    })
  }

  return (
    <button ref={ref} type="button" onClick={() => context?.setOpen(true)} {...props}>
      {children}
    </button>
  )
})
SheetTrigger.displayName = 'SheetTrigger'

const SheetContent = React.forwardRef(({ className, side = 'right', children, ...props }, ref) => {
  const context = React.useContext(SheetContext)

  const sideClass =
    side === 'left'
      ? 'left-0 top-0 h-full max-w-sm translate-x-0 translate-y-0 rounded-none rounded-r-3xl'
      : 'right-0 top-0 h-full max-w-sm translate-x-0 translate-y-0 rounded-none rounded-l-3xl'

  return (
    <Dialog open={context?.open} onOpenChange={context?.setOpen}>
      <DialogContent
        ref={ref}
        onClose={() => context?.setOpen(false)}
        className={cn('w-[calc(100%-1.5rem)] p-0 sm:w-full', sideClass, className)}
        {...props}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
})
SheetContent.displayName = 'SheetContent'

const SheetHeader = DialogHeader
const SheetFooter = DialogFooter
const SheetTitle = DialogTitle
const SheetDescription = DialogDescription

export { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger }
