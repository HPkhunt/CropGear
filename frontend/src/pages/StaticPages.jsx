import React from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero.jsx'

export default function StaticPage({ title, eyebrow, subtitle, content }) {
  return (
    <div className="container page-wrap">
      <PageHero
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        className="portal-dark"
      />

      <div className="page-split" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
        <article className="card" style={{ maxWidth: '800px', width: '100%', lineHeight: '1.8', fontSize: '1.05rem', color: 'var(--text)' }}>
          {content}
          
          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <h4 style={{ marginBottom: '1rem' }}>Still have questions?</h4>
            <Link to="/browse-equipment" className="button primary sm pill">Contact Support</Link>
          </div>
        </article>
      </div>
    </div>
  )
}

export function About() {
  const content = (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Our Mission</h2>
      <p style={{ marginBottom: '1.5rem', color: 'var(--muted)' }}>
        CropGear is dedicated to optimizing agricultural machinery utilization through a secure, transparent, and efficient marketplace.
      </p>
      
      <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Why CropGear?</h3>
      <p style={{ marginBottom: '1.5rem' }}>
        For far too long, accessing high-quality farming equipment has been challenging and localized by word-of-mouth. Our platform bridges the gap between equipment owners with idle machinery and farmers needing reliable tractor rentals, harvesters, and specialized tools.
      </p>

      <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
        <li style={{ marginBottom: '0.5rem' }}><strong>Verified Owners:</strong> Every equipment provider is vetted for quality.</li>
        <li style={{ marginBottom: '0.5rem' }}><strong>Secure Payments:</strong> Escrow-style payments protect both parties.</li>
        <li><strong>Real-time Availability:</strong> Search by location and dates without back-and-forth calls.</li>
      </ul>
    </div>
  )
  return <StaticPage title="About CropGear" eyebrow="Company" subtitle="Redefining AgTech machinery sharing for the modern farmer." content={content} />
}

export function TermsPolicy() {
  const content = (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Privacy & Terms of Service</h2>
      <p style={{ marginBottom: '1.5rem', color: 'var(--muted)' }}>
        Last updated: October 2023. By using CropGear, you agree to these legal terms.
      </p>
      
      <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>1. Data Privacy</h3>
      <p style={{ marginBottom: '1.5rem' }}>
        We collect personal data required for identity verification, payment processing, and location-based matching. We do not sell your personal data to third parties. All stored data is encrypted using AES-256 protocols.
      </p>
      
      <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>2. Booking & Cancellation</h3>
      <p style={{ marginBottom: '1.5rem' }}>
        Bookings can be cancelled up to 24 hours before the rental period begins for a full refund. Cancellations made within 24 hours are subject to a 50% penalty fee. CropGear reserves the right to arbitrate disputes.
      </p>
      
      <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>3. Equipment Liability</h3>
      <p style={{ marginBottom: '1.5rem' }}>
        Renters are responsible for maintaining the equipment in good condition. All damages incurred during the rental period must be covered by the renter or their agricultural insurance policy.
      </p>
    </div>
  )
  return <StaticPage title="Legal Center" eyebrow="Trust & Safety" subtitle="Clear, transparent terms designed to protect our community." content={content} />
}

export function FAQ() {
  const qas = [
    { q: "How do payments work?", a: "Payments are held securely in escrow via Stripe. The owner is paid 24 hours after the rental successfully begins without dispute." },
    { q: "Who covers insurance?", a: "Both owners and renters should maintain their own commercial agricultural insurance. CropGear does not provide primary insurance coverage." },
    { q: "How do I become a verified owner?", a: "Create an account, add your equipment, and submit your ID through the Owner Dashboard. Our admin team typically reviews applications within 48 hours." },
    { q: "What happens if a machine breaks down?", a: "Use the messaging system immediately to contact the owner. You can flag the booking for dispute resolution to pause payment transfer." }
  ]
  
  const content = (
    <div>
      {qas.map((qa, i) => (
        <div key={i} style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>{qa.q}</h3>
          <p style={{ color: 'var(--text)' }}>{qa.a}</p>
        </div>
      ))}
    </div>
  )
  return <StaticPage title="Help & Support" eyebrow="FAQ" subtitle="Common questions about using the CropGear platform." content={content} />
}
