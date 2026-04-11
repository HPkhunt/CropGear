import React, { useEffect, useState } from 'react'
import DashboardShell from '../../components/DashboardShell.jsx'
import PageHero from '../../components/PageHero.jsx'
import { adminService } from '../../services/adminService.js'
import { getErrorMessage } from '../../utils/helpers.js'
import { adminDashboardLinks } from '../../utils/dashboardLinks.js'

export default function Newsletters() {
  const [list, setList] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const data = await adminService.listNewsletters()
      setList(data)
      setError('')
    } catch (e) {
      console.error(e)
      setError(getErrorMessage(e, 'Unable to fetch subscribers'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleDelete = async (email) => {
    setLoading(true)
    try {
      await adminService.deleteNewsletter(email)
      setSuccess(`Removed ${email}`)
      setError('')
      await load()
    } catch (e) {
      console.error(e)
      setError(getErrorMessage(e, 'Failed to remove subscriber'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container page-wrap">
      <DashboardShell title="Admin Control" subtitle="Newsletter subscribers" links={adminDashboardLinks}>
        <PageHero
          eyebrow="Admin"
          title="Newsletter subscribers"
          subtitle="Email addresses collected via homepage signup"
          className="portal-admin"
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
                          className="button sm soil"
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
