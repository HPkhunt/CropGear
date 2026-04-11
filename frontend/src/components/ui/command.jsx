import * as React from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const Command = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-background', className)}
    {...props}
  />
))
Command.displayName = 'Command'

const CommandInput = React.forwardRef(({ className, icon = true, ...props }, ref) => (
  <div className="flex items-center gap-2 border-b border-border px-3">
    {icon && <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
    <input
      ref={ref}
      className={cn('flex h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground', className)}
      {...props}
    />
  </div>
))
CommandInput.displayName = 'CommandInput'

const CommandList = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('max-h-72 overflow-y-auto p-2', className)} {...props} />
))
CommandList.displayName = 'CommandList'

const CommandEmpty = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-3 py-6 text-center text-sm text-muted-foreground', className)} {...props} />
))
CommandEmpty.displayName = 'CommandEmpty'

const CommandGroup = React.forwardRef(({ className, heading, children, ...props }, ref) => (
  <div ref={ref} className={cn('space-y-2', className)} {...props}>
    {heading ? <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{heading}</p> : null}
    <div className="space-y-1">{children}</div>
  </div>
))
CommandGroup.displayName = 'CommandGroup'

const CommandItem = React.forwardRef(({ className, onSelect, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn('flex w-full items-start rounded-xl px-3 py-2 text-left text-sm text-foreground transition hover:bg-primary-50', className)}
    onClick={() => onSelect?.()}
    {...props}
  />
))
CommandItem.displayName = 'CommandItem'

export { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList }
