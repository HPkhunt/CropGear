import React from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero.jsx'
import SmartImage from '../components/SmartImage.jsx'

export default function NotFound() {
  return (
    <div className="container page-wrap">
      <PageHero
        eyebrow="Lost Route"
        title="This field path no longer exists"
        subtitle="The link may have changed, or the page is unavailable."
        className="portal-dark"
        aside={
          <SmartImage
            src="https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop"
            fallbackSrc="/hero.svg"
            alt="Open field"
            className="page-hero-media"
          />
        }
        actions={<Link className="button gradient" to="/">Back to Home</Link>}
      />

      <section className="card not-found-card">
        <h2>Try one of these</h2>
        <div className="button-row">
          <Link className="button secondary" to="/auth/login">Login</Link>
          <Link className="button outline" to="/farmer/equipments">Browse Equipment</Link>
        </div>
      </section>
    </div>
  )
}
