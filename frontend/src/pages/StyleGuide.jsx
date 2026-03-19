import React from 'react'
import PageHero from '../components/PageHero.jsx'
import EquipmentCard from '../components/EquipmentCard.jsx'
import BookingCard from '../components/BookingCard.jsx'
import SmartImage from '../components/SmartImage.jsx'

const sampleEquipment = {
  id: 'style-equipment-1',
  name: 'John Deere 7R 310',
  category: 'tractor',
  location: 'Fresno, CA',
  daily_rate: 420,
  rating: 4.8,
  review_count: 36,
  availability_status: 'available',
  owner_name: 'West Valley Rentals'
}

const sampleBooking = {
  id: 'style-booking-1',
  equipment_name: 'Great Plains Seeder Drill',
  start_date: '2026-03-10',
  end_date: '2026-03-14',
  booking_status: 'pending',
  total_amount: 1280
}

export default function StyleGuide() {
  return (
    <div className="container page-wrap style-guide-page">
      <PageHero
        eyebrow="Design System"
        title="CropGear visual language and reusable patterns"
        subtitle="Reference the canonical button styles, cards, forms, and status treatments used across the app."
        className="portal-secondary"
        aside={
          <SmartImage
            src="https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop"
            fallbackSrc="/hero.svg"
            alt="Design system preview"
            className="page-hero-media"
          />
        }
      />

      <section className="style-guide-layout">
        <div className="style-guide-main">
          <section className="card docs-banner">
            <SmartImage
              src="https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop"
              fallbackSrc="/hero.svg"
              alt="Design board"
              loading="lazy"
            />
            <div>
              <h3>Production Visual Kit</h3>
              <p className="subtitle">Typography, color surfaces, cards, and interactions are fully integrated across all pages.</p>
            </div>
          </section>

          <section className="card">
            <h2>Buttons</h2>
            <div className="button-row">
              <button className="button gradient">Primary</button>
              <button className="button secondary">Secondary</button>
              <button className="button outline">Outline</button>
              <button className="button dark">Dark</button>
              <button className="button accent">Accent</button>
            </div>
            <div className="button-row">
              <button className="button sm gradient">Small</button>
              <button className="button lg gradient">Large</button>
              <button className="button pill outline">Pill Outline</button>
              <button className="button gradient" disabled>Disabled</button>
            </div>
          </section>

          <section className="card">
            <h2>Forms</h2>
            <form className="form-stack style-guide-form">
              <label>
                Equipment Name
                <input type="text" value="Case IH Magnum 340" readOnly />
              </label>
              <label>
                Category
                <select value="tractor" readOnly>
                  <option value="tractor">Tractor</option>
                </select>
              </label>
              <label>
                Description
                <textarea rows={4} readOnly value="High-horsepower tractor with precision guidance package." />
              </label>
              <div className="button-row">
                <button type="button" className="button secondary">Submit</button>
                <button type="button" className="button outline">Cancel</button>
              </div>
            </form>
          </section>
        </div>

        <aside className="style-guide-side">
          <section className="feature-grid">
            <EquipmentCard equipment={sampleEquipment} />
            <BookingCard booking={sampleBooking} />
          </section>

          <section className="card style-guide-status">
            <h2>Status Tokens</h2>
            <div className="chip-row">
              <span className="status-badge status-success">verified</span>
              <span className="status-badge status-pending">pending</span>
              <span className="status-badge status-error">rejected</span>
              <span className="status-badge status-info">info</span>
            </div>
          </section>

          <section className="card">
            <h2>Color Tokens</h2>
            <div className="chip-row">
              <span className="token-chip token-primary">Primary</span>
              <span className="token-chip token-secondary">Secondary</span>
              <span className="token-chip token-accent">Accent</span>
              <span className="token-chip token-dark">Dark</span>
            </div>
          </section>
        </aside>
      </section>
    </div>
  )
}
