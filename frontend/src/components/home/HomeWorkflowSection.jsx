import React from 'react';
import SmartImage from '../SmartImage.jsx';

export default function HomeWorkflowSection({ trustItems }) {
  return (
    <section className="card home-workflow">
      <div className="section-heading"><div><p className="review-section-eyebrow">Trust and clarity</p><h2>Reduce the mismatch between discovery and operations</h2></div><p className="subtitle">We are standardizing the surface area users touch most: search, trust, and booking readiness.</p></div>
      <div className="lane-grid">
        {trustItems.map((item, index) => (
          <article key={item.title} className="card lane-card home-trust-card">
            <div className="home-trust-image-wrap"><SmartImage src={item.image} fallbackSrc="/fields.svg" alt={item.title} className="home-trust-image" /></div>
            <div className="home-trust-icon"><item.icon size={20} strokeWidth={2.1} aria-hidden="true" /></div>
            <span className="lane-index">0{index + 1}</span>
            <h3>{item.title}</h3>
            <p className="subtitle">{item.copy}</p>
            <div className="lane-list">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
