import React from 'react';
import EquipmentCard from '../EquipmentCard.jsx';

export default function HomeFeaturedSection({ featuredEquipment }) {
  return (
    <section className="card home-featured">
      <div className="section-heading"><div><p className="review-section-eyebrow">Featured equipment</p><h2>Marketplace listings people can act on</h2></div><p className="subtitle">Using the same listing card pattern here keeps the homepage aligned with internal discovery pages.</p></div>
      <div className="feature-grid">{featuredEquipment.map((item) => <EquipmentCard key={item.id} equipment={item} />)}</div>
    </section>
  );
}
