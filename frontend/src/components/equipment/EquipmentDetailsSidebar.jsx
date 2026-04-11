import React from 'react'
import { ClipboardList, MapPin, Tag, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function EquipmentDetailsSidebar({
  ownerName,
  location,
  category,
  specCount,
  browsePath,
  onCopyLink
}) {
  return (
    <aside className="page-side">
      <section className="card">
        <h3>Listing Summary</h3>
        <div className="panel-list-premium">
          <div className="insight-stat-row">
            <div className="stat-icon-wrap">
              <UserRound size={18} strokeWidth={2.1} aria-hidden="true" />
            </div>
            <div className="stat-info-wrap">
              <strong>{ownerName}</strong>
              <span>Owner</span>
            </div>
          </div>
          <div className="insight-stat-row">
            <div className="stat-icon-wrap">
              <MapPin size={18} strokeWidth={2.1} aria-hidden="true" />
            </div>
            <div className="stat-info-wrap">
              <strong>{location || 'Location'}</strong>
              <span>Location</span>
            </div>
          </div>
          <div className="insight-stat-row">
            <div className="stat-icon-wrap">
              <Tag size={18} strokeWidth={2.1} aria-hidden="true" />
            </div>
            <div className="stat-info-wrap">
              <strong>{category || 'Category'}</strong>
              <span>Category</span>
            </div>
          </div>
          <div className="insight-stat-row">
            <div className="stat-icon-wrap">
              <ClipboardList size={18} strokeWidth={2.1} aria-hidden="true" />
            </div>
            <div className="stat-info-wrap">
              <strong>{specCount}</strong>
              <span>Specs listed</span>
            </div>
          </div>
        </div>
        <p className="panel-note">Confirm dates before sending a booking request.</p>
      </section>

      <section className="card">
        <h3>Booking Checklist</h3>
        <ul className="feature-list">
          <li><span>Match equipment capacity with field size.</span></li>
          <li><span>Confirm pickup and return dates.</span></li>
          <li><span>Confirm specs and availability status.</span></li>
        </ul>
        <div className="button-row">
          <Link className="button sm secondary pill hover-lift" to={browsePath}>Browse More</Link>
          <button className="button sm outline pill hover-lift" onClick={onCopyLink}>Copy Link</button>
        </div>
      </section>
    </aside>
  )
}
