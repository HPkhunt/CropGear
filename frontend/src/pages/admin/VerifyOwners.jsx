import React, { useEffect, useMemo, useState } from 'react'
import PageHero from '../../components/PageHero.jsx'
import { adminService } from '../../services/adminService.js'
import Loader from '../../components/Loader.jsx'
import { getErrorMessage } from '../../utils/helpers.js'
import SmartImage from '../../components/SmartImage.jsx'

export default function VerifyOwners() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [roleFilter, setRoleFilter] = useState('all')
  const [q, setQ] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const refresh = async (status = statusFilter, role = roleFilter) => {
    const data = await adminService.approvalQueue({ statusFilter: status, roleFilter: role })
    setUsers(data)
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        await refresh(statusFilter, roleFilter)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [statusFilter, roleFilter])

  const visible = useMemo(() => {
    const search = q.trim().toLowerCase()
    if (!search) return users
    return users.filter((user) => user.full_name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search))
  }, [users, q])
  const statusCounts = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        const status = user.approval_status || 'pending'
        if (status === 'approved') acc.approved += 1
        else if (status === 'rejected') acc.rejected += 1
        else acc.pending += 1
        return acc
      },
      { pending: 0, approved: 0, rejected: 0 }
    )
  }, [users])
  const stats = [
    { value: users.length, label: 'Total users' },
    { value: visible.length, label: 'Visible' },
    { value: statusFilter, label: 'Status filter' }
  ]
  const resetFilters = () => {
    setQ('')
    setStatusFilter('pending')
    setRoleFilter('all')
  }

  if (loading) return <Loader />

  return (
    <div className="container page-wrap">
      <PageHero
        eyebrow="Verify Users"
        title="Approve or reject newly registered users"
        subtitle="Admin approval controls account activation and selected role access."
        className="portal-dark"
        stats={stats}
        aside={
          <SmartImage
            src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1280&auto=format&fit=crop"
            fallbackSrc="/hero.svg"
            alt="User approval"
            className="page-hero-media"
          />
        }
      />

      <section className="page-split">
        <div className="page-main">
          <section className="card filter-shell">
            <div className="filter-bar">
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search by user name or email"
              />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="all">All roles</option>
                <option value="farmer">Farmer</option>
                <option value="equipment_owner">Equipment Owner</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="filter-meta">
              <span>{visible.length} users visible</span>
            </div>
          </section>

          <section className="card">
            {actionMessage && <p className="success-banner">{actionMessage}</p>}
            {actionError && <p className="error-banner">{actionError}</p>}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((user) => (
                    <tr key={user.id}>
                      <td>{user.full_name}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>
                        <span className={`status-badge ${user.approval_status === 'approved' ? 'status-success' : user.approval_status === 'rejected' ? 'status-error' : 'status-pending'}`}>
                          {user.approval_status}
                        </span>
                      </td>
                      <td>
                        <div className="button-row">
                          <button
                            className="button sm secondary"
                            disabled={user.approval_status === 'approved'}
                            onClick={async () => {
                              setActionError('')
                              setActionMessage('')
                              try {
                                await adminService.decideUser(user.id, 'approved')
                                setActionMessage(`${user.full_name} approved as ${user.role}.`)
                                await refresh()
                              } catch (error) {
                                setActionError(getErrorMessage(error, 'Unable to approve user.'))
                              }
                            }}
                          >
                            Approve
                          </button>
                          <button
                            className="button sm dark"
                            disabled={user.approval_status === 'rejected'}
                            onClick={async () => {
                              setActionError('')
                              setActionMessage('')
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
            {!visible.length && <p className="subtitle">No users match the current filter.</p>}
          </section>
        </div>

        <aside className="page-side">
          <section className="card">
            <h3>Queue Summary</h3>
            <div className="panel-list-premium">
              <div className="insight-stat-row">
                <div className="stat-icon-wrap">⏳</div>
                <div className="stat-info-wrap">
                  <strong>{statusCounts.pending}</strong>
                  <span>Pending approvals</span>
                </div>
              </div>
              <div className="insight-stat-row">
                <div className="stat-icon-wrap">✅</div>
                <div className="stat-info-wrap">
                  <strong>{statusCounts.approved}</strong>
                  <span>Approved users</span>
                </div>
              </div>
              <div className="insight-stat-row">
                <div className="stat-icon-wrap">❌</div>
                <div className="stat-info-wrap">
                  <strong>{statusCounts.rejected}</strong>
                  <span>Rejected users</span>
                </div>
              </div>
            </div>
            <p className="panel-note">Every approval action is audited for compliance.</p>
          </section>

          <section className="card">
            <h3>Approval Checklist</h3>
            <ul className="feature-list">
              <li><span>Verify identity and role selection.</span></li>
              <li><span>Confirm required profile fields are complete.</span></li>
              <li><span>Reject duplicates or suspicious requests.</span></li>
            </ul>
            <div className="button-row">
              <button type="button" className="button sm outline pill hover-lift" onClick={resetFilters}>Reset Filters</button>
            </div>
          </section>
        </aside>
      </section>
    </div>
  )
}
