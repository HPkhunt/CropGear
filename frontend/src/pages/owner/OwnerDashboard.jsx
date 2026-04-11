import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingService } from '../../services/bookingService.js';
import { equipmentService } from '../../services/equipmentService.js';
import DashboardShell from '../../components/DashboardShell.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import EquipmentCard from '../../components/EquipmentCard.jsx';
import PageHero from '../../components/PageHero.jsx';
import PageSkeleton from '../../components/PageSkeleton.jsx';
import SmartImage from '../../components/SmartImage.jsx';
import { ownerDashboardLinks } from '../../utils/dashboardLinks.js';
import { getErrorMessage } from '../../utils/helpers.js';
import { Alert, AlertDescription } from '@/components/ui/alert'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  countBookingsByStatuses,
  formatBookingStatusLabel,
  getBookingStatusClass,
  summarizeBookings
} from '../../utils/bookings.js';

export default function OwnerDashboard() {
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      const [equipmentResult, requestResult] = await Promise.allSettled([
        equipmentService.mine(),
        bookingService.requests()
      ]);

      if (equipmentResult.status === 'fulfilled') {
        setItems(Array.isArray(equipmentResult.value) ? equipmentResult.value : []);
      } else {
        setItems([]);
      }

      if (requestResult.status === 'fulfilled') {
        setRequests(Array.isArray(requestResult.value) ? requestResult.value : []);
      } else {
        setRequests([]);
      }

      const failures = [equipmentResult, requestResult].filter((result) => result.status === 'rejected');
      if (failures.length > 0) {
        setError(getErrorMessage(failures[0].reason, 'Some owner insights are unavailable right now.'));
      }

      setLoading(false);
    };

    loadDashboard();
  }, []);

  const avgRate = useMemo(() => {
    if (!items.length) return 0;
    const total = items.reduce((sum, item) => sum + Number(item.daily_rate || 0), 0);
    return Math.round(total / items.length);
  }, [items]);
  const bookingSummary = useMemo(() => summarizeBookings(requests), [requests]);
  const activeRentalCount = useMemo(
    () => countBookingsByStatuses(requests, ['confirmed', 'in_progress']),
    [requests]
  );
  const availableCount = useMemo(
    () => items.filter((item) => item.is_available !== false).length,
    [items]
  );
  const unavailableCount = items.length - availableCount;
  const recentRequests = useMemo(() => requests.slice(0, 6), [requests]);
  const recentListings = useMemo(() => items.slice(0, 4), [items]);
  const stats = [
    { value: items.length, label: 'Active listings' },
    { value: `$${avgRate}`, label: 'Average daily rate' },
    { value: bookingSummary.pending, label: 'Pending requests' },
    { value: activeRentalCount, label: 'Active rentals' }
  ];

  if (loading) return <PageSkeleton variant="dashboard" />;

  return (
    <div className="container page-wrap">
      <DashboardShell
        title="Owner Panel"
        subtitle="Business controls"
        links={ownerDashboardLinks}
      >
        <PageHero
          eyebrow="Business Control"
          title="Scale your rental operations"
          subtitle="Manage inventory, track rental demand, and keep your machinery fleet ready for the next booking."
          className="portal-secondary"
          stats={stats}
          aside={(
            <div className="hero-visual-wrapper">
              <SmartImage
                src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1280&auto=format&fit=crop"
                fallbackSrc="/tractor.svg"
                alt="Owner operations"
                className="page-hero-media"
              />
              <div className="hero-floating-card">
                <div className="card-mini-stat">
                  <span>{activeRentalCount}</span>
                  <small>Active Rentals</small>
                </div>
              </div>
            </div>
          )}
          actions={(
            <div className="flex flex-wrap gap-2">
              <Link
                to="/owner/add-equipment"
                className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'rounded-full')}
              >
                Add listing
              </Link>
              <Link
                to="/owner/requests"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
              >
                Manage requests
              </Link>
            </div>
          )}
        />

        {error && (
          <Alert variant="destructive" className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-slate-900">{error}</span>
              <button
                type="button"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                onClick={() => setError('')}
              >
                Dismiss
              </button>
            </AlertDescription>
          </Alert>
        )}

        <section className="dashboard-grid-premium">
          <Link className="card stat-card-premium hover-lift dashboard-summary-link" to="/owner/equipment">
            <span className="stat-label">Active Listings</span>
            <span className="stat-value">{items.length}</span>
            <p className="subtitle">Visible machines in marketplace</p>
            <span className="dashboard-summary-cta">Open inventory</span>
          </Link>
          <Link className="card stat-card-premium hover-lift dashboard-summary-link" to="/owner/requests">
            <span className="stat-label">Action Required</span>
            <span className="stat-value">{bookingSummary.pending}</span>
            <p className="subtitle">Rental requests awaiting approval</p>
            <span className="dashboard-summary-cta">Review request queue</span>
          </Link>
          <Link className="card stat-card-premium hover-lift dashboard-summary-link" to="/owner/equipment">
            <span className="stat-label">Availability Mix</span>
            <span className="stat-value">{availableCount}</span>
            <p className="subtitle">{unavailableCount} listing{unavailableCount === 1 ? '' : 's'} currently unavailable</p>
            <span className="dashboard-summary-cta">Audit fleet status</span>
          </Link>
        </section>

        <section className="details-grid">
          <article className="card dashboard-widget">
            <h3>Inventory Snapshot</h3>
            <ul className="feature-list">
              <li><strong>{items.length}</strong><span>Total listings</span></li>
              <li><strong>{availableCount}</strong><span>Available now</span></li>
              <li><strong>{unavailableCount}</strong><span>Temporarily unavailable</span></li>
              <li><strong>${avgRate}</strong><span>Average daily rate</span></li>
            </ul>
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
                  {recentRequests.map((item) => (
                    <tr key={item.id}>
                      <td>{item.farmer_name || 'Farmer'}</td>
                      <td>{item.equipment_name}</td>
                      <td>
                        <span className={`status-badge ${getBookingStatusClass(item.booking_status)}`}>
                          {formatBookingStatusLabel(item.booking_status)}
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

        <section className="details-grid">
          <article className="card dashboard-widget">
            <h3>Recent Listings</h3>
            {recentListings.length ? (
              <div className="panel-list-premium">
                {recentListings.map((item) => (
                  <div key={item.id} className="insight-stat-row">
                    <div className="stat-info-wrap">
                      <strong>{item.name}</strong>
                      <span>{item.is_available !== false ? 'Available now' : 'Temporarily unavailable'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="subtitle">New listings will appear here once you publish equipment.</p>
            )}
          </article>

          <article className="card dashboard-widget">
            <h3>Operations Checklist</h3>
            <ul className="feature-list">
              <li><span>Review pending rental requests daily.</span></li>
              <li><span>Keep availability current before peak demand windows.</span></li>
              <li><span>Refresh rates and specs when equipment status changes.</span></li>
            </ul>
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
            <span className="insight-badge">Fleet Insight</span>
            <h3>Availability drives repeat bookings</h3>
            <p className="subtitle">
              You currently have {availableCount} active listing{availableCount === 1 ? '' : 's'} and {bookingSummary.pending} pending request{bookingSummary.pending === 1 ? '' : 's'}. Keep availability and pricing current to convert demand faster.
            </p>
            <div className="button-row">
              <Link className="button sm secondary pill" to="/owner/requests">Open Requests</Link>
              <Link className="button sm outline pill" to="/owner/equipment">Audit Fleet</Link>
              <Link className="button sm outline pill" to="/owner/add-equipment">Add Listing</Link>
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
