import React from 'react'
import PageHero from '../components/PageHero.jsx'
import SmartImage from '../components/SmartImage.jsx'

const incomingFeatures = [
  {
    title: 'Live Tracking Map',
    text: 'Real-time machine location and route overlays are being built.',
    status: 'In Progress'
  },
  {
    title: 'Integrated Payments',
    text: 'Escrow and release workflows for secure settlements.',
    status: 'Planned'
  },
  {
    title: 'Predictive Pricing',
    text: 'Dynamic rate suggestions based on seasonal demand.',
    status: 'Research'
  },
  {
    title: 'KYC Workflow',
    text: 'Advanced verification and compliance checks for new users.',
    status: 'In Progress'
  },
  {
    title: 'Field Service Tickets',
    text: 'Issue reporting and maintenance assignment module.',
    status: 'Planned'
  }
]

const sectionizedStreams = [
  {
    name: 'Farmer Stream',
    points: ['Crop-cycle booking calendar', 'Saved search alerts', 'Faster re-book actions'],
    tone: 'status-success'
  },
  {
    name: 'Owner Stream',
    points: ['Listing quality score', 'Automated request prioritization', 'Maintenance reminder flow'],
    tone: 'status-info'
  },
  {
    name: 'Admin Stream',
    points: ['Risk flag dashboards', 'Audit trail exports', 'Multi-step user approvals'],
    tone: 'status-pending'
  }
]

export default function Docs() {
  return (
    <div className="container page-wrap docs-page">
      <PageHero
        eyebrow="Incoming"
        title="Work in progress features"
        subtitle="This page tracks upcoming modules currently under development."
        className="portal-dark"
        aside={
          <SmartImage
            src="https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop"
            fallbackSrc="/fields.svg"
            alt="Product roadmap"
            className="page-hero-media"
          />
        }
      />

      <section className="card docs-banner">
        <SmartImage
          src="https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop"
          fallbackSrc="/fields.svg"
          alt="Documentation hero"
          loading="lazy"
        />
        <div>
          <h3>Product Roadmap Board</h3>
          <p className="subtitle">Features listed below are sectionized by delivery phase and rollout stream.</p>
        </div>
      </section>

      <section className="docs-layout">
        <div className="docs-main">
          <section className="docs-grid">
            {incomingFeatures.map((feature) => (
              <article key={feature.title} className="card docs-card">
                <h3>{feature.title}</h3>
                <p className="subtitle">{feature.text}</p>
                <span className="status-badge status-pending">{feature.status}</span>
              </article>
            ))}
          </section>
        </div>
        <aside className="card docs-side">
          <h2>Sectionized Streams</h2>
          <div className="feature-grid">
            {sectionizedStreams.map((stream) => (
              <article key={stream.name} className="card">
                <h3>{stream.name}</h3>
                <ul className="feature-list">
                  {stream.points.map((point) => (
                    <li key={point}><span>{point}</span></li>
                  ))}
                </ul>
                <span className={`status-badge ${stream.tone}`}>Active Planning</span>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </div>
  )
}
