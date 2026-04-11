import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PageHero from '../components/PageHero'
import useAuth from '../hooks/useAuth'
import { Button } from '@/components/ui/button'

export default function Landing() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const browsePath = user?.role === 'farmer' ? '/farmer/equipments' : '/browse-equipment'
  const dashboardPath =
    user?.role === 'admin'
      ? '/admin/dashboard'
      : user?.role === 'equipment_owner'
        ? '/owner/dashboard'
        : '/farmer/dashboard'

  const mainStats = [
    { label: 'Active Listings', value: '2,847+' },
    { label: 'Verified Owners', value: '643' },
    { label: 'Monthly Bookings', value: '1,204' }
  ]

  const featuresData = [
    {
      title: 'Verified Owner Network',
      description: 'Every equipment owner goes through our approval workflow, so you rent with confidence.',
      icon: '✓'
    },
    {
      title: 'Nearby Search',
      description: 'Filter equipment by distance to find exactly what you need, exactly when you need it.',
      icon: '📍'
    },
    {
      title: 'Instant Booking',
      description: 'Compare options, shortlist favorites, and book in minutes without paperwork delays.',
      icon: '⚡'
    },
    {
      title: 'Secure Payments',
      description: 'Clear pricing, receipt history, and payment status visibility at every step.',
      icon: '🔒'
    }
  ]

  const rolesData = [
    {
      title: 'For Farmers',
      description: 'Find field-ready equipment without overpriced rentals or long-term commitments.',
      action: 'Start browsing',
      onClick: () => navigate(browsePath)
    },
    {
      title: 'For Equipment Owners',
      description: 'Turn idle equipment into revenue. Manage listings, track bookings, and build reputation.',
      action: isAuthenticated && user?.role === 'equipment_owner' ? 'Add listing' : 'Start listing',
      onClick: () =>
        navigate(
          isAuthenticated && user?.role === 'equipment_owner' ? '/owner/add-equipment' : '/auth/register'
        )
    },
    {
      title: 'For Admins',
      description: 'Monitor marketplace health, verify owners, and support operators with workspace tools.',
      action: 'Open admin',
      onClick: () => navigate(dashboardPath)
    }
  ]

  return (
    <div className="w-full min-h-screen">
      {/* Main Hero with New Features */}
      <PageHero
        eyebrow="Agricultural Equipment Marketplace"
        title="Find Field-Ready Equipment Without the Markup"
        subtitle="Browse verified equipment from trusted owners, book instantly, and handle peak season demand without oversized rental costs or long-term leases."
        stats={mainStats}
        showcaseFeature="Real-time verified listings"
        animatedBadges={['Nearby search', 'Instant booking', 'Secure payments']}
        actions={
          <>
            <Button size="lg" onClick={() => navigate(browsePath)}>
              Browse Equipment <ArrowRight size={18} />
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate(isAuthenticated ? dashboardPath : '/auth/register')}
            >
              {isAuthenticated ? 'Open Dashboard' : 'List Your Equipment'}
            </Button>
          </>
        }
      />

      {/* Features Section */}
      <section className="py-16 sm:py-24 px-4 bg-surface">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-4">Why CropGear</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-text mb-4">
              Marketplace built for seasonal demand
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Purpose-built for farming, with features that reduce friction and build trust at every step.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {featuresData.map((feature, idx) => (
              <div
                key={idx}
                className="p-6 rounded-xl border border-border bg-surface-soft hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-text mb-2">{feature.title}</h3>
                <p className="text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-16 sm:py-24 px-4 bg-bg">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-4">For Everyone</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-text mb-4">
              One platform for all roles
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {rolesData.map((role, idx) => (
              <div
                key={idx}
                className="p-8 rounded-xl border border-border bg-surface flex flex-col"
              >
                <h3 className="text-xl font-semibold text-text mb-2">{role.title}</h3>
                <p className="text-muted mb-6 flex-1">{role.description}</p>
                <Button
                  variant={idx === 0 ? 'primary' : 'secondary'}
                  size="md"
                className="w-full"
                onClick={role.onClick}
              >
                  {role.action} <ArrowRight size={16} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Hero with variant styling */}
      <PageHero
        eyebrow="Ready to get started?"
        title="Join the agricultural equipment revolution"
        subtitle={
          isAuthenticated
            ? 'Access the full CropGear marketplace with all your tools and verified connections.'
            : 'Sign up free and start renting or listing equipment today. No long-term commitments.'
        }
        showcaseFeature="Full-featured platform"
        animatedBadges={['No contracts', 'Fast checkout', 'Community support']}
        actions={
          <>
            <Button size="lg" onClick={() => navigate(browsePath)}>
              Browse Now
            </Button>
            {!isAuthenticated && (
              <Button variant="secondary" size="lg" onClick={() => navigate('/auth/register')}>
                Create Account
              </Button>
            )}
          </>
        }
        className="portal-primary"
      />
    </div>
  )
}
