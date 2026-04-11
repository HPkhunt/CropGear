import React from 'react';
import { Link } from 'react-router-dom';
import SmartImage from '../SmartImage.jsx';

export default function HomeRoleSection({ rolePanels }) {
  return (
    <section className="card role-hub-v2">
      <div className="section-heading"><div><p className="review-section-eyebrow">Quick paths</p><h2>Move into the right workspace faster</h2></div><p className="subtitle">Farmers, owners, and admins should not have to hunt through mismatched entry points.</p></div>
      <div className="role-panel-grid">
        {rolePanels.map((panel) => (
          <Link key={panel.title} to={panel.to} className="card role-panel">
            <SmartImage src={panel.image} fallbackSrc="/hero.svg" alt={panel.title} loading="lazy" />
            <div><h3>{panel.title}</h3><p className="subtitle">{panel.copy}</p><span className="dashboard-summary-cta">{panel.cta}</span></div>
          </Link>
        ))}
      </div>
    </section>
  );
}
