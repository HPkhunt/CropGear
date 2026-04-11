import React, { useState } from 'react'
import { CalendarDays, MapPin, Palette, Shapes, Tractor, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero.jsx'
import SmartImage from '../components/SmartImage.jsx'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const paletteGroups = [
  {
    title: 'Primary',
    chips: [
      { label: '500', className: 'bg-primary-500' },
      { label: '600', className: 'bg-primary-600' },
      { label: '700', className: 'bg-primary-700' },
      { label: '800', className: 'bg-primary-800' }
    ]
  },
  {
    title: 'Accent',
    chips: [
      { label: '400', className: 'bg-accent-400' },
      { label: '500', className: 'bg-accent-500' },
      { label: '600', className: 'bg-accent-600' },
      { label: '700', className: 'bg-accent-700' }
    ]
  },
  {
    title: 'Soil',
    chips: [
      { label: '200', className: 'bg-soil-200' },
      { label: '400', className: 'bg-soil-400' },
      { label: '600', className: 'bg-soil-600' },
      { label: '800', className: 'bg-soil-800' }
    ]
  }
]

export default function StyleGuide() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="container space-y-6 py-6 sm:space-y-8 sm:py-8">
      <PageHero
        eyebrow="Design System"
        title="CropGear visual language and reusable patterns"
        subtitle="Reference the shared primitives, interaction states, and page-building blocks guiding the UI migration."
        className="portal-secondary"
        aside={
          <SmartImage
            src="https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop"
            fallbackSrc="/hero.svg"
            alt="Design system preview"
            className="page-hero-media"
          />
        }
        actions={
          <>
            <Link className={buttonVariants({ variant: 'secondary', size: 'md' })} to="/docs">
              Open docs hub
            </Link>
            <Link className={buttonVariants({ variant: 'outline', size: 'md' })} to="/browse-equipment">
              Browse live marketplace
            </Link>
          </>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.06fr)_360px]">
        <div className="space-y-6">
          <Card className="border-white/70 bg-white/90 shadow-xl shadow-slate-200/60 backdrop-blur">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                    <Shapes className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <CardTitle>Buttons</CardTitle>
                    <CardDescription>Primary actions, supporting actions, and utility interactions.</CardDescription>
                  </div>
                </div>
                <Badge variant="info">Interactive</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-3">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="soil">Soil</Button>
                <Button variant="accent">Accent</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
              <Separator />
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button disabled>Disabled</Button>
                <Button loading>Loading</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/90 shadow-xl shadow-slate-200/60 backdrop-blur">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Status badges and alerts</CardTitle>
                  <CardDescription>Reusable status language for inventory, booking flow, and admin review states.</CardDescription>
                </div>
                <Badge variant="success">Shared feedback</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="success">Available</Badge>
                <Badge variant="warning">Pending</Badge>
                <Badge variant="error">Rejected</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
              <div className="space-y-3">
                <Alert variant="success">
                  <AlertTitle>Booking confirmed</AlertTitle>
                  <AlertDescription>Your equipment rental has been approved by the owner.</AlertDescription>
                </Alert>
                <Alert variant="warning">
                  <AlertTitle>Verification pending</AlertTitle>
                  <AlertDescription>Your owner account is awaiting admin review.</AlertDescription>
                </Alert>
                <Alert variant="error">
                  <AlertTitle>Payment failed</AlertTitle>
                  <AlertDescription>Please update your payment method and try again.</AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/90 shadow-xl shadow-slate-200/60 backdrop-blur">
            <CardHeader>
              <CardTitle>Form controls</CardTitle>
              <CardDescription>Inputs, labels, and textareas used across booking and listing workflows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label required>Equipment Name</Label>
                  <Input placeholder="Case IH Magnum 340" defaultValue="Case IH Magnum 340" />
                </div>
                <div className="space-y-2">
                  <Label>Daily Rate</Label>
                  <Input type="number" placeholder="420" defaultValue="420" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the equipment..."
                  defaultValue="High-horsepower tractor with precision guidance package and verified service history."
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button>Submit</Button>
                <Button variant="outline">Cancel</Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-white/70 bg-white/90 shadow-xl shadow-slate-200/60 backdrop-blur">
              <CardHeader>
                <CardTitle>Loading states</CardTitle>
                <CardDescription>Skeleton placeholders for cards, lists, and detail panels.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-4 pt-2">
                  <Skeleton className="h-24 w-24 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-8 w-28 rounded-lg" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/70 bg-white/90 shadow-xl shadow-slate-200/60 backdrop-blur">
              <CardHeader>
                <CardTitle>Dialog</CardTitle>
                <CardDescription>Confirmation and form overlays using the shared dialog primitive.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-slate-600">
                  Use dialogs for short, focused decisions such as booking confirmation, moderation actions, and quick-edit flows.
                </p>
                <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogContent onClose={() => setDialogOpen(false)}>
                    <DialogHeader>
                      <DialogTitle>Confirm booking</DialogTitle>
                      <DialogDescription>
                        You are about to reserve John Deere 7R 310 for five days at USD 420 per day.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      <div className="space-y-2">
                        <Label>Additional Notes</Label>
                        <Textarea placeholder="Any special requirements..." />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                      <Button onClick={() => setDialogOpen(false)}>Confirm booking</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </div>

        <aside className="space-y-6">
          <Card className="overflow-hidden border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
            <div className="relative">
              <SmartImage
                src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1280&auto=format&fit=crop"
                fallbackSrc="/tractor.svg"
                alt="Equipment listing preview"
                className="h-44 w-full object-cover"
              />
              <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3">
                <Badge variant="success">Available</Badge>
                <Badge className="border-white/70 bg-white/90 text-slate-900">4.8 rating</Badge>
              </div>
            </div>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Listing preview</p>
                <h3 className="text-xl font-semibold text-slate-950">John Deere 7R 310</h3>
                <p className="text-sm leading-6 text-slate-600">Precision-ready tractor card built from the same primitives used throughout the migration.</p>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  Fresno, CA
                </span>
                <span className="font-semibold text-slate-950">USD 420 / day</span>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1">Book now</Button>
                <Button variant="outline" className="flex-1">Compare</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-50 text-accent-700">
                  <WalletCards className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Booking status preview</CardTitle>
                  <CardDescription>Compact state card for booking lifecycle communication.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Booking</p>
                  <h3 className="text-lg font-semibold text-slate-950">Great Plains Seeder Drill</h3>
                </div>
                <Badge variant="warning">Pending</Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    Start
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">March 10, 2026</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    End
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">March 14, 2026</p>
                </div>
              </div>

              <div className="rounded-2xl border border-primary-100 bg-primary-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Estimated total</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">USD 1,280</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-soil-100 text-soil-700">
                  <Palette className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Theme palette</CardTitle>
                  <CardDescription>Core colors guiding public surfaces, dashboards, and feedback states.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {paletteGroups.map((group) => (
                <div key={group.title} className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{group.title}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {group.chips.map((chip) => (
                      <div key={chip.label} className="space-y-2">
                        <div className={cn('h-12 rounded-xl border border-slate-200/70 shadow-sm', chip.className)} />
                        <p className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">{chip.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-primary-100 bg-[linear-gradient(180deg,rgba(239,246,255,0.92),rgba(255,255,255,0.98))] shadow-lg shadow-sky-100/50">
            <CardHeader className="space-y-3">
              <Badge variant="info" className="w-fit">
                Migration note
              </Badge>
              <CardTitle className="inline-flex items-center gap-2 text-xl">
                <Tractor className="h-5 w-5 text-primary-700" aria-hidden="true" />
                Build new pages from primitives first
              </CardTitle>
              <CardDescription className="text-sm leading-6">
                Use these cards, badges, alerts, and form controls as the baseline for page migrations before layering business-specific UI on top.
              </CardDescription>
            </CardHeader>
          </Card>
        </aside>
      </section>
    </div>
  )
}
