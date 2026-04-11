import React from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero.jsx'
import SmartImage from '../components/SmartImage.jsx'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function NotFound() {
  return (
    <div className="container mx-auto space-y-8 py-6 sm:py-8">
      <PageHero
        eyebrow="Lost Route"
        title="This field path no longer exists"
        subtitle="The link may have changed, or the page is unavailable."
        className="portal-admin"
        aside={
          <SmartImage
            src="https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop"
            fallbackSrc="/hero.svg"
            alt="Open field"
            className="page-hero-media"
          />
        }
        actions={(
          <Link to="/" className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'rounded-full')}>
            Back to home
          </Link>
        )}
      />

      <Card className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-slate-950">Try one of these</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/auth/login"
              className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'rounded-full')}
            >
              Login
            </Link>
            <Link
              to="/farmer/equipments"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
            >
              Browse equipment
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
