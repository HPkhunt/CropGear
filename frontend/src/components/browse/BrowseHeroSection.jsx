import React from 'react';
import PageHero from '../PageHero.jsx';
import SmartImage from '../SmartImage.jsx';

export default function BrowseHeroSection({ stats }) {
  return (
    <PageHero
      eyebrow="Marketplace"
      title="Find the right equipment for your farm"
      subtitle="Use saved presets, compare shortlists, and nearby search from one discovery workspace."
      className="portal-primary"
      stats={stats}
      aside={<SmartImage src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1920&auto=format&fit=crop" fallbackSrc="/hero.svg" alt="Equipment marketplace" className="page-hero-media" />}
    />
  );
}
