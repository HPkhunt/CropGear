import React, { useEffect, useState } from 'react'
import DashboardShell from '../../components/DashboardShell.jsx'
import PageHero from '../../components/PageHero.jsx'
import { Link } from 'react-router-dom'

export default function Newsletters() {
  const [list, setList] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      const resp = await fetch('/api/v1/admin/newsletters', { credentials: 'include' })
      if (!resp.ok) throw new Error('failed to load')
      setList(await resp.json())
      setError('')
    } catch (e) {
      console.error(e)
      setError('Unable to fetch subscribers')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleDelete = async (email) => {
    setLoading(true)
    try {
      const resp = await fetch(`/api/v1/admin/newsletters/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!resp.ok) throw new Error('failed to delete')
      setSuccess(`Removed ${email}`)
      setError('')
      await load()
    } catch (e) {
      console.error(e)
      setError('Failed to remove subscriber')
    } finally {
      setLoading(false)
    }
  }

  const sidebarLinks = [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/verify-owners', label: 'Verify Users' },
    { to: '/admin/equipment', label: 'Equipment Control' },
    { to: '/admin/reports', label: 'Reports' },
    { to: '/admin/newsletters', label: 'Newsletters', isHome: true },
    { to: '/admin/testimonials', label: 'Testimonials' },
    { to: '/style-guide', label: 'UI Guide' },
    { to: '/', label: 'Home' }
  ]

  return (
    <div className="container page-wrap">
      <DashboardShell title="Admin Control" subtitle="Newsletter subscribers" links={sidebarLinks}>
        <PageHero
          eyebrow="Admin"
          title="Newsletter subscribers"
          subtitle="Email addresses collected via homepage sign‑up"
          className="portal-dark"
        />
        {error && <p className="admin-error">{error}</p>}
        {success && <p className="admin-success">{success}</p>}
        <div className="admin-controls">
          <button onClick={load} className="button sm secondary" disabled={loading}>
            Refresh
          </button>
          <p className="text-muted">Total: {list.length} subscriber{list.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th style={{ width: '120px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan="2">No subscribers yet</td></tr>
              ) : (
                list.map((item, i) => {
                  const email = item.email || item
                  return (
                    <tr key={i}>
                      <td>{email}</td>
                      <td>
                        <button
                          onClick={() => handleDelete(email)}
                          className="button sm dark"
                          disabled={loading}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </DashboardShell>
    </div>
  )
}