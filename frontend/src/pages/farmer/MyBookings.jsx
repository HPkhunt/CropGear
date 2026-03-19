import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { bookingService } from '../../services/bookingService.js'
import BookingCard from '../../components/BookingCard.jsx'
import PageSkeleton from '../../components/PageSkeleton.jsx'
import PageHero from '../../components/PageHero.jsx'
import DashboardShell from '../../components/DashboardShell.jsx'
import SmartImage from '../../components/SmartImage.jsx'

export default function MyBookings() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await bookingService.myBookings()
        setItems(data)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const statusSummary = useMemo(() => {
    const counts = { pending: 0, confirmed: 0, rejected: 0 }
    items.forEach((item) => {
      const key = (item.booking_status || '').toLowerCase()
      if (key in counts) counts[key] += 1
    })
    return counts
  }, [items])
  const stats = [
    { value: items.length, label: 'Total bookings' },
    { value: statusSummary.pending, label: 'Pending' },
    { value: statusSummary.confirmed, label: 'Confirmed' },
    { value: statusSummary.rejected, label: 'Rejected' }
  ]
  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
    [items]
  )
  const sidebarLinks = [
    { to: '/farmer/dashboard', label: 'Dashboard' },
    { to: '/farmer/equipments', label: 'Browse Equipment' },
    { to: '/farmer/bookings', label: 'My Bookings' },
    { to: '/', label: 'Home' }
  ]

  if (loading) return <PageSkeleton variant="table" />

  return (
    <div className="container page-wrap">
      <DashboardShell title="Farmer Panel" subtitle="Booking center" links={sidebarLinks}>
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
                {items.map((booking) => <BookingCard key={booking.id} booking={booking} />)}
              </section>
            ) : (
              <section className="card empty-state">
                <h3>No bookings found</h3>
                <p className="subtitle">Browse equipment to create your first booking.</p>
              </section>
            )}
          </div>

          <aside className="page-side">
            <section className="card">
              <h3>Status Summary</h3>
              <div className="panel-list-premium">
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">⏳</div>
                  <div className="stat-info-wrap">
                    <strong>{statusSummary.pending}</strong>
                    <span>Pending approvals</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">✅</div>
                  <div className="stat-info-wrap">
                    <strong>{statusSummary.confirmed}</strong>
                    <span>Confirmed bookings</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">❌</div>
                  <div className="stat-info-wrap">
                    <strong>{statusSummary.rejected}</strong>
                    <span>Rejected requests</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">💰</div>
                  <div className="stat-info-wrap">
                    <strong>${totalAmount.toLocaleString()}</strong>
                    <span>Total spend</span>
                  </div>
                </div>
              </div>
              <p className="panel-note">Confirmed bookings will appear in owner schedules.</p>
            </section>

            <section className="card">
              <h3>Next Steps</h3>
              <ul className="feature-list">
                <li><span>Browse equipment to book new rentals.</span></li>
                <li><span>Use search to compare rates across categories.</span></li>
                <li><span>Review confirmed bookings before field day.</span></li>
              </ul>
              <div className="button-row">
                <Link className="button sm secondary pill hover-lift" to="/farmer/equipments">Browse Equipment</Link>
                <Link className="button sm outline pill hover-lift" to="/search?q=tractor">Quick Search</Link>
              </div>
            </section>
          </aside>
        </section>
      </DashboardShell>
    </div>
  )
}
