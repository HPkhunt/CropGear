import * as React from 'react'
import { cn } from '@/lib/utils'

const TabsContext = React.createContext(null)

function Tabs({ value, defaultValue, onValueChange, className, children, ...props }) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? '')
  const currentValue = value ?? internalValue

  const setValue = React.useCallback(
    (nextValue) => {
      if (value === undefined) {
        setInternalValue(nextValue)
      }
      onValueChange?.(nextValue)
    },
    [onValueChange, value]
  )

  return (
    <TabsContext.Provider value={{ value: currentValue, setValue }}>
      <div className={cn('space-y-4', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('inline-flex w-full flex-wrap rounded-2xl border border-primary-100 bg-primary-50/80 p-1', className)}
    {...props}
  />
))
TabsList.displayName = 'TabsList'

const TabsTrigger = React.forwardRef(({ className, value, ...props }, ref) => {
  const context = React.useContext(TabsContext)
  const isActive = context?.value === value

  return (
    <button
      ref={ref}
      type="button"
      data-state={isActive ? 'active' : 'inactive'}
      className={cn(
        'inline-flex flex-1 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:text-primary-700 data-[state=active]:bg-white data-[state=active]:text-primary-800 data-[state=active]:shadow-sm',
        className
      )}
      onClick={() => context?.setValue(value)}
      {...props}
    />
  )
})
TabsTrigger.displayName = 'TabsTrigger'

const TabsContent = React.forwardRef(({ className, value, ...props }, ref) => {
  const context = React.useContext(TabsContext)

  if (context?.value !== value) return null

  return <div ref={ref} className={cn('outline-none', className)} {...props} />
})
TabsContent.displayName = 'TabsContent'

export { Tabs, TabsContent, TabsList, TabsTrigger }
