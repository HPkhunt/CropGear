import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from '@/components/ui/navigation-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

function DashboardNavLinks({ links, isActive, onNavigate }) {
  return (
    <NavigationMenu className="w-full">
      <NavigationMenuList className="grid w-full gap-2">
        {links.map((item) => {
          const active = isActive(item.to)
          return (
            <NavigationMenuItem key={item.to} className="w-full">
              <Link
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  buttonVariants({
                    variant: active ? 'secondary' : 'ghost',
                    size: 'md',
                  }),
                  'w-full justify-start rounded-2xl px-4 text-sm',
                  !active && 'border border-transparent hover:border-primary-100 hover:bg-primary-50'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <NavigationMenuLink active={active} className="w-full bg-transparent p-0 text-inherit hover:bg-transparent">
                  {item.label}
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          )
        })}
      </NavigationMenuList>
    </NavigationMenu>
  )
}

export default function DashboardShell({ title, subtitle, links, currentLabel, children }) {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isActive = (to) => location.pathname === to || location.pathname.startsWith(`${to}/`)
  const activeLink = links.find((item) => isActive(item.to)) ?? links[0]
  const resolvedCurrentLabel = currentLabel || activeLink?.label || title

  return (
    <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <Card className="sticky top-24 rounded-[28px] border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
          <CardHeader className="space-y-4">
            <Badge className="w-fit">{title}</Badge>
            <div className="space-y-1">
              <CardTitle className="text-2xl text-slate-950">{subtitle || 'Workspace'}</CardTitle>
              <p className="text-sm leading-6 text-slate-600">Current focus: {resolvedCurrentLabel}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <DashboardNavLinks links={links} isActive={isActive} />
            <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Active section</p>
              <strong className="mt-2 block text-sm text-slate-950">{resolvedCurrentLabel}</strong>
            </div>
          </CardContent>
        </Card>
      </aside>

      <div className="space-y-6">
        <Card className="rounded-[28px] border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur" aria-label={`${title} page context`}>
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Workspace / {title} / {resolvedCurrentLabel}</p>
              <h2 className="text-2xl font-semibold text-slate-950">{resolvedCurrentLabel}</h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Active section</span>
                <strong className="text-sm text-slate-950">{resolvedCurrentLabel}</strong>
              </div>

              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-full lg:hidden" aria-label={`Open ${title} navigation`}>
                    <Menu className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="border-0 bg-white/98">
                  <div className="flex h-full flex-col">
                    <SheetHeader className="border-b border-border px-6 py-5 text-left">
                      <Badge className="w-fit">{title}</Badge>
                      <SheetTitle className="pt-3 text-xl">{subtitle || 'Workspace'}</SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-6">
                      <DashboardNavLinks links={links} isActive={isActive} onNavigate={() => setMobileOpen(false)} />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </CardContent>
        </Card>

        {children}
      </div>
    </section>
  )
}
