import React from 'react'

export default function PageHero({
  eyebrow,
  title,
  subtitle,
  actions = null,
  aside = null,
  stats = null,
  className = ''
}) {
  const hasStats = Array.isArray(stats) && stats.length > 0
  const hasAside = Boolean(aside)

  return (
    <section className={`page-hero ${className}`.trim()}>
      <div className={`page-hero-body ${hasAside ? 'with-aside' : ''}`}>
        <div className="page-hero-main">
          {eyebrow && <p className="page-hero-eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {subtitle && <p className="page-hero-subtitle">{subtitle}</p>}
          {hasStats && (
            <div className="page-hero-stats">
              {stats.map((item) => (
                <div key={item.label} className="page-hero-stat">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          )}
          {actions && <div className="page-hero-actions">{actions}</div>}
        </div>
        {aside && <div className="page-hero-aside">{aside}</div>}
      </div>
    </section>
  )
}
