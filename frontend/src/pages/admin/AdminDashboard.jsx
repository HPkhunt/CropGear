import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../../components/PageHero.jsx'
import { adminService } from '../../services/adminService.js'
import SmartImage from '../../components/SmartImage.jsx'
import { getErrorMessage } from '../../utils/helpers.js'
import DashboardShell from '../../components/DashboardShell.jsx'

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    users: 0,
    equipment: 0,
    bookings: 0,
    pending_owner_verifications: 0,
    pending_user_approvals: 0,
    total_admin_revenue: 0
  })
  const [pendingUsers, setPendingUsers] = useState([])
  const [equipmentRows, setEquipmentRows] = useState([])
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const refresh = async () => {
    const [dashboard, queue, equipment] = await Promise.all([
      adminService.dashboard(),
      adminService.approvalQueue({ statusFilter: 'pending', roleFilter: 'all' }),
      adminService.equipmentList()
    ])
    setMetrics(dashboard)
    setPendingUsers(queue)
    setEquipmentRows(equipment)
  }

  useEffect(() => {
    refresh().catch(() => { })
  }, [])

  const managedEquipment = useMemo(() => equipmentRows.slice(0, 6), [equipmentRows])
  const managedUsers = useMemo(() => pendingUsers.slice(0, 6), [pendingUsers])
  const stats = [
    { value: metrics.users, label: 'Total users' },
    { value: metrics.equipment, label: 'Equipment listings' },
    { value: metrics.bookings, label: 'Bookings volume' },
    { value: metrics.pending_user_approvals, label: 'User approval queue' },
    { value: `$${metrics.total_admin_revenue?.toFixed(2) || '0.00'}`, label: 'Platform Revenue' }
  ]
  const sidebarLinks = [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/verify-owners', label: 'Verify Users' },
    { to: '/admin/equipment', label: 'Equipment Control' },
    { to: '/admin/reports', label: 'Reports' },
    { to: '/admin/newsletters', label: 'Newsletters' },
    { to: '/admin/testimonials', label: 'Testimonials' },
    { to: '/style-guide', label: 'UI Guide' },
    { to: '/', label: 'Home' }
  ]

  return (
    <div className="container page-wrap">
      <DashboardShell
        title="Admin Control"
        subtitle="Governance suite"
        links={sidebarLinks}
      >
        <PageHero
          eyebrow="Platform Governance"
          title="Marketplace integrity monitor"
          subtitle="Oversee user safety, maintain equipment quality standards, and manage platform economic health."
          className="portal-dark"
          stats={stats}
          aside={
            <div className="hero-visual-wrapper">
              <SmartImage
                src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1280&auto=format&fit=crop"
                fallbackSrc="/hero.svg"
                alt="Admin analytics"
                className="page-hero-media"
              />
              <div className="hero-floating-card">
                <div className="card-mini-stat">
                  <span>{metrics.pending_user_approvals}</span>
                  <small>In Queue</small>
                </div>
              </div>
            </div>
          }
          actions={
            <div className="button-row">
              <Link className="button dark pill" to="/admin/verify-owners">Audit Users</Link>
              <Link className="button secondary pill" to="/admin/equipment">Control Center</Link>
            </div>
          }
        />

        <section className="dashboard-grid-premium">
          <article className="card stat-card-premium hover-lift">
            <span className="stat-label">Platform Volume</span>
            <span className="stat-value">{metrics.bookings}</span>
            <p className="subtitle">Total booking requests processed</p>
          </article>
          <article className="card stat-card-premium hover-lift">
            <span className="stat-label">Economic Yield</span>
            <span className="stat-value">${metrics.total_admin_revenue?.toFixed(2)}</span>
            <p className="subtitle">Total commission revenue (10% platform fee)</p>
          </article>
          <article className="card stat-card-premium hover-lift">
            <span className="stat-label">Active Users</span>
            <span className="stat-value">{metrics.users}</span>
            <p className="subtitle">Verified farmers and equipment owners</p>
          </article>
        </section>

        <section className="details-grid">
          <article className="card dashboard-widget">
            <h3>Governance Snapshot</h3>
            <ul className="feature-list">
              <li><strong>${metrics.total_admin_revenue?.toFixed(2) || '0.00'}</strong><span>Platform Revenue (10% Cut)</span></li>
              <li><strong>{metrics.users}</strong><span>Total platform users</span></li>
              <li><strong>{metrics.equipment}</strong><span>Total equipment listings</span></li>
              <li><strong>{metrics.bookings}</strong><span>Total bookings</span></li>
              <li><strong>{managedUsers.length}</strong><span>Pending users in current queue view</span></li>
            </ul>
          </article>
          <article className="card dashboard-widget">
            <h3>Action Queue</h3>
            <ul className="feature-list">
              <li><strong>{metrics.pending_user_approvals}</strong><span>Users pending approval</span></li>
              <li><strong>{metrics.pending_owner_verifications}</strong><span>Owner verifications</span></li>
              <li><strong>{managedEquipment.length}</strong><span>Equipment in live moderation</span></li>
            </ul>
          </article>
        </section>

        <section className="feature-grid admin-action-grid">
          <article className="card">
            <h3>Queue Management</h3>
            <p className="subtitle">Approve or reject new users based on role and compliance checks.</p>
            <Link to="/admin/verify-owners" className="button sm secondary">Open User Queue</Link>
          </article>

          <article className="card">
            <h3>Performance Reports</h3>
            <p className="subtitle">Download operational and commercial CSV snapshots.</p>
            <Link to="/admin/reports" className="button sm secondary">Open Reports</Link>
          </article>

          <article className="card">
            <h3>Equipment Moderation</h3>
            <p className="subtitle">Remove invalid, duplicate, or policy-violating listings.</p>
            <Link to="/admin/equipment" className="button sm dark">Open Equipment Admin</Link>
          </article>

          <article className="card">
            <h3>Reports & Analytics</h3>
            <p className="subtitle">Track growth, engagement, and utilization trends.</p>
            <Link to="/admin/reports" className="button sm secondary">Open Reports</Link>
          </article>
        </section>

        <section className="card">
          <h3>Manage From Dashboard</h3>
          <p className="subtitle">Approve users and control farmer visibility of equipment directly from this dashboard.</p>
          {actionMessage && <p className="success-banner">{actionMessage}</p>}
          {actionError && <p className="error-banner">{actionError}</p>}

          <div className="details-grid">
            <div className="card">
              <h3>Pending User Approvals</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managedUsers.map((user) => (
                      <tr key={user.id}>
                        <td>{user.full_name}</td>
                        <td>{user.role}</td>
                        <td>
                          <div className="button-row">
                            <button
                              type="button"
                              className="button sm secondary"
                              onClick={async () => {
                                setActionMessage('')
                                setActionError('')
                                try {
                                  await adminService.decideUser(user.id, 'approved')
                                  setActionMessage(`${user.full_name} approved.`)
                                  await refresh()
                                } catch (error) {
                                  setActionError(getErrorMessage(error, 'Unable to approve user.'))
                                }
                              }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="button sm dark"
                              onClick={async () => {
                                setActionMessage('')
                                setActionError('')
                                try {
                                  await adminService.decideUser(user.id, 'rejected')
                                  setActionMessage(`${user.full_name} rejected.`)
                                  await refresh()
                                } catch (error) {
                                  setActionError(getErrorMessage(error, 'Unable to reject user.'))
                                }
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!managedUsers.length && <p className="subtitle">No pending users.</p>}
              <div className="button-row">
                <Link to="/admin/verify-owners" className="button sm outline">Open Full User Queue</Link>
              </div>
            </div>

            <div className="card">
              <h3>Equipment Visibility</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managedEquipment.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>
                          <span className={`status-badge ${item.is_visible_to_farmers !== false ? 'status-success' : 'status-pending'}`}>
                            {item.is_visible_to_farmers !== false ? 'visible' : 'hidden'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`button sm ${item.is_visible_to_farmers !== false ? 'dark' : 'secondary'}`}
                            onClick={async () => {
                              setActionMessage('')
                              setActionError('')
                              try {
                                const nextVisible = item.is_visible_to_farmers === false
                                await adminService.setEquipmentVisibility(item.id, nextVisible)
                                setActionMessage(nextVisible ? `${item.name} added back to farmer page.` : `${item.name} removed from farmer page.`)
                                await refresh()
                              } catch (error) {
                                setActionError(getErrorMessage(error, 'Unable to update equipment visibility.'))
                              }
                            }}
                          >
                            {item.is_visible_to_farmers !== false ? 'Hide Listing' : 'Show Listing'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!managedEquipment.length && <p className="subtitle">No equipment records found.</p>}
              <div className="button-row">
                <Link to="/admin/equipment" className="button sm outline">Open Full Equipment Admin</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="card role-insight admin-theme hover-lift">
          <div className="insight-visual">
            <SmartImage
              src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1280&auto=format&fit=crop"
              fallbackSrc="/hero.svg"
              alt="Admin analytics"
              loading="lazy"
            />
          </div>
          <div className="insight-content">
            <span className="insight-badge">Security Insight</span>
            <h3>Governance Strategy</h3>
            <p className="subtitle">
              Manual verification of owners reduces platform liability and increases farmer trust. Aim for &lt;24h turnaround on approvals.
            </p>
            <div className="button-row">
              <Link className="button sm dark pill" to="/admin/verify-owners">Queue Audit</Link>
              <Link className="button sm accent pill" to="/admin/reports">Generate Reports</Link>
            </div>
          </div>
        </section>
      </DashboardShell>
    </div>
  )
}
