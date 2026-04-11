import React from 'react';
import { Link } from 'react-router-dom';
import SmartImage from '../SmartImage.jsx';

export default function HomeCtaSection({ browsePath, dashboardPath, isAuthenticated, ctaImage }) {
  return (
    <section className="card home-cta-band">
      <div className="home-cta-copy">
        <p className="review-section-eyebrow">Ready to move</p>
        <h2>Launch the updated CropGear experience</h2>
        <p className="subtitle">Browse current listings, save a shortlist, or open your workspace and continue from the latest UI pass.</p>
        <div className="button-row">
          <Link to={browsePath} className="button gradient pill">Browse equipment</Link>
          <Link to={isAuthenticated ? dashboardPath : '/auth/register'} className="button outline pill">{isAuthenticated ? 'Open dashboard' : 'Create account'}</Link>
        </div>
      </div>
      <SmartImage src={ctaImage} fallbackSrc="/hero.svg" alt="CropGear call to action" className="home-cta-image" loading="lazy" />
    </section>
  );
}
