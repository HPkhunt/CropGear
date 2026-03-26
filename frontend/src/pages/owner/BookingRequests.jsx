import React, { useEffect, useMemo, useState } from 'react'
import { Clock, CheckCircle, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { bookingService } from '../../services/bookingService.js'
import PageSkeleton from '../../components/PageSkeleton.jsx'
import PageHero from '../../components/PageHero.jsx'
import { getErrorMessage } from '../../utils/helpers.js'
import DashboardShell from '../../components/DashboardShell.jsx'
import SmartImage from '../../components/SmartImage.jsx'

export default function BookingRequests() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [q, setQ] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')

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
    return items
      .filter((item) => (statusFilter === 'all' ? true : item.booking_status === statusFilter))
      .filter((item) => {
        const search = q.toLowerCase().trim()
        return !search || item.equipment_name.toLowerCase().includes(search)
      })
  }, [items, statusFilter, q])
  const pendingCount = items.filter((item) => item.booking_status === 'pending').length
  const statusSummary = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const status = item.booking_status || 'pending'
        if (status === 'confirmed') acc.confirmed += 1
        else if (status === 'rejected') acc.rejected += 1
        else acc.pending += 1
        return acc
      },
      { pending: 0, confirmed: 0, rejected: 0 }
    )
  }, [items])
  const sidebarLinks = [
    { to: '/owner/dashboard', label: 'Dashboard' },
    { to: '/owner/add-equipment', label: 'Add Equipment' },
    { to: '/owner/equipment', label: 'My Listings' },
    { to: '/owner/requests', label: 'Rental Requests' },
    { to: '/', label: 'Home' }
  ]

  const approveAllVisible = async () => {
    setActionError('')
    setActionMessage('')
    try {
      for (const item of visible.filter((v) => v.booking_status === 'pending')) {
        await bookingService.approve(item.id)
      }
      setActionMessage('All visible pending requests were approved.')
      await refresh()
    } catch (error) {
      setActionError(getErrorMessage(error, 'Unable to approve all requests.'))
    }
  }

  if (loading) return <PageSkeleton variant="table" />

  return (
    <div className="container page-wrap">
      <DashboardShell title="Owner Panel" subtitle="Request center" links={sidebarLinks}>
        <PageHero
          eyebrow="Booking Requests"
          title="Review incoming requests with bulk actions"
          subtitle="Filter by status, search equipment names, and approve requests quickly."
          className="portal-secondary"
          stats={[
            { value: items.length, label: 'Total requests' },
            { value: pendingCount, label: 'Pending' },
            { value: visible.length, label: 'Visible' }
          ]}
          aside={
            <SmartImage
              src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1280&auto=format&fit=crop"
              fallbackSrc="/tractor.svg"
              alt="Booking requests"
              className="page-hero-media"
            />
          }
          actions={<Link className="button outline" to="/owner/equipment">Open Listings</Link>}
        />

        <section className="page-split">
          <div className="page-main">
            <section className="card filter-shell">
              <div className="filter-bar two-col">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search equipment name" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="filter-meta">
                <span>{visible.length} requests visible</span>
              </div>
            </section>

            <section className="card">
              {actionMessage && <p className="success-banner">{actionMessage}</p>}
              {actionError && <p className="error-banner">{actionError}</p>}
              {visible.length ? (
                <div className="request-list">
                  {visible.map((item) => (
                    <article key={item.id} className="request-item">
                      <div>
                        <h3>{item.equipment_name}</h3>
                        <p className="subtitle">{item.start_date} to {item.end_date}</p>
                        <span className={`status-badge status-${item.booking_status === 'confirmed' ? 'success' : item.booking_status === 'rejected' ? 'error' : 'pending'}`}>
                          {item.booking_status}
                        </span>
                      </div>

                      <div className="request-actions">
                        <button
                          className="button sm secondary"
                          disabled={item.booking_status !== 'pending'}
                          onClick={async () => {
                            setActionError('')
                            setActionMessage('')
                            try {
                              await bookingService.approve(item.id)
                              setActionMessage(`Request ${item.id} approved.`)
                              await refresh()
                            } catch (error) {
                              setActionError(getErrorMessage(error, 'Unable to approve request.'))
                            }
                          }}
                        >
                          Approve
                        </button>
                        <button
                          className="button sm dark"
                          disabled={item.booking_status !== 'pending'}
                          onClick={async () => {
                            setActionError('')
                            setActionMessage('')
                            try {
                              await bookingService.reject(item.id)
                              setActionMessage(`Request ${item.id} rejected.`)
                              await refresh()
                            } catch (error) {
                              setActionError(getErrorMessage(error, 'Unable to reject request.'))
                            }
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="subtitle">No requests match current filters.</p>
              )}
            </section>
          </div>

          <aside className="page-side">
            <section className="card">
              <h3>Request Summary</h3>
              <div className="panel-list-premium">
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap"><Clock size={18} /></div>
                  <div className="stat-info-wrap">
                    <strong>{statusSummary.pending}</strong>
                    <span>Pending requests</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap"><CheckCircle size={18} /></div>
                  <div className="stat-info-wrap">
                    <strong>{statusSummary.confirmed}</strong>
                    <span>Confirmed</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap"><XCircle size={18} /></div>
                  <div className="stat-info-wrap">
                    <strong>{statusSummary.rejected}</strong>
                    <span>Rejected</span>
                  </div>
                </div>
              </div>
              <p className="panel-note">Respond quickly to improve acceptance rates.</p>
            </section>

            <section className="card">
              <h3>Bulk Actions</h3>
              <p className="subtitle">Approve every pending request currently visible.</p>
              <div className="button-row">
                <button className="button sm secondary pill hover-lift" onClick={approveAllVisible}>Approve all pending</button>
                <Link className="button sm outline pill hover-lift" to="/owner/equipment">Open Listings</Link>
              </div>
            </section>
          </aside>
        </section>
      </DashboardShell>
    </div>
  )
}
