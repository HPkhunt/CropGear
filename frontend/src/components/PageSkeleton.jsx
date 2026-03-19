import React from 'react'

export default function PageSkeleton({ variant = 'grid' }) {
  const blocks = variant === 'table' ? 3 : variant === 'dashboard' ? 6 : 8

  return (
    <div className="container page-wrap">
      <section className="skeleton-wrap card">
        <div className="skeleton-line lg" />
        <div className="skeleton-line md" />
        <div className="skeleton-line sm" />
      </section>
      <section className={`skeleton-grid ${variant}`}>
        {Array.from({ length: blocks }).map((_, idx) => (
          <article key={idx} className="card skeleton-card">
            <div className="skeleton-line md" />
            <div className="skeleton-line sm" />
            <div className="skeleton-line sm" />
          </article>
        ))}
      </section>
    </div>
  )
}
