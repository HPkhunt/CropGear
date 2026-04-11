import * as React from 'react'
import { cn } from '@/lib/utils'

const NavigationMenu = React.forwardRef(({ className, ...props }, ref) => (
  <nav ref={ref} className={cn('flex items-center gap-2', className)} {...props} />
))
NavigationMenu.displayName = 'NavigationMenu'

const NavigationMenuList = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-wrap items-center gap-2', className)} {...props} />
))
NavigationMenuList.displayName = 'NavigationMenuList'

const NavigationMenuItem = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center', className)} {...props} />
))
NavigationMenuItem.displayName = 'NavigationMenuItem'

const NavigationMenuLink = React.forwardRef(({ className, active = false, ...props }, ref) => (
  <div
    ref={ref}
    data-active={active}
    className={cn(
      'rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-primary-50 hover:text-primary-800 data-[active=true]:bg-primary-100 data-[active=true]:text-primary-800',
      className
    )}
    {...props}
  />
))
NavigationMenuLink.displayName = 'NavigationMenuLink'

export { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList }
