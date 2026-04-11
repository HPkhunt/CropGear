import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import SmartImage from '../SmartImage.jsx';

export default function HomeStorySection({
  activeTestimonial,
  onPrevious,
  onNext,
  communityImage
}) {
  return (
    <section className="details-grid">
      <article className="card home-story-card">
        <div className="review-section-head">
          <div><p className="review-section-eyebrow">Customer voice</p><h3>What the community is saying</h3></div>
          <div className="button-row">
            <button type="button" className="button sm outline pill" onClick={onPrevious} aria-label="Previous testimonial"><ArrowLeft size={14} strokeWidth={2.2} aria-hidden="true" /></button>
            <button type="button" className="button sm outline pill" onClick={onNext} aria-label="Next testimonial"><ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" /></button>
          </div>
        </div>
        <div className="home-story-layout">
          <SmartImage src={communityImage} fallbackSrc="/fields.svg" alt="CropGear community in action" className="home-story-image" loading="lazy" />
          <div className="home-story-copy">
            <p className="home-quote-mark" aria-hidden="true">&ldquo;</p>
            <p className="home-quote">{activeTestimonial?.quote || 'CropGear helps teams move from search to secure booking with less friction.'}</p>
            <div className="home-quote-meta"><strong>{activeTestimonial?.author || 'CropGear member'}</strong><span>Marketplace feedback</span></div>
          </div>
        </div>
      </article>

      <article className="card home-proof-card">
        <p className="review-section-eyebrow">Operational confidence</p>
        <h3>Built for discovery first, then action</h3>
        <ul className="feature-list">
          <li><strong>Clear route handoff</strong><span>Homepage search now routes guests to the public marketplace and farmers to the signed-in workflow.</span></li>
          <li><strong>Consistent card hierarchy</strong><span>Homepage featured listings now use the same card pattern users see deeper in the product.</span></li>
          <li><strong>Shared typography and spacing</strong><span>The landing page now matches the internal dashboard design language instead of feeling like a separate site.</span></li>
        </ul>
      </article>
    </section>
  );
}
