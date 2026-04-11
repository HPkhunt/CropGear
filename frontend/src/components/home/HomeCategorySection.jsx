import React from 'react';
import { Link } from 'react-router-dom';
import SmartImage from '../SmartImage.jsx';

export default function HomeCategorySection({ browsePath, categories, onCategoryClick }) {
  return (
    <section className="card home-category">
      <div className="section-heading"><div><p className="review-section-eyebrow">Browse by category</p><h2>Start with the machine type you need</h2></div><Link to={browsePath} className="button sm outline pill">See full marketplace</Link></div>
      <div className="home-category-grid">
        {categories.map((category) => (
          <button key={category.value} type="button" className="home-category-button" onClick={() => onCategoryClick(category.value)}>
            <SmartImage src={category.image} fallbackSrc="/fields.svg" alt={category.label} />
            <div><strong>{category.label}</strong><span>{category.copy}</span></div>
          </button>
        ))}
      </div>
    </section>
  );
}
