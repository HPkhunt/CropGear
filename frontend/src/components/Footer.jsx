import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'
import { miscService } from '../services/miscService'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setMessage('')
    setSubscribed(false)
    if (!email.trim()) {
      setMessage('Enter a valid email.')
      return
    }
    try {
      setSubmitting(true)
      await miscService.subscribeNewsletter(email.trim())
      setSubscribed(true)
      setEmail('')
      setMessage('You are subscribed.')
    } catch (err) {
      setMessage('Could not subscribe right now. Please try again.')
      console.error('newsletter subscribe failed', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <footer className="site-footer">
      <div className="footer-backdrop" />
      <div className="container footer-content">
        <section className="footer-cta card">
          <div>
            <h3>Get product updates</h3>
            <p className="subtitle">Feature launches, booking automation improvements, and dashboard updates.</p>
          </div>
          <form className="newsletter" onSubmit={submit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
            <button type="submit" className="button accent" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Subscribe'}
            </button>
          </form>
          {message && <p className={subscribed ? 'success-banner' : 'error-banner'}>{message}</p>}
        </section>

        <div className="footer-grid">
          <div className="footer-column">
            <h3 className="footer-brand">
              <img src={logo} alt="CropGear logo" width={26} height={26} />
              CropGear
            </h3>
            <p>
              A modern farm equipment marketplace inspired by polished SaaS platforms and practical field workflows.
            </p>
          </div>

          <div className="footer-column">
            <h3>About</h3>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/browse-equipment">Browse Equipment</Link></li>
            </ul>
          </div>

          <div className="footer-column">
            <h3>Contact</h3>
            <ul>
              <li><a href="mailto:support@cropgear.in">support@cropgear.in</a></li>
              <li><a href="tel:+918401029070">+91 84010 29070</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h3>Privacy Policy</h3>
            <ul className="metric-list">
              <li><strong>Secure</strong><span>Data protection</span></li>
              <li><strong>Fair Use</strong><span>Transparent pricing</span></li>
              <li><strong>Trusted</strong><span>Verified participants</span></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>{currentYear} CropGear. Built for scalable agriculture operations.</p>
          <div className="footer-socials">
            <a href="https://www.instagram.com" target="_blank" rel="noreferrer">Instagram</a>
            <a href="https://www.linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
            <a href="https://www.youtube.com" target="_blank" rel="noreferrer">YouTube</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
