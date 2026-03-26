import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const ROUTE_MAP = {
  '/farmer/dashboard': { label: 'Dashboard', parent: null },
  '/farmer/equipments': { label: 'Browse Equipment', parent: '/farmer/dashboard' },
  '/farmer/bookings': { label: 'My Bookings', parent: '/farmer/dashboard' },
  '/owner/dashboard': { label: 'Dashboard', parent: null },
  '/owner/add-equipment': { label: 'Add Equipment', parent: '/owner/dashboard' },
  '/owner/equipment': { label: 'My Listings', parent: '/owner/dashboard' },
  '/owner/requests': { label: 'Rental Requests', parent: '/owner/dashboard' },
  '/admin/dashboard': { label: 'Dashboard', parent: null },
  '/admin/verify-owners': { label: 'Verify Users', parent: '/admin/dashboard' },
  '/admin/reports': { label: 'Reports', parent: '/admin/dashboard' },
  '/admin/equipment': { label: 'Equipment Control', parent: '/admin/dashboard' },
  '/admin/newsletters': { label: 'Newsletters', parent: '/admin/dashboard' },
  '/admin/testimonials': { label: 'Testimonials', parent: '/admin/dashboard' },
  '/messages': { label: 'Messages', parent: null },
  '/search': { label: 'Search Results', parent: null },
  '/browse-equipment': { label: 'Browse Equipment', parent: null },
  '/favorites': { label: 'Favorites', parent: null },
  '/auth/login': { label: 'Login', parent: null },
  '/auth/register': { label: 'Register', parent: null },
}

export default function Breadcrumbs({ items, className = '' }) {
  const location = useLocation()
  const path = location.pathname

  // Skip on home page
  if (path === '/') return null

  // Build crumbs: either from explicit items or auto from route map
  let crumbs = []
  if (items && items.length) {
    crumbs = items
  } else {
    // Auto-build from route map
    crumbs.push({ label: 'Home', to: '/' })

    // Handle dynamic routes like /equipment/:id or /farmer/equipment/:id
    const dynamicPatterns = [
      { pattern: /^\/equipment\/(.+)$/, label: 'Equipment Details', parent: '/browse-equipment' },
      { pattern: /^\/farmer\/equipment\/(.+)$/, label: 'Equipment Details', parent: '/farmer/equipments' },
      { pattern: /^\/owner\/equipment\/(.+)\/edit$/, label: 'Edit Equipment', parent: '/owner/equipment' },
    ]

    let matched = false
    for (const { pattern, label, parent } of dynamicPatterns) {
      if (pattern.test(path)) {
        if (parent && ROUTE_MAP[parent]) {
          // Add parent's parent if it exists
          const pp = ROUTE_MAP[parent]
          if (pp.parent) crumbs.push({ label: ROUTE_MAP[pp.parent]?.label || 'Back', to: pp.parent })
          crumbs.push({ label: pp.label, to: parent })
        }
        crumbs.push({ label })
        matched = true
        break
      }
    }

    if (!matched) {
      const route = ROUTE_MAP[path]
      if (route) {
        if (route.parent && ROUTE_MAP[route.parent]) {
          crumbs.push({ label: ROUTE_MAP[route.parent].label, to: route.parent })
        }
        crumbs.push({ label: route.label })
      } else {
        // Unknown page
        const segments = path.split('/').filter(Boolean)
        if (segments.length > 0) {
          const label = segments[segments.length - 1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          crumbs.push({ label })
        }
      }
    }
  }

  if (crumbs.length <= 1) return null

  return (
    <nav className={`breadcrumbs ${className}`} aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <li key={i} className={`breadcrumb-item ${isLast ? 'breadcrumb-current' : ''}`}>
              {isLast || !crumb.to ? (
                <span aria-current="page">{crumb.label}</span>
              ) : (
                <Link to={crumb.to}>{crumb.label}</Link>
              )}
              {!isLast && <span className="breadcrumb-sep" aria-hidden="true">/</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
