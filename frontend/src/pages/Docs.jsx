import React from 'react'
import { ArrowRight, Layers3, ShieldCheck, Sparkles, Workflow } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero.jsx'
import SmartImage from '../components/SmartImage.jsx'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const deliverySections = [
  {
    title: 'Shipped Product Areas',
    description: 'Core marketplace workflows are already live and connected across the product.',
    points: [
      'Marketplace browsing, saved searches, favorites, and comparison flows',
      'Booking lifecycle, payment gating, chat workspace, and admin booking oversight',
      'Profile settings, media uploads, approval queue, and location-aware discovery'
    ],
    tone: 'success',
    badgeLabel: 'Live',
    icon: ShieldCheck
  },
  {
    title: 'Runtime and Setup Guides',
    description: 'Operational documentation now explains ownership instead of hiding it in local assumptions.',
    points: [
      'Local vs production service ownership is documented in the repo runtime guides',
      'Demo seed behavior and mock database use are now explicit instead of implicit',
      'CI checks README, TODO, runtime-service guidance, and the UI roadmap for drift'
    ],
    tone: 'info',
    badgeLabel: 'Aligned',
    icon: Workflow
  },
  {
    title: 'Active Workstreams',
    description: 'Current frontend migration work now lives in one place and points back to real implementation.',
    points: [
      'Platform hardening and net-new product modules remain in the repo TODO',
      'UI and frontend implementation work is tracked separately in the dedicated roadmap',
      'This page stays descriptive so it supports the roadmap instead of becoming a second backlog'
    ],
    tone: 'warning',
    badgeLabel: 'In Progress',
    icon: Sparkles
  }
]

const docCards = [
  {
    title: 'Browse Marketplace',
    text: 'Jump into the discovery flow that the public migration slices are shaping first.',
    cta: 'Browse equipment',
    to: '/browse-equipment'
  },
  {
    title: 'Approval Queue',
    text: 'Open the main admin approval surface used to manage account access.',
    cta: 'Open approvals',
    to: '/admin/verify-owners'
  },
  {
    title: 'Admin Dashboard',
    text: 'Jump into the live operations workspace for bookings, equipment control, and approvals.',
    cta: 'Open admin dashboard',
    to: '/admin/dashboard'
  }
]

export default function Docs() {
  return (
    <div className="container space-y-6 py-6 sm:space-y-8 sm:py-8">
      <PageHero
        eyebrow="Project Guide"
        title="Implementation status and operating notes"
        subtitle="This page summarizes what CropGear already ships and points teams back to the repo docs and live surfaces that now drive delivery."
        className="portal-admin"
        aside={
          <SmartImage
            src="https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop"
            fallbackSrc="/fields.svg"
            alt="Project documentation"
            className="page-hero-media"
          />
        }
        actions={
          <>
            <Link className={buttonVariants({ variant: 'secondary', size: 'md' })} to="/">
              Back home
            </Link>
            <Link className={buttonVariants({ variant: 'soil', size: 'md' })} to="/browse-equipment">
              Browse live marketplace
            </Link>
          </>
        }
      />

      <Card className="overflow-hidden border-white/70 bg-white/90 shadow-xl shadow-slate-200/60 backdrop-blur">
        <CardContent className="grid gap-0 p-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
          <div className="flex flex-col justify-between gap-6 p-6 sm:p-8">
            <div className="space-y-4">
              <Badge variant="info" className="w-fit">
                Frontend migration status
              </Badge>
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Single source of truth, now reflected in the UI</h2>
                <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  The docs surface now mirrors the roadmap direction: shared primitives are live, page migration is underway, and public-facing routes are being moved off legacy class-driven layouts one slice at a time.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Tailwind foundation live</Badge>
              <Badge variant="info">shadcn primitives active</Badge>
              <Badge variant="warning">Public page migration in progress</Badge>
            </div>
          </div>

          <SmartImage
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1280&auto=format&fit=crop"
            fallbackSrc="/fields.svg"
            alt="Documentation overview"
            loading="lazy"
            className="h-full min-h-[260px] w-full object-cover lg:min-h-[320px]"
          />
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_340px]">
        <div className="grid gap-4 md:grid-cols-2">
          {deliverySections.map((section) => {
            const Icon = section.icon

            return (
              <Card key={section.title} className="border-white/70 bg-white/88 shadow-lg shadow-slate-200/50 backdrop-blur">
                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 shadow-inner shadow-primary-100">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <Badge variant={section.tone}>{section.badgeLabel}</Badge>
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-xl">{section.title}</CardTitle>
                    <CardDescription className="text-sm leading-6">{section.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {section.points.map((point) => (
                    <div key={point} className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-primary-500" aria-hidden="true" />
                      <p className="text-sm leading-6 text-slate-600">{point}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <aside className="space-y-4">
          <Card className="border-white/70 bg-white/88 shadow-lg shadow-slate-200/50 backdrop-blur">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-soil-100 text-soil-700">
                  <Layers3 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle className="text-xl">Quick Routes</CardTitle>
                  <CardDescription>Jump into the live surfaces supporting the roadmap.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {docCards.map((card) => (
                <Link
                  key={card.title}
                  className="group block rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 transition hover:-translate-y-0.5 hover:border-primary-200 hover:bg-white hover:shadow-md"
                  to={card.to}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-slate-950">{card.title}</h3>
                      <p className="text-sm leading-6 text-slate-600">{card.text}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-primary-600" aria-hidden="true" />
                  </div>
                  <span className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4 w-fit')}>{card.cta}</span>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-primary-100 bg-[linear-gradient(180deg,rgba(236,253,245,0.9),rgba(255,255,255,0.96))] shadow-lg shadow-primary-100/60">
            <CardHeader className="space-y-3">
              <Badge variant="success" className="w-fit">
                Working agreement
              </Badge>
              <CardTitle className="text-xl">Use the repo docs for delivery state</CardTitle>
              <CardDescription className="text-sm leading-6">
                The app surfaces should summarize real progress, while implementation status and next steps stay anchored to the roadmap and TODO documents in the repository.
              </CardDescription>
            </CardHeader>
          </Card>
        </aside>
      </section>
    </div>
  )
}
