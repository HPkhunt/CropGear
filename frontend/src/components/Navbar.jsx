import React, { useMemo, useState } from 'react'
import { DoorOpen, Menu } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import useToast from '@/hooks/useToast'
import logo from '../assets/logo.svg'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from '@/components/ui/navigation-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const { addToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoBroken, setLogoBroken] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const isAuthPage = location.pathname.includes('/auth') || location.pathname.includes('-login')

  const navLinks = useMemo(() => {
    const links = [{ to: '/', label: 'Home', isHome: true }]

    if (user?.role === 'farmer') {
      links.push({ to: '/farmer/equipments', label: 'Browse Equipment' })
    } else if (!isAuthenticated) {
      links.push({ to: '/browse-equipment', label: 'Browse Equipment' })
    }

    if (user?.role === 'farmer') {
      links.push({ to: '/farmer/bookings', label: 'My Bookings' })
      links.push({ to: '/farmer/payments', label: 'Payments' })
      links.push({ to: '/farmer/messages', label: 'Messages' })
    }
    if (user?.role === 'equipment_owner') {
      links.push({ to: '/browse-equipment', label: 'Browse Equipment' })
      links.push({ to: '/owner/dashboard', label: 'Owner Dashboard' })
      links.push({ to: '/owner/add-equipment', label: 'Add Equipment' })
      links.push({ to: '/owner/requests', label: 'Requests' })
      links.push({ to: '/owner/messages', label: 'Messages' })
    }
    if (user?.role === 'admin') {
      links.push({ to: '/admin/dashboard', label: 'Dashboard' })
      links.push({ to: '/admin/equipment', label: 'Equipment' })
      links.push({ to: '/admin/messages', label: 'Messages' })
    }

    return links
  }, [isAuthenticated, user?.role])

  const isActiveLink = (link) => {
    if (link.isHome) return location.pathname === '/' && !location.hash
    if (link.hash) return location.pathname === '/' && location.hash === link.hash
    return location.pathname === link.to
  }

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true)
  }

  const onLogout = async () => {
    setShowLogoutConfirm(false)
    setMobileOpen(false)
    await logout()
    addToast('You have been successfully logged out.', 'info')
    navigate('/auth/login')
  }

  const dashboardPath = user?.role === 'admin'
    ? '/admin/dashboard'
    : user?.role === 'equipment_owner'
      ? '/owner/dashboard'
      : '/farmer/dashboard'
  const initials = (user?.full_name || 'CropGear')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')

  return (
    <nav className="sticky top-0 z-50 border-b border-border/80 bg-white backdrop-blur-xl">
      <div className="container flex min-h-[76px] items-center gap-4 py-3">
        <Link to="/" className="inline-flex items-center gap-3 text-lg font-semibold text-slate-950" onClick={() => setMobileOpen(false)}>
          {logoBroken ? (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-100 text-sm font-bold text-primary-800" aria-hidden="true">CG</span>
          ) : (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-primary-100 bg-white shadow-sm">
              <img src={logo} alt="CropGear" width={28} height={28} onError={() => setLogoBroken(true)} />
            </span>
          )}
          <span>CropGear</span>
        </Link>

        <div className="hidden flex-1 items-center justify-center lg:flex">
          <NavigationMenu>
            <NavigationMenuList className="flex flex-wrap items-center justify-center gap-1">
              {navLinks.map((link) => {
                const active = isActiveLink(link)
                return (
                  <NavigationMenuItem key={link.to}>
                    <Link
                      to={link.to}
                      className={cn(
                        buttonVariants({ variant: active ? 'secondary' : 'ghost', size: 'sm' }),
                        'rounded-full px-4 text-sm font-medium transition-all duration-200',
                        active ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-slate-600 hover:text-primary-600 hover:bg-primary-50/50'
                      )}
                    >
                      <NavigationMenuLink active={active} className="bg-transparent p-0 text-inherit hover:bg-transparent">
                        {link.label}
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                )
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-3 rounded-full border border-primary-100 bg-white px-3 py-2 text-left shadow-sm transition hover:border-primary-200 hover:bg-primary-50"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.avatar_url} alt={user?.full_name || 'User'} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden min-w-0 sm:block">
                    <span className="block truncate text-sm font-semibold text-slate-950">{user?.full_name || 'User'}</span>
                    <span className="block truncate text-xs capitalize text-slate-500">{(user?.role || 'member').replace('_', ' ')}</span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <div className="px-2 pb-2">
                  <p className="text-sm font-semibold text-slate-950">{user?.full_name || 'User'}</p>
                  <p className="text-xs capitalize text-slate-500">{(user?.role || 'member').replace('_', ' ')}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate(dashboardPath)}>Open Dashboard</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/account/profile')}>Profile Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 hover:bg-red-50 hover:text-red-700" onSelect={handleLogoutClick}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !isAuthPage && (
            <>
              <Link to="/auth/login" className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'rounded-full')}>Login</Link>
              <Link to="/auth/register" className={cn(buttonVariants({ variant: 'accent', size: 'sm' }), 'rounded-full')}>Register</Link>
            </>
          )}
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="ml-auto rounded-full lg:hidden" aria-label="Toggle navigation">
              <Menu className="h-4 w-4" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="border-0 bg-white">
            <div className="flex h-full flex-col">
              <SheetHeader className="border-b border-border px-6 py-5 text-left">
                <SheetTitle>Navigate CropGear</SheetTitle>
              </SheetHeader>
              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
                <div className="space-y-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        buttonVariants({
                          variant: isActiveLink(link) ? 'secondary' : 'ghost',
                          size: 'md',
                        }),
                        'w-full justify-start rounded-2xl'
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                {isAuthenticated ? (
                  <div className="space-y-3 rounded-3xl border border-primary-100 bg-primary-50/70 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user?.avatar_url} alt={user?.full_name || 'User'} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{user?.full_name || 'User'}</p>
                        <p className="text-xs capitalize text-slate-500">{(user?.role || 'member').replace('_', ' ')}</p>
                      </div>
                    </div>
                    <Link to={dashboardPath} onClick={() => setMobileOpen(false)} className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'w-full rounded-full')}>
                      Open Dashboard
                    </Link>
                    <Link to="/account/profile" onClick={() => setMobileOpen(false)} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full rounded-full')}>
                      Profile Settings
                    </Link>
                    <Button variant="destructive" size="sm" className="w-full rounded-full" onClick={handleLogoutClick}>
                      Logout
                    </Button>
                  </div>
                ) : !isAuthPage ? (
                  <div className="space-y-2">
                    <Link to="/auth/login" onClick={() => setMobileOpen(false)} className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'w-full rounded-full')}>
                      Login
                    </Link>
                    <Link to="/auth/register" onClick={() => setMobileOpen(false)} className={cn(buttonVariants({ variant: 'accent', size: 'sm' }), 'w-full rounded-full')}>
                      Register
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 text-accent-700 sm:mx-0">
              <DoorOpen size={28} strokeWidth={2.2} aria-hidden="true" />
            </div>
            <DialogTitle>Confirm logout</DialogTitle>
            <DialogDescription>You will need to login again to access your account.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>Cancel</Button>
            <Button variant="accent" onClick={onLogout}>Logout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </nav>
  )
}
