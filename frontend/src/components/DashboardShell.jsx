import React from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function DashboardShell({ title, subtitle, links, children }) {
  const location = useLocation()
  const isActive = (to) => location.pathname === to || location.pathname.startsWith(`${to}/`)

  return (
    <section className="dashboard-shell">
      <aside className="dashboard-sidebar card">
        <div className="dashboard-sidebar-head">
          <h3>{title}</h3>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
        <nav className="dashboard-nav">
          {links.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={isActive(item.to) ? 'active' : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="dashboard-main">{children}</div>
      <nav className="dashboard-mobile-nav card" aria-label={`${title} quick navigation`}>
        {links.map((item) => (
          <Link
            key={`mobile-${item.to}`}
            to={item.to}
            className={isActive(item.to) ? 'active' : ''}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </section>
  )
}
