import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { bookingService } from '../../services/bookingService.js'
import { StatusIcon } from '../../components/AppIcons.jsx'
import PageSkeleton from '../../components/PageSkeleton.jsx'
import PageHero from '../../components/PageHero.jsx'
import { formatCurrency, getErrorMessage } from '../../utils/helpers.js'
import DashboardShell from '../../components/DashboardShell.jsx'
import SmartImage from '../../components/SmartImage.jsx'
import useAuth from '../../hooks/useAuth.js'
import { adminDashboardLinks, ownerDashboardLinks } from '../../utils/dashboardLinks.js'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  countBookingsByStatuses,
  formatBookingStatusLabel,
  getBookingOperationsPath,
  getBookingStatusClass,
  normalizeBookingStatus,
  normalizePaymentStatus,
  summarizeBookings
} from '../../utils/bookings.js'

export default function BookingRequests() {
  const { user } = useAuth()
  const isAdminMode = user?.role === 'admin'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [q, setQ] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [actingKey, setActingKey] = useState('')

  const refresh = async () => {
    const data = await bookingService.requests()
    setItems(data)
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        await refresh()
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const visible = useMemo(() => {
    const search = q.toLowerCase().trim()
    return items
      .filter((item) => (statusFilter === 'all' ? true : normalizeBookingStatus(item.booking_status) === statusFilter))
      .filter((item) => {
        if (!search) return true
        const equipmentName = String(item.equipment_name || '').toLowerCase()
        const farmerName = String(item.farmer_name || '').toLowerCase()
        return equipmentName.includes(search) || farmerName.includes(search)
      })
  }, [items, q, statusFilter])

  const statusSummary = useMemo(() => summarizeBookings(items), [items])
  const pendingCount = statusSummary.pending
  const activeCount = useMemo(
    () => countBookingsByStatuses(items, ['confirmed', 'in_progress']),
    [items]
  )
  const closedCount = statusSummary.completed + statusSummary.cancelled + statusSummary.rejected
  const recentRequests = useMemo(() => items.slice(0, 4), [items])
  const sidebarLinks = isAdminMode ? adminDashboardLinks : ownerDashboardLinks

  const runAction = async (item, action, successMessage, fallbackMessage) => {
    const nextKey = `${item.id}:${action}`
    setActingKey(nextKey)
    setActionError('')
    setActionMessage('')

    try {
      await bookingService[action](item.id)
      setActionMessage(successMessage)
      await refresh()
    } catch (error) {
      setActionError(getErrorMessage(error, fallbackMessage))
    } finally {
      setActingKey('')
    }
  }

  const approveAllVisible = async () => {
    setActionError('')
    setActionMessage('')
    setActingKey('bulk-approve')
    try {
      for (const item of visible.filter((entry) => normalizeBookingStatus(entry.booking_status) === 'pending')) {
        await bookingService.approve(item.id)
      }
      setActionMessage('All visible pending requests were approved.')
      await refresh()
    } catch (error) {
      setActionError(getErrorMessage(error, 'Unable to approve all requests.'))
    } finally {
      setActingKey('')
    }
  }

  if (loading) return <PageSkeleton variant="table" />

  return (
    <div className="container page-wrap">
      <DashboardShell
        title={isAdminMode ? 'Admin Control' : 'Owner Panel'}
        subtitle={isAdminMode ? 'Booking governance' : 'Request center'}
        links={sidebarLinks}
      >
        <PageHero
          eyebrow="Booking Requests"
          title="Manage approvals and live rental status"
          subtitle="Move each booking from approval to active work and final completion without losing context."
          className={isAdminMode ? 'portal-admin' : 'portal-secondary'}
          stats={[
            { value: items.length, label: 'Total bookings' },
            { value: pendingCount, label: 'Pending' },
            { value: activeCount, label: 'Active' }
          ]}
          aside={(
            <SmartImage
              src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1280&auto=format&fit=crop"
              fallbackSrc="/tractor.svg"
              alt="Booking requests"
              className="page-hero-media"
            />
          )}
          actions={(
            <Link
              to={isAdminMode ? '/admin/dashboard' : '/owner/equipment'}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
            >
              {isAdminMode ? 'Open Dashboard' : 'Open Listings'}
            </Link>
          )}
        />

        <section className="page-split">
          <div className="page-main">
            <section className="card filter-shell">
              <div className="filter-bar two-col">
                <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search equipment or farmer" />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="filter-meta">
                <span>{visible.length} bookings visible</span>
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

              {visible.length ? (
                <div className="request-list">
                  {visible.map((item) => {
                    const status = normalizeBookingStatus(item.booking_status)
                    const paymentStatus = normalizePaymentStatus(item.payment_status)
                    const isActing = (action) => actingKey === `${item.id}:${action}`

                    return (
                      <article key={item.id} className="request-item">
                        <div className="request-details">
                          <h3>{item.equipment_name}</h3>
                          <p className="subtitle">{item.farmer_name || 'Farmer'} | {item.start_date} to {item.end_date}</p>
                          <p className="subtitle">Total {formatCurrency(item.total_amount)} | Payment {paymentStatus.replace(/_/g, ' ')}</p>
                          <div className="request-status-row">
                            <span className={`status-badge ${getBookingStatusClass(status)}`}>
                              {formatBookingStatusLabel(status)}
                            </span>
                            {paymentStatus === 'completed' && <span className="status-badge status-success">paid</span>}
                          </div>
                        </div>

                        <div className="request-actions">
                          <Link
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                            to={getBookingOperationsPath(item.id, user?.role)}
                          >
                            Open Ops
                          </Link>

                          {status === 'pending' && (
                            <>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="rounded-full"
                                disabled={Boolean(actingKey)}
                                onClick={() => runAction(item, 'approve', `Booking ${item.id} approved.`, 'Unable to approve booking.')}
                              >
                                {isActing('approve') ? 'Approving...' : 'Approve'}
                              </Button>
                              <Button
                                type="button"
                                variant="soil"
                                size="sm"
                                className="rounded-full"
                                disabled={Boolean(actingKey)}
                                onClick={() => runAction(item, 'reject', `Booking ${item.id} rejected.`, 'Unable to reject booking.')}
                              >
                                {isActing('reject') ? 'Rejecting...' : 'Reject'}
                              </Button>
                            </>
                          )}

                          {status === 'confirmed' && (
                            <>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="rounded-full"
                                disabled={Boolean(actingKey)}
                                onClick={() => runAction(item, 'start', `Booking ${item.id} is now in progress.`, 'Unable to start booking.')}
                              >
                                {isActing('start') ? 'Starting...' : 'Start rental'}
                              </Button>
                              {paymentStatus !== 'completed' && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full"
                                  disabled={Boolean(actingKey)}
                                  onClick={() => runAction(item, 'cancel', `Booking ${item.id} cancelled.`, 'Unable to cancel booking.')}
                                >
                                  {isActing('cancel') ? 'Cancelling...' : 'Cancel'}
                                </Button>
                              )}
                            </>
                          )}

                          {status === 'in_progress' && (
                            <>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="rounded-full"
                                disabled={Boolean(actingKey)}
                                onClick={() => runAction(item, 'complete', `Booking ${item.id} marked completed.`, 'Unable to complete booking.')}
                              >
                                {isActing('complete') ? 'Completing...' : 'Mark complete'}
                              </Button>
                            </>
                          )}

                          {!['pending', 'confirmed', 'in_progress'].includes(status) && (
                            <div className="button-row">
                              <p className="subtitle request-action-note">No further action is needed for this booking.</p>
                            </div>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <section className="card empty-state">
                  <h3>No bookings match current filters</h3>
                  <p className="subtitle">Widen your search or reset the filters to see the full booking queue again.</p>
                  <div className="button-row" style={{ justifyContent: 'center' }}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        setQ('')
                        setStatusFilter('all')
                      }}
                    >
                      Reset Filters
                    </Button>
                    <Link
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                      to={isAdminMode ? '/admin/dashboard' : '/owner/equipment'}
                    >
                      {isAdminMode ? 'Open Dashboard' : 'Open Listings'}
                    </Link>
                  </div>
                </section>
              )}
            </section>
          </div>

          <aside className="page-side">
            <section className="card">
              <h3>Lifecycle Summary</h3>
              <div className="panel-list-premium">
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">
                    <StatusIcon status="pending" size={18} strokeWidth={2.1} />
                  </div>
                  <div className="stat-info-wrap">
                    <strong>{statusSummary.pending}</strong>
                    <span>Pending approvals</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">
                    <StatusIcon status="in_progress" size={18} strokeWidth={2.1} />
                  </div>
                  <div className="stat-info-wrap">
                    <strong>{activeCount}</strong>
                    <span>Confirmed or active</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">
                    <StatusIcon status="completed" size={18} strokeWidth={2.1} />
                  </div>
                  <div className="stat-info-wrap">
                    <strong>{statusSummary.completed}</strong>
                    <span>Completed rentals</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">
                    <StatusIcon status="cancelled" size={18} strokeWidth={2.1} />
                  </div>
                  <div className="stat-info-wrap">
                    <strong>{closedCount}</strong>
                    <span>Closed bookings</span>
                  </div>
                </div>
              </div>
              <p className="panel-note">Use this queue to approve requests, start live jobs, close finished rentals, and open booking operations for tracking and service tickets.</p>
            </section>

            <section className="card">
              <h3>Recent Activity</h3>
              {recentRequests.length ? (
                <div className="panel-list-premium">
                  {recentRequests.map((item) => (
                    <div key={item.id} className="insight-stat-row">
                      <div className="stat-icon-wrap">
                        <StatusIcon status={item.booking_status || 'pending'} size={18} strokeWidth={2.1} />
                      </div>
                      <div className="stat-info-wrap">
                        <strong>{item.farmer_name || 'Farmer'}</strong>
                        <span>{item.equipment_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="subtitle">Latest request activity will appear here once new bookings arrive.</p>
              )}
            </section>

            <section className="card">
              <h3>Bulk Actions</h3>
              <p className="subtitle">Approve every pending booking currently visible in this filtered view.</p>
              <div className="button-row">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  disabled={actingKey === 'bulk-approve'}
                  onClick={approveAllVisible}
                >
                  {actingKey === 'bulk-approve' ? 'Approving...' : 'Approve all pending'}
                </Button>
                <Link
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                  to={isAdminMode ? '/admin/dashboard' : '/owner/equipment'}
                >
                  {isAdminMode ? 'Open Dashboard' : 'Open Listings'}
                </Link>
              </div>
            </section>
          </aside>
        </section>
      </DashboardShell>
    </div>
  )
}
