import React, { useEffect, useState } from 'react'
import DashboardShell from '../../components/DashboardShell.jsx'
import PageHero from '../../components/PageHero.jsx'
import { Link } from 'react-router-dom'
import client from '../../services/api.js'

export default function TestimonialsAdmin() {
  const [list, setList] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ quote: '', author: '' })

  const load = async () => {
    try {
      const { data } = await client.get('/admin/testimonials')
      setList(Array.isArray(data) ? data : [])
      setError('')
    } catch (e) {
      console.error(e)
      setError('Unable to fetch testimonials')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleDelete = async (testimonialId) => {
    setLoading(true)
    try {
      await client.delete(`/admin/testimonials/${testimonialId}`)
      setSuccess('Testimonial removed')
      setError('')
      await load()
    } catch (e) {
      console.error(e)
      setError('Failed to remove testimonial')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (!formData.quote.trim() || !formData.author.trim()) {
      setError('Quote and author required')
      return
    }
    setLoading(true)
    try {
      const resp = await client.post('/admin/testimonials', {
        quote: formData.quote.trim(),
        author: formData.author.trim()
      })
      setSuccess('Testimonial added')
      setError('')
      setFormData({ quote: '', author: '' })
      setShowForm(false)
      await load()
    } catch (e) {
      console.error(e)
      setError('Failed to add testimonial')
    } finally {
      setLoading(false)
    }
  }

  const sidebarLinks = [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/verify-owners', label: 'Verify Users' },
    { to: '/admin/equipment', label: 'Equipment Control' },
    { to: '/admin/reports', label: 'Reports' },
    { to: '/admin/newsletters', label: 'Newsletters' },
    { to: '/admin/testimonials', label: 'Testimonials', isHome: true },
    { to: '/style-guide', label: 'UI Guide' },
    { to: '/', label: 'Home' }
  ]

  return (
    <div className="container page-wrap">
      <DashboardShell title="Admin Control" subtitle="Testimonials" links={sidebarLinks}>
        <PageHero
          eyebrow="Admin"
          title="Customer testimonials"
          subtitle="Feedback snippets displayed on homepage"
          className="portal-dark"
        />
        {error && <p className="admin-error">{error}</p>}
        {success && <p className="admin-success">{success}</p>}
        <div className="admin-controls">
          <button onClick={() => setShowForm(!showForm)} className="button sm primary" disabled={loading}>
            {showForm ? 'Cancel' : '+ Add New'}
          </button>
          <button onClick={load} className="button sm secondary" disabled={loading}>
            Refresh
          </button>
          <p className="text-muted">Total: {list.length} testimonial{list.length !== 1 ? 's' : ''}</p>
        </div>
        {showForm && (
          <div className="admin-form-box">
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label>Quote</label>
                <textarea
                  value={formData.quote}
                  onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                  placeholder="What did the customer say?"
                  rows="3"
                  required
                />
              </div>
              <div className="form-group">
                <label>Author Name</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Customer name or initials"
                  required
                />
              </div>
              <button type="submit" className="button primary" disabled={loading}>
                {loading ? 'Adding...' : 'Add Testimonial'}
              </button>
            </form>
          </div>
        )}
        <ul className="admin-testimonials-list">
          {list.length === 0 ? (
            <li>No testimonials yet</li>
          ) : (
            list.map((t, i) => (
              <li key={i} className="testimonial-item">
                <blockquote>"{t.quote}"</blockquote>
                <small>— {t.author}</small>
                <div className="testimonial-actions">
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="button sm dark"
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </DashboardShell>
    </div>
  )
}
