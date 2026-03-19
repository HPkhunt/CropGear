import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { equipmentService } from '../../services/equipmentService.js'
import { bookingService } from '../../services/bookingService.js'
import EquipmentCard from '../../components/EquipmentCard.jsx'
import PageHero from '../../components/PageHero.jsx'
import { getFavoriteEquipmentIds } from '../../utils/favorites.js'
import SmartImage from '../../components/SmartImage.jsx'
import DashboardShell from '../../components/DashboardShell.jsx'

export default function FarmerDashboard() {
  const [featured, setFeatured] = useState([])
  const [bookings, setBookings] = useState([])
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [equipmentCount, setEquipmentCount] = useState(0)
  const [avgRating, setAvgRating] = useState(4.5)

  useEffect(() => {
    equipmentService.list().then(items => {
      if (items && Array.isArray(items)) {
        setFeatured(items.slice(0, 4))
        setEquipmentCount(items.length)
        if (items.length) {
          const total = items.reduce((sum, item) => sum + Number(item.rating || 4.5), 0)
          setAvgRating((total / items.length).toFixed(1))
        }
      }
    }).catch(err => console.warn('Dashboard fetch error', err))
    bookingService.myBookings().then((data) => {
      if (data && Array.isArray(data)) {
        setBookings(data.slice(0, 5))
      }
    }).catch(() => { })
    setFavoriteCount(getFavoriteEquipmentIds().length)
  }, [])

  const stats = useMemo(
    () => [
      { value: `${equipmentCount}+`, label: 'Available units' },
      { value: `${avgRating}`, label: 'Average rating' },
      { value: `${favoriteCount}`, label: 'Saved equipment' },
      { value: '24h', label: 'Response target' }
    ],
    [favoriteCount, equipmentCount, avgRating]
  )
  const bookingBreakdown = useMemo(() => {
    const counts = { pending: 0, confirmed: 0, rejected: 0 }
    bookings.forEach((item) => {
      const key = (item.booking_status || '').toLowerCase()
      if (key in counts) counts[key] += 1
    })
    return counts
  }, [bookings])

  const sidebarLinks = [
    { to: '/farmer/dashboard', label: 'Dashboard' },
    { to: '/farmer/equipments', label: 'Browse Equipment' },
    { to: '/farmer/bookings', label: 'My Bookings' },
    { to: '/', label: 'Home' }
  ]

  return (
    <div className="container page-wrap">
      <DashboardShell
        title="Farmer Panel"
        subtitle="Daily operations"
        links={sidebarLinks}
      >
        <PageHero
          eyebrow="Farmer Operations"
          title="Field readiness at your fingertips"
          subtitle="Monitor your bookings, explore high-performance equipment, and prep for the upcoming season."
          className="portal-primary"
          stats={stats}
          aside={
            <div className="hero-visual-wrapper">
              <SmartImage
                src="https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop"
                fallbackSrc="/fields.svg"
                alt="Field planning"
                className="page-hero-media"
              />
              <div className="hero-floating-card">
                <div className="card-mini-stat">
                  <span>{equipmentCount}</span>
                  <small>Nearby Units</small>
                </div>
              </div>
            </div>
          }
          actions={
            <div className="button-row">
              <Link className="button gradient pill" to="/farmer/equipments">Browse Marketplace</Link>
              <Link className="button outline pill" to="/farmer/bookings">My Jobs</Link>
            </div>
          }
        />

        <section className="dashboard-grid-premium">
          <article className="card stat-card-premium hover-lift">
            <span className="stat-label">Upcoming Jobs</span>
            <span className="stat-value">{bookings.filter(b => b.booking_status === 'confirmed').length}</span>
            <p className="subtitle">Confirmed rentals for this week</p>
          </article>
          <article className="card stat-card-premium hover-lift">
            <span className="stat-label">Pending Approval</span>
            <span className="stat-value">{bookingBreakdown.pending}</span>
            <p className="subtitle">Waiting for owner response</p>
          </article>
          <article className="card stat-card-premium hover-lift">
            <span className="stat-label">Saved Machines</span>
            <span className="stat-value">{favoriteCount}</span>
            <p className="subtitle">Equipment in your watchlist</p>
          </article>
        </section>

        <section className="details-grid">
          <article className="card dashboard-widget">
            <h3>Recent Bookings</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Equipment</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((item) => (
                    <tr key={item.id}>
                      <td>{item.equipment_name}</td>
                      <td>
                        <span className={`status-badge status-${item.booking_status === 'confirmed' ? 'success' : item.booking_status === 'rejected' ? 'error' : 'pending'}`}>
                          {item.booking_status}
                        </span>
                      </td>
                      <td>${Number(item.total_amount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!bookings.length && <p className="subtitle">No bookings yet.</p>}
          </article>
          <article className="card dashboard-widget">
            <h3>Booking Status Summary</h3>
            <ul className="feature-list">
              <li><strong>{bookings.length}</strong><span>Total bookings</span></li>
              <li><strong>{bookingBreakdown.pending}</strong><span>Pending approvals</span></li>
              <li><strong>{bookingBreakdown.confirmed}</strong><span>Confirmed bookings</span></li>
              <li><strong>{bookingBreakdown.rejected}</strong><span>Rejected bookings</span></li>
            </ul>
          </article>
        </section>

        <section className="card role-insight farmer-theme hover-lift">
          <div className="insight-visual">
            <SmartImage
              src="https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop"
              fallbackSrc="/fields.svg"
              alt="Farmer planning fields"
              loading="lazy"
            />
          </div>
          <div className="insight-content">
            <span className="insight-badge">Pro Tip</span>
            <h3>Seasonal Efficiency</h3>
            <p className="subtitle">
              Book your harvest equipment 2 weeks in advance to secure the best rates and guaranteed availability.
            </p>
            <div className="button-row">
              <Link className="button sm secondary pill" to="/farmer/bookings">Check Schedule</Link>
              <Link className="button sm outline pill" to="/farmer/equipments">Find New Gear</Link>
            </div>
          </div>
        </section>

        <section className="feature-grid">
          {featured.map((item) => (
            <EquipmentCard
              key={item.id}
              equipment={item}
              onFavoriteChange={(ids) => setFavoriteCount(ids.length)}
            />
          ))}
        </section>
      </DashboardShell>
    </div>
  )
}
