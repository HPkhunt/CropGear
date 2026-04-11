import React from 'react'
import { CreditCard, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import SmartImage from '../SmartImage.jsx'

export default function HomeHeroSection({
  heroStats,
  browsePath,
  dashboardPath,
  isAuthenticated,
  liveListingsValue,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  showSuggestions,
  suggestions,
  onSuggestionClick,
  isDemo,
  heroImage
}) {
  return (
    <>
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info" className="gap-1.5">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Verified marketplace
              </Badge>
              {isDemo ? <Badge variant="warning">Demo data</Badge> : null}
            </div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Run the season with faster equipment discovery.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              CropGear helps farmers browse field-ready machines, compare trusted owners, and move into booking without losing time to scattered handoffs.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to={browsePath}
              className={cn(buttonVariants({ variant: 'default', size: 'md' }), 'rounded-full')}
            >
              Browse equipment
            </Link>
            <Link
              to={isAuthenticated ? dashboardPath : '/auth/register'}
              className={cn(buttonVariants({ variant: 'outline', size: 'md' }), 'rounded-full')}
            >
              {isAuthenticated ? 'Open dashboard' : 'List your fleet'}
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
              <ShieldCheck size={16} strokeWidth={2.1} aria-hidden="true" className="text-primary-700" />
              Verified owners
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
              <Search size={16} strokeWidth={2.1} aria-hidden="true" className="text-primary-700" />
              Nearby search
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
              <CreditCard size={16} strokeWidth={2.1} aria-hidden="true" className="text-primary-700" />
              Booking clarity
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {heroStats.map((item, idx) => (
              <Card
                key={item.label}
                className="border-white/70 bg-white/92 shadow-lg shadow-slate-200/60 backdrop-blur"
                style={{ transitionDelay: `${idx * 40}ms` }}
              >
                <CardContent className="space-y-1 p-4">
                  <p className="text-2xl font-semibold text-slate-950">{item.value}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <SmartImage
              src={heroImage}
              fallbackSrc="/hero.svg"
              alt="CropGear equipment marketplace"
              className="h-[280px] w-full rounded-[28px] border border-white/70 object-cover shadow-xl shadow-slate-200/60 sm:h-[340px]"
            />
          </div>

          <Card className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Badge className="w-fit">Spotlight listing</Badge>
                <span className="text-sm font-semibold text-slate-950">$500/day</span>
              </div>
              <CardTitle className="text-xl">Advanced Tractor 5000</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-6 text-slate-600">
                High-demand field prep coverage with a fast-response owner in Iowa City.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">Verified owner</Badge>
                <Badge variant="info">Fast response</Badge>
                <Badge variant="secondary">Iowa City</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)] lg:items-start">
        <Card className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
          <CardHeader className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Marketplace search</p>
            <CardTitle className="text-xl">Search live inventory</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Find verified tractors, harvesters, seeders, and tillage gear without leaving the homepage.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={onSearchSubmit} className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <Input
                    type="text"
                    placeholder="Search tractors, harvesters, seeders..."
                    value={searchQuery}
                    onChange={onSearchChange}
                    className="pl-9"
                  />
                </div>
                <Button type="submit" className="rounded-full">
                  Search
                </Button>
              </div>
            </form>

            {showSuggestions && suggestions.length > 0 ? (
              <div className="grid gap-2">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left transition hover:bg-slate-50"
                    onClick={() => onSuggestionClick(item.id)}
                  >
                    <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                    <p className="text-xs text-slate-600">{item.location || 'Marketplace listing'}</p>
                  </button>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
          <CardHeader className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Marketplace snapshot</p>
            <CardTitle className="text-xl">Live activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3">
              {heroStats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{item.value}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{item.copy}</p>
                </div>
              ))}
            </div>

            {!isDemo ? (
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-950">{liveListingsValue}</span> live inventory synced from marketplace stats.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </>
  )
}
