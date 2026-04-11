import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Banknote } from 'lucide-react'
import { Link } from 'react-router-dom'
import { bookingService } from '../../services/bookingService.js'
import BookingCard from '../../components/BookingCard.jsx'
import { StatusIcon } from '../../components/AppIcons.jsx'
import PageSkeleton from '../../components/PageSkeleton.jsx'
import PageHero from '../../components/PageHero.jsx'
import DashboardShell from '../../components/DashboardShell.jsx'
import SmartImage from '../../components/SmartImage.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import { countBookingsByStatuses, summarizeBookings } from '../../utils/bookings.js'
import { farmerDashboardLinks } from '../../utils/dashboardLinks.js'
import { useNotifications } from '../../context/NotificationContext.jsx'

export default function MyBookings() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const { notifications } = useNotifications()
  const lastNotificationRef = useRef(null)

  const refresh = async () => {
    const data = await bookingService.myBookings()
    setItems(data)
  }

  useEffect(() => {
    const latest = notifications[notifications.length - 1]
    if (!latest) return

    const interestingEvents = [
      'booking_approved',
      'booking_rejected',
      'booking_cancelled',
      'booking_completed',
      'booking_in_progress'
    ]

    if (latest.id && latest.id !== lastNotificationRef.current && interestingEvents.includes(latest.type)) {
      lastNotificationRef.current = latest.id
      refresh()
    }
  }, [notifications])

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

  const statusSummary = useMemo(() => summarizeBookings(items), [items])
  const activeCount = useMemo(
    () => countBookingsByStatuses(items, ['confirmed', 'in_progress']),
    [items]
  )
  const closedCount = useMemo(
    () => countBookingsByStatuses(items, ['completed', 'cancelled', 'rejected']),
    [items]
  )
  const stats = [
    { value: items.length, label: 'Total bookings' },
    { value: statusSummary.pending, label: 'Pending' },
    { value: activeCount, label: 'Active' },
    { value: closedCount, label: 'Closed' }
  ]
  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
    [items]
  )
  const recentBookings = useMemo(() => items.slice(0, 3), [items])
  if (loading) return <PageSkeleton variant="table" />

  return (
    <div className="container page-wrap">
      <DashboardShell title="Farmer Panel" subtitle="Booking center" links={farmerDashboardLinks}>
        <PageHero
          eyebrow="My Bookings"
          title="Track active and upcoming rentals"
          subtitle="Monitor status, schedule, and total amounts with a clear booking timeline."
          className="portal-primary"
          stats={stats}
          aside={
            <SmartImage
              src="https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop"
              fallbackSrc="/fields.svg"
              alt="Booking overview"
              className="page-hero-media"
            />
          }
          actions={<Link className="button outline" to="/farmer/equipments">Browse Equipment</Link>}
        />

        <section className="page-split">
          <div className="page-main">
            {items.length ? (
              <section className="feature-grid">
                {items.map((booking) => <BookingCard key={booking.id} booking={booking} onUpdated={refresh} />)}
              </section>
            ) : (
              <EmptyState
                eyebrow="Booking queue is clear"
                title="No bookings found"
                message="Your schedule is open right now. Start with a marketplace browse or return to your dashboard for the next best move."
                tips={[
                  'Browse equipment to request your first rental.',
                  'Use quick search to jump into popular categories.',
                  'Return to your dashboard to review saved equipment.'
                ]}
                actions={[
                  { to: '/farmer/equipments', label: 'Browse Equipment', className: 'button gradient' },
                  { to: '/farmer/dashboard', label: 'Open Dashboard', className: 'button outline' }
                ]}
              />
            )}
          </div>

          <aside className="page-side">
            <section className="card">
              <h3>Status Summary</h3>
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
                    <StatusIcon status="confirmed" size={18} strokeWidth={2.1} />
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
                    <strong>{statusSummary.cancelled + statusSummary.rejected}</strong>
                    <span>Cancelled or rejected</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">
                    <Banknote size={18} strokeWidth={2.1} aria-hidden="true" />
                  </div>
                  <div className="stat-info-wrap">
                    <strong>${totalAmount.toLocaleString()}</strong>
                    <span>Total spend</span>
                  </div>
                </div>
              </div>
              <p className="panel-note">Bookings move from pending to confirmed, active, and completed as work progresses.</p>
            </section>

            <section className="card">
              <h3>Recent Activity</h3>
              {recentBookings.length ? (
                <div className="panel-list-premium">
                  {recentBookings.map((item) => (
                    <div key={item.id} className="insight-stat-row">
                      <div className="stat-icon-wrap">
                        <StatusIcon status={item.booking_status || 'pending'} size={18} strokeWidth={2.1} />
                      </div>
                      <div className="stat-info-wrap">
                        <strong>{item.equipment_name}</strong>
                        <span>{item.start_date} to {item.end_date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="subtitle">Recent booking updates will appear here after your first request.</p>
              )}
            </section>

            <section className="card">
              <h3>Next Steps</h3>
              <ul className="feature-list">
                <li><span>Browse equipment to book new rentals.</span></li>
                <li><span>Use search to compare rates across categories.</span></li>
                <li><span>Pay confirmed bookings and track active rentals here.</span></li>
              </ul>
              <div className="button-row">
                <Link className="button sm secondary pill hover-lift" to="/farmer/equipments">Browse Equipment</Link>
                <Link className="button sm outline pill hover-lift" to="/farmer/payments">Payment History</Link>
                <Link className="button sm outline pill hover-lift" to="/search?q=tractor">Quick Search</Link>
              </div>
            </section>
          </aside>
        </section>
      </DashboardShell>
    </div>
  )
}
