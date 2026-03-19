import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { equipmentService } from '../../services/equipmentService.js';
import { bookingService } from '../../services/bookingService.js';
import EquipmentCard from '../../components/EquipmentCard.jsx';
import PageHero from '../../components/PageHero.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import SmartImage from '../../components/SmartImage.jsx';
import DashboardShell from '../../components/DashboardShell.jsx';

export default function OwnerDashboard() {
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    equipmentService.mine().then(setItems).catch(() => { });
    bookingService.requests().then((data) => setRequests(data.slice(0, 6))).catch(() => { });
  }, []);

  const avgRate = useMemo(() => {
    if (!items.length) return 0;
    const total = items.reduce((sum, item) => sum + Number(item.daily_rate || 0), 0);
    return Math.round(total / items.length);
  }, [items]);
  const rateSnapshot = useMemo(
    () => items.slice(0, 5).map((item) => ({ id: item.id, name: item.name, rate: Number(item.daily_rate || 0) })),
    [items]
  )
  const confirmedCount = useMemo(() => requests.filter(r => r.booking_status === 'confirmed').length, [requests])
  const stats = [
    { value: items.length, label: 'Active listings' },
    { value: `$${avgRate}`, label: 'Average daily rate' },
    { value: requests.filter(r => r.booking_status === 'pending').length, label: 'Pending requests' },
    { value: confirmedCount, label: 'Confirmed rentals' }
  ]

  const sidebarLinks = [
    { to: '/owner/dashboard', label: 'Dashboard' },
    { to: '/owner/add-equipment', label: 'Add Equipment' },
    { to: '/owner/equipment', label: 'My Listings' },
    { to: '/owner/requests', label: 'Rental Requests' },
    { to: '/', label: 'Home' }
  ];

  return (
    <div className="container page-wrap">
      <DashboardShell
        title="Owner Panel"
        subtitle="Business controls"
        links={sidebarLinks}
      >
        <PageHero
          eyebrow="Business Control"
          title="Scale your rental operations"
          subtitle="Manage inventory, track rental performance, and maintain high satisfaction across your machinery fleet."
          className="portal-secondary"
          stats={stats}
          aside={
            <div className="hero-visual-wrapper">
              <SmartImage
                src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1280&auto=format&fit=crop"
                fallbackSrc="/tractor.svg"
                alt="Owner operations"
                className="page-hero-media"
              />
              <div className="hero-floating-card">
                <div className="card-mini-stat">
                  <span>${avgRate}</span>
                  <small>Avg. Payout</small>
                </div>
              </div>
            </div>
          }
          actions={
            <div className="button-row">
              <Link className="button gradient pill" to="/owner/add-equipment">Add Listing</Link>
              <Link className="button outline pill" to="/owner/requests">Manage Requests</Link>
            </div>
          }
        />

        <section className="dashboard-grid-premium">
          <article className="card stat-card-premium hover-lift">
            <span className="stat-label">Active Listings</span>
            <span className="stat-value">{items.length}</span>
            <p className="subtitle">Visible machines in marketplace</p>
          </article>
          <article className="card stat-card-premium hover-lift">
            <span className="stat-label">Action Required</span>
            <span className="stat-value">{requests.filter(r => r.booking_status === 'pending').length}</span>
            <p className="subtitle">Rental requests awaiting approval</p>
          </article>
          <article className="card stat-card-premium hover-lift">
            <span className="stat-label">Operational Yield</span>
            <span className="stat-value">{confirmedCount}</span>
            <p className="subtitle">Successful bookings completed</p>
          </article>
        </section>

        <section className="details-grid">
          <article className="card dashboard-widget">
            <h3>Listing Rate Snapshot</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Equipment</th>
                    <th>Daily Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {rateSnapshot.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>${item.rate.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rateSnapshot.length && <p className="subtitle">No listing rates available.</p>}
          </article>
          <article className="card dashboard-widget">
            <h3>Booking Requests</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Farmer</th>
                    <th>Equipment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((item) => (
                    <tr key={item.id}>
                      <td>{item.farmer_name || 'Farmer'}</td>
                      <td>{item.equipment_name}</td>
                      <td>
                        <span className={`status-badge status-${item.booking_status === 'confirmed' ? 'success' : item.booking_status === 'rejected' ? 'error' : 'pending'}`}>
                          {item.booking_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!requests.length && <p className="subtitle">No booking requests yet.</p>}
          </article>
        </section>

        <section className="card role-insight owner-theme hover-lift">
          <div className="insight-visual">
            <SmartImage
              src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1280&auto=format&fit=crop"
              fallbackSrc="/tractor.svg"
              alt="Equipment owner operations"
              loading="lazy"
            />
          </div>
          <div className="insight-content">
            <span className="insight-badge">Revenue Insight</span>
            <h3>Optimization Strategy</h3>
            <p className="subtitle">
              Owners with high-resolution photos and verified service logs see a 40% higher booking rate than average listings.
            </p>
            <div className="button-row">
              <Link className="button sm secondary pill" to="/owner/requests">Review Queue</Link>
              <Link className="button sm outline pill" to="/owner/equipment">Audit Fleet</Link>
            </div>
          </div>
        </section>

        {items.length > 0 ? (
          <section className="feature-grid">
            {items.map((item) => <EquipmentCard key={item.id} equipment={item} />)}
          </section>
        ) : (
          <EmptyState
            title="No equipment listed yet"
            message="Get started by adding your first piece of equipment to the marketplace."
            action={{ to: '/owner/add-equipment', label: 'Add Equipment' }}
          />
        )}
      </DashboardShell>
    </div>
  );
}
