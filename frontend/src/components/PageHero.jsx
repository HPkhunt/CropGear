import React, { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import './PageHero.css'

const HERO_VARIANTS = {
  default: 'bg-[linear-gradient(135deg,rgba(250,253,250,0.98),rgba(238,247,240,0.96),rgba(255,249,238,0.96))] hero-default',
  'portal-primary': 'bg-[linear-gradient(135deg,rgba(243,251,245,0.98),rgba(225,244,231,0.96),rgba(255,247,234,0.96))] hero-portal-primary',
  'portal-secondary': 'bg-[linear-gradient(135deg,rgba(244,249,252,0.98),rgba(232,244,249,0.96),rgba(250,252,255,0.96))] hero-portal-secondary',
  'portal-admin': 'bg-[linear-gradient(135deg,rgba(250,250,245,0.98),rgba(240,245,236,0.96),rgba(247,243,232,0.96))] hero-portal-admin',
  harvest: 'bg-[linear-gradient(135deg,rgba(255,249,238,0.98),rgba(255,242,215,0.96),rgba(250,247,238,0.96))] hero-harvest',
  earth: 'bg-[linear-gradient(120deg,rgba(251,248,242,0.98),rgba(244,237,227,0.96),rgba(247,242,234,0.96))] hero-earth',
  growth: 'bg-[linear-gradient(145deg,rgba(243,251,245,0.98),rgba(228,245,233,0.96),rgba(241,248,242,0.96))] hero-growth'
}

const HERO_ACCENTS = {
  default: 'text-primary-700',
  'portal-primary': 'text-primary-700',
  'portal-secondary': 'text-sky-700',
  'portal-admin': 'text-soil-700',
  harvest: 'text-accent-700',
  earth: 'text-soil-700',
  growth: 'text-primary-700'
}

const VARIANT_TOKENS = ['portal-primary', 'portal-secondary', 'portal-admin', 'harvest', 'earth', 'growth']

function resolveVariant(className = '') {
  return VARIANT_TOKENS.find((token) => className.includes(token)) || 'default'
}

function stripVariantTokens(className = '') {
  return className
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !VARIANT_TOKENS.includes(token))
    .join(' ')
}

export default function PageHero({
  eyebrow,
  title,
  subtitle,
  actions = null,
  aside = null,
  stats = null,
  className = '',
  animatedBadges = [],
  showcaseFeature = null,
  glowEffect = true
}) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const hasStats = Array.isArray(stats) && stats.length > 0
  const hasAside = Boolean(aside)
  const variant = resolveVariant(className)
  const accentClassName = HERO_ACCENTS[variant]

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setMousePosition({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100
    })
  }

  return (
    <section
      className={cn(
        'hero-section relative isolate overflow-hidden rounded-[28px] border border-primary-100/80 px-6 py-7 text-foreground shadow-[0_22px_70px_rgba(47,95,68,0.14)] transition-all duration-500 sm:px-8 sm:py-8 lg:px-10',
        HERO_VARIANTS[variant],
        stripVariantTokens(className)
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        '--mouse-x': `${mousePosition.x}%`,
        '--mouse-y': `${mousePosition.y}%`
      }}
    >
      <div className="hero-bg-gradient absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.65),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(226,161,45,0.12),transparent_30%)]" />
      <div className="hero-grid-pattern absolute inset-0 opacity-25 [background-image:linear-gradient(135deg,rgba(68,178,114,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />

      {glowEffect && (
        <div
          className="hero-glow pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500"
          style={{
            background: 'radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(68,178,114,0.18), transparent 50%)',
            opacity: isHovered ? 1 : 0
          }}
        />
      )}

      <div className="hero-spotlight hero-spotlight-1 absolute top-0 right-0 h-96 w-96 rounded-full bg-primary-300/20 blur-3xl animate-pulse opacity-35" />
      <div className="hero-spotlight hero-spotlight-2 absolute bottom-0 left-0 h-72 w-72 rounded-full bg-accent-200/35 blur-3xl animate-pulse opacity-35" style={{ animationDelay: '2s' }} />
      <div className="hero-float-orb absolute top-1/3 right-1/4 h-32 w-32 rounded-full bg-gradient-to-br from-white/60 to-primary-100/40 blur-2xl opacity-0" />

      <div className={cn('relative grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-center', !hasAside && 'lg:grid-cols-1')}>
        <div className="space-y-5">
          {eyebrow && (
            <div className="hero-eyebrow group flex items-center gap-2">
              <p className="relative z-2 text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 transition-colors duration-300 group-hover:text-primary-700">
                {eyebrow}
              </p>
              {animatedBadges.length > 0 && (
                <Sparkles
                  size={14}
                  className="animate-spin text-accent-500 transition-colors group-hover:text-accent-600"
                  style={{ animationDuration: '3s' }}
                />
              )}
            </div>
          )}

          <div className="space-y-3">
            <h1 className="hero-title max-w-4xl bg-gradient-to-r from-slate-950 via-primary-900 to-soil-800 bg-clip-text text-3xl font-semibold leading-tight tracking-tight text-transparent sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            {subtitle && (
              <p className="hero-subtitle max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                {subtitle}
              </p>
            )}
          </div>

          {hasStats && (
            <div className="hero-stats-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {stats.map((item, index) => (
                <div
                  key={item.label}
                  className="hero-stat-card rounded-2xl border border-primary-100 bg-white/80 px-4 py-3 text-slate-900 shadow-lg shadow-primary-100/50 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:scale-105 hover:border-primary-200 hover:bg-white hover:shadow-xl"
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <strong className={cn('block bg-gradient-to-r from-primary-700 to-soil-700 bg-clip-text text-lg font-semibold text-transparent', accentClassName)}>
                    {item.value}
                  </strong>
                  <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {actions && <div className="flex flex-wrap gap-3 pt-1">{actions}</div>}
        </div>

        {hasAside && (
          <div
            className={cn(
              'relative w-full group',
              '[&_.page-hero-media]:h-[220px] [&_.page-hero-media]:w-full [&_.page-hero-media]:rounded-[24px] [&_.page-hero-media]:border [&_.page-hero-media]:border-white/50 [&_.page-hero-media]:object-cover [&_.page-hero-media]:shadow-[0_22px_60px_rgba(47,95,68,0.12)]',
              'sm:[&_.page-hero-media]:h-[260px]',
              '[&_.page-hero-card]:rounded-[24px] [&_.page-hero-card]:border [&_.page-hero-card]:border-primary-100 [&_.page-hero-card]:bg-white/86 [&_.page-hero-card]:p-5 [&_.page-hero-card]:shadow-[0_18px_44px_rgba(47,95,68,0.12)] [&_.page-hero-card]:backdrop-blur',
              '[&_.hero-visual-wrapper]:relative',
              '[&_.hero-floating-card]:absolute [&_.hero-floating-card]:bottom-4 [&_.hero-floating-card]:right-4 [&_.hero-floating-card]:rounded-[22px] [&_.hero-floating-card]:border [&_.hero-floating-card]:border-primary-100 [&_.hero-floating-card]:bg-white/90 [&_.hero-floating-card]:px-4 [&_.hero-floating-card]:py-3 [&_.hero-floating-card]:text-slate-900 [&_.hero-floating-card]:shadow-[0_18px_40px_rgba(47,95,68,0.12)] [&_.hero-floating-card]:backdrop-blur',
              '[&_.card-mini-stat]:grid [&_.card-mini-stat]:gap-1 [&_.card-mini-stat>span]:text-2xl [&_.card-mini-stat>span]:font-semibold [&_.card-mini-stat>small]:text-[11px] [&_.card-mini-stat>small]:font-medium [&_.card-mini-stat>small]:uppercase [&_.card-mini-stat>small]:tracking-[0.18em] [&_.card-mini-stat>small]:text-slate-500'
            )}
          >
            {aside}
          </div>
        )}
      </div>

      {showcaseFeature && (
        <div className="hero-showcase-badge absolute top-6 left-6 sm:top-8 sm:left-8">
          <div className="hero-badge-content group cursor-default rounded-full border border-primary-100 bg-white/78 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-lg shadow-primary-100/40 backdrop-blur-md transition-all duration-300 hover:border-primary-200 hover:bg-white">
            <span className="mr-2 inline-block text-accent-600 transition-all group-hover:animate-spin" style={{ animationDuration: '2s' }}>âœ¨</span>
            {showcaseFeature}
          </div>
        </div>
      )}

      {animatedBadges.length > 0 && (
        <div className="hero-badges-container absolute bottom-8 right-8 space-y-2">
          {animatedBadges.map((badge, index) => (
            <div
              key={index}
              className="hero-animated-badge inline-block rounded-full border border-accent-100 bg-gradient-to-r from-white/90 to-accent-50/70 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-lg shadow-accent-100/50 backdrop-blur-md animate-pulse transition-all duration-300 hover:border-accent-200 hover:from-white hover:to-accent-100/80"
              style={{
                animationDelay: `${index * 200}ms`,
                display: 'block'
              }}
            >
              {badge}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
