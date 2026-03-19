import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { equipmentService } from '../../services/equipmentService.js'
import EquipmentCard from '../../components/EquipmentCard.jsx'
import PageSkeleton from '../../components/PageSkeleton.jsx'
import PageHero from '../../components/PageHero.jsx'
import DashboardShell from '../../components/DashboardShell.jsx'
import SmartImage from '../../components/SmartImage.jsx'

export default function MyEquipment() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await equipmentService.mine()
        setItems(data)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])
  const availableCount = items.filter((item) => item.is_available !== false).length
  const unavailableCount = items.length - availableCount
  const sidebarLinks = [
    { to: '/owner/dashboard', label: 'Dashboard' },
    { to: '/owner/add-equipment', label: 'Add Equipment' },
    { to: '/owner/equipment', label: 'My Listings' },
    { to: '/owner/requests', label: 'Rental Requests' },
    { to: '/', label: 'Home' }
  ]

  if (loading) return <PageSkeleton variant="grid" />

  return (
    <div className="container page-wrap">
      <DashboardShell title="Owner Panel" subtitle="Inventory center" links={sidebarLinks}>
        <PageHero
          eyebrow="My Equipment"
          title="All equipment listed by your account"
          subtitle="Review details and performance of every active listing."
          className="portal-secondary"
          stats={[{ value: items.length, label: 'Active listings' }]}
          aside={
            <SmartImage
              src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1280&auto=format&fit=crop"
              fallbackSrc="/tractor.svg"
              alt="Equipment inventory"
              className="page-hero-media"
            />
          }
          actions={<Link className="button gradient" to="/owner/add-equipment">Add Equipment</Link>}
        />

        <section className="page-split">
          <div className="page-main">
            {items.length ? (
              <section className="feature-grid">
                {items.map((item) => <EquipmentCard key={item.id} equipment={item} />)}
              </section>
            ) : (
              <section className="card empty-state">
                <h3>No equipment listed yet</h3>
                <p className="subtitle">Use Add Equipment to publish your first machine.</p>
              </section>
            )}
          </div>

          <aside className="page-side">
            <section className="card">
              <h3>Inventory Summary</h3>
              <div className="panel-list-premium">
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">📦</div>
                  <div className="stat-info-wrap">
                    <strong>{items.length}</strong>
                    <span>Total listings</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">🟢</div>
                  <div className="stat-info-wrap">
                    <strong>{availableCount}</strong>
                    <span>Available now</span>
                  </div>
                </div>
                <div className="insight-stat-row">
                  <div className="stat-icon-wrap">🔴</div>
                  <div className="stat-info-wrap">
                    <strong>{unavailableCount}</strong>
                    <span>Unavailable</span>
                  </div>
                </div>
              </div>
              <p className="panel-note">Keep specs and photos updated for better conversion.</p>
            </section>

            <section className="card">
              <h3>Listing Checklist</h3>
              <ul className="feature-list">
                <li><span>Confirm equipment availability status.</span></li>
                <li><span>Review daily rate and seasonal pricing.</span></li>
                <li><span>Refresh description and specs.</span></li>
              </ul>
              <div className="button-row">
                <Link className="button sm secondary pill hover-lift" to="/owner/add-equipment">Add Equipment</Link>
                <Link className="button sm outline pill hover-lift" to="/owner/requests">View Requests</Link>
              </div>
            </section>
          </aside>
        </section>
      </DashboardShell>
    </div>
  )
}
