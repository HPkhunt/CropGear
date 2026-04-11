import * as React from 'react'
import { cn } from '@/lib/utils'

const AvatarContext = React.createContext({ broken: false, setBroken: () => undefined })

const Avatar = React.forwardRef(({ className, ...props }, ref) => {
  const [broken, setBroken] = React.useState(false)

  return (
    <AvatarContext.Provider value={{ broken, setBroken }}>
      <span
        ref={ref}
        className={cn('relative inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-primary-100 bg-primary-50', className)}
        {...props}
      />
    </AvatarContext.Provider>
  )
})
Avatar.displayName = 'Avatar'

const AvatarImage = React.forwardRef(({ className, ...props }, ref) => {
  const { broken, setBroken } = React.useContext(AvatarContext)

  if (broken) return null

  return (
    <img
      ref={ref}
      className={cn('h-full w-full object-cover', className)}
      onError={() => setBroken(true)}
      {...props}
    />
  )
})
AvatarImage.displayName = 'AvatarImage'

const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => {
  const { broken } = React.useContext(AvatarContext)

  if (!broken) return null

  return (
    <span
      ref={ref}
      className={cn('flex h-full w-full items-center justify-center bg-primary-100 text-sm font-semibold uppercase text-primary-800', className)}
      {...props}
    />
  )
})
AvatarFallback.displayName = 'AvatarFallback'

export { Avatar, AvatarFallback, AvatarImage }
