import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PageHero from '../../components/PageHero.jsx'
import { adminService } from '../../services/adminService.js'
import { StatusIcon } from '../../components/AppIcons.jsx'
import Loader from '../../components/Loader.jsx'
import { getErrorMessage } from '../../utils/helpers.js'
import SmartImage from '../../components/SmartImage.jsx'
import DashboardShell from '../../components/DashboardShell.jsx'
import { adminDashboardLinks } from '../../utils/dashboardLinks.js'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export default function VerifyOwners() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [roleFilter, setRoleFilter] = useState('all')
  const [q, setQ] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const refresh = useCallback(async (status = statusFilter, role = roleFilter) => {
    const data = await adminService.approvalQueue({ statusFilter: status, roleFilter: role })
    setUsers(data)
  }, [roleFilter, statusFilter])

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
  }, [refresh, roleFilter, statusFilter])

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
  const kycCounts = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        const status = user.kyc_status || 'not_started'
        if (status === 'approved') acc.approved += 1
        else if (status === 'rejected') acc.rejected += 1
        else if (status === 'pending') acc.pending += 1
        else acc.notStarted += 1
        return acc
      },
      { pending: 0, approved: 0, rejected: 0, notStarted: 0 }
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
      <DashboardShell title="Admin Control" subtitle="Approval suite" links={adminDashboardLinks}>
        <PageHero
          eyebrow="User Approvals"
          title="Approve or reject newly registered accounts"
          subtitle="Admin approval is the single gate for account activation and protected role access."
          className="portal-admin"
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
              {actionMessage && (
                <Alert className="mb-4 border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
                  <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-slate-900">{actionMessage}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => setActionMessage('')}
                    >
                      Dismiss
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              {actionError && (
                <Alert
                  variant="destructive"
                  className="mb-4 border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur"
                >
                  <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-slate-900">{actionError}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => setActionError('')}
                    >
                      Dismiss
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>KYC</th>
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
                          {user.role === 'equipment_owner' ? (
                            <div>
                              <span className={`status-badge ${user.kyc_status === 'approved' ? 'status-success' : user.kyc_status === 'rejected' ? 'status-error' : user.kyc_status === 'pending' ? 'status-pending' : 'status-info'}`}>
                                {user.kyc_status || 'not_started'}
                              </span>
                              {user.kyc_business_name ? (
                                <p className="subtitle" style={{ marginTop: '6px' }}>{user.kyc_business_name}</p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="subtitle">Not required</span>
                          )}
                        </td>
                        <td>
                          <div className="button-row">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="rounded-full"
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
                            </Button>
                            <Button
                              type="button"
                              variant="soil"
                              size="sm"
                              className="rounded-full"
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
                            </Button>
                            {user.role === 'equipment_owner' ? (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full"
                                  disabled={user.kyc_status === 'approved'}
                                  onClick={async () => {
                                    setActionError('')
                                    setActionMessage('')
                                    try {
                                      await adminService.decideKyc(user.id, 'approved')
                                      setActionMessage(`KYC approved for ${user.full_name}.`)
                                      await refresh()
                                    } catch (error) {
                                      setActionError(getErrorMessage(error, 'Unable to approve KYC.'))
                                    }
                                  }}
                                >
                                  KYC Approve
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full"
                                  disabled={user.kyc_status === 'rejected'}
                                  onClick={async () => {
                                    setActionError('')
                                    setActionMessage('')
                                    try {
                                      await adminService.decideKyc(user.id, 'rejected', 'Please review and resubmit the KYC packet.')
                                      setActionMessage(`KYC rejected for ${user.full_name}.`)
                                      await refresh()
                                    } catch (error) {
                                      setActionError(getErrorMessage(error, 'Unable to reject KYC.'))
                                    }
                                  }}
                                >
                                  KYC Reject
                                </Button>
                              </>
                            ) : null}
                          </div>
                          {user.role === 'equipment_owner' && user.kyc_review_notes ? (
                            <p className="subtitle" style={{ marginTop: '8px' }}>{user.kyc_review_notes}</p>
                          ) : null}
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
                  <div className="stat-icon-wrap">
                    <StatusIcon status="pending" size={18} strokeWidth={2.1} />
                  </div>
                  <div className="stat-info-wrap">
                    <strong>{statusCounts.pending}</strong>
                    <span>Pending approvals</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">
                    <StatusIcon status="approved" size={18} strokeWidth={2.1} />
                  </div>
                  <div className="stat-info-wrap">
                    <strong>{statusCounts.approved}</strong>
                    <span>Approved users</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">
                    <StatusIcon status="rejected" size={18} strokeWidth={2.1} />
                  </div>
                  <div className="stat-info-wrap">
                    <strong>{statusCounts.rejected}</strong>
                    <span>Rejected users</span>
                  </div>
                </div>
              </div>
              <p className="panel-note">Every approval action is audited for compliance.</p>
            </section>

            <section className="card">
              <h3>KYC Summary</h3>
              <div className="panel-list-premium">
                <div className="insight-stat-row">
                  <div className="stat-info-wrap">
                    <strong>{kycCounts.pending}</strong>
                    <span>Pending owner KYC reviews</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-info-wrap">
                    <strong>{kycCounts.approved}</strong>
                    <span>Approved owner KYC packets</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-info-wrap">
                    <strong>{kycCounts.rejected}</strong>
                    <span>Rejected owner KYC packets</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-info-wrap">
                    <strong>{kycCounts.notStarted}</strong>
                    <span>Owners who still need to submit</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="card">
              <h3>Approval Checklist</h3>
              <ul className="feature-list">
                <li><span>Verify identity and role selection.</span></li>
                <li><span>Confirm required profile fields are complete.</span></li>
                <li><span>Review KYC details for equipment owners before granting trusted owner access.</span></li>
                <li><span>Reject duplicates or suspicious requests.</span></li>
              </ul>
              <div className="button-row">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={resetFilters}
                >
                  Reset Filters
                </Button>
              </div>
            </section>
          </aside>
        </section>
      </DashboardShell>
    </div>
  )
}
