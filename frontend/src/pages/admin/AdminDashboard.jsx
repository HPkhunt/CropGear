import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../../components/PageHero.jsx'
import { adminService } from '../../services/adminService.js'
import SmartImage from '../../components/SmartImage.jsx'
import { getErrorMessage } from '../../utils/helpers.js'
import DashboardShell from '../../components/DashboardShell.jsx'
import { adminDashboardLinks } from '../../utils/dashboardLinks.js'

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    users: 0,
    equipment: 0,
    bookings: 0,
    pending_user_approvals: 0,
    total_admin_revenue: 0
  })
  const [pendingUsers, setPendingUsers] = useState([])
  const [equipmentRows, setEquipmentRows] = useState([])
  const [, setActionMessage] = useState('')
  const [, setActionError] = useState('')

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
  return (
    <div className="container page-wrap">
      <DashboardShell
        title="Admin Control"
        subtitle="Governance suite"
        links={adminDashboardLinks}
      >
        <PageHero
          eyebrow="Platform Governance"
          title="Marketplace integrity monitor"
          subtitle="Oversee user safety, maintain equipment quality standards, and manage platform economic health."
          className="portal-admin"
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
              <Link className="button soil pill" to="/admin/verify-owners">User Approvals</Link>
              <Link className="button secondary pill" to="/admin/bookings">Booking Ops</Link>
              <Link className="button secondary pill" to="/admin/equipment">Control Center</Link>
            </div>
          }
        />

        <section className="dashboard-grid-premium">
          <Link className="card stat-card-premium hover-lift dashboard-summary-link" to="/admin/bookings">
            <span className="stat-label">Platform Volume</span>
            <span className="stat-value">{metrics.bookings}</span>
            <p className="subtitle">Total booking requests processed</p>
            <span className="dashboard-summary-cta">Open booking queue</span>
          </Link>
          <Link className="card stat-card-premium hover-lift dashboard-summary-link" to="/admin/equipment">
            <span className="stat-label">Equipment Listings</span>
            <span className="stat-value">{metrics.equipment}</span>
            <p className="subtitle">Active equipment records under platform control</p>
            <span className="dashboard-summary-cta">Open equipment control</span>
          </Link>
          <Link className="card stat-card-premium hover-lift dashboard-summary-link" to="/admin/verify-owners">
            <span className="stat-label">Active Users</span>
            <span className="stat-value">{metrics.users}</span>
            <p className="subtitle">Verified farmers and equipment owners</p>
            <span className="dashboard-summary-cta">Audit user queue</span>
          </Link>
          <Link className="card stat-card-premium hover-lift dashboard-summary-link" to="/admin/bookings">
            <span className="stat-label">Revenue Snapshot</span>
            <span className="stat-value">${metrics.total_admin_revenue?.toFixed(2)}</span>
            <p className="subtitle">Current commission revenue across completed rentals</p>
            <span className="dashboard-summary-cta">Track live bookings</span>
          </Link>
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
              <li><strong>{managedEquipment.length}</strong><span>Equipment in live moderation</span></li>
            </ul>
          </article>
        </section>

        <section className="feature-grid admin-action-grid">
          <article className="card">
            <h3>Queue Management</h3>
            <p className="subtitle">Approve or reject new users based on role and compliance checks.</p>
            <Link to="/admin/verify-owners" className="button sm secondary">Open User Approvals</Link>
          </article>

          <article className="card">
            <h3>Equipment Moderation</h3>
            <p className="subtitle">Remove invalid, duplicate, or policy-violating listings.</p>
            <Link to="/admin/equipment" className="button sm soil">Open Equipment Admin</Link>
          </article>

          <article className="card">
            <h3>Booking Operations</h3>
            <p className="subtitle">Open live tracking and service tickets across the full booking queue.</p>
            <Link to="/admin/bookings" className="button sm secondary">Open Booking Queue</Link>
          </article>

          <article className="card">
            <h3>Platform Visibility</h3>
            <p className="subtitle">Monitor listing visibility and remove unavailable equipment from farmer discovery.</p>
            <Link to="/admin/equipment" className="button sm secondary">Open Visibility Control</Link>
          </article>
        </section>

        <section className="card">
          <h3>Manage From Dashboard</h3>
          <p className="subtitle">Approve users and control farmer visibility of equipment directly from this dashboard.</p>


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
                              className="button sm soil"
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
                <Link to="/admin/verify-owners" className="button sm outline">Open Full User Approvals</Link>
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
                            className={`button sm ${item.is_visible_to_farmers !== false ? 'soil' : 'secondary'}`}
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
              Keep the shared user-approval queue moving quickly so new farmers and owners can activate safely. Aim for &lt;24h turnaround on approvals.
            </p>
            <div className="button-row">
              <Link className="button sm soil pill" to="/admin/verify-owners">Approval Audit</Link>
              <Link className="button sm accent pill" to="/admin/bookings">Booking Queue</Link>
            </div>
          </div>
        </section>
      </DashboardShell>
    </div>
  )
}
