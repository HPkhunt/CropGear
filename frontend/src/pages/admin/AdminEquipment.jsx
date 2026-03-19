import React, { useEffect, useMemo, useState } from 'react'
import PageHero from '../../components/PageHero.jsx'
import Loader from '../../components/Loader.jsx'
import { adminService } from '../../services/adminService.js'
import { getErrorMessage } from '../../utils/helpers.js'
import SmartImage from '../../components/SmartImage.jsx'

export default function AdminEquipment() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const refresh = async () => {
    const data = await adminService.equipmentList()
    setItems(data)
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        await refresh()
      } catch (err) {
        setError(getErrorMessage(err, 'Unable to load equipment list.'))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter((item) => {
      const name = String(item?.name || '').toLowerCase()
      const category = String(item?.category || '').toLowerCase()
      const location = String(item?.location || '').toLowerCase()
      return name.includes(s) || category.includes(s) || location.includes(s)
    })
  }, [items, q])
  const hiddenCount = useMemo(
    () => items.filter((item) => item.is_visible_to_farmers === false).length,
    [items]
  )
  const visibleCount = items.length - hiddenCount
  const stats = [
    { value: items.length, label: 'Total listings' },
    { value: visible.length, label: 'Visible results' }
  ]

  if (loading) return <Loader />

  return (
    <div className="container page-wrap">
      <PageHero
        eyebrow="Admin Equipment"
        title="Manage all listed equipment"
        subtitle="Admin can remove listing visibility from farmers and add it back later."
        className="portal-dark"
        stats={stats}
        aside={
          <SmartImage
            src="https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop"
            fallbackSrc="/hero.svg"
            alt="Equipment moderation"
            className="page-hero-media"
          />
        }
      />

      <section className="page-split">
        <div className="page-main">
          <section className="card filter-shell">
            <div className="filter-bar">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, category, or location" />
            </div>
          </section>

          <section className="card">
            {message && <p className="success-banner">{message}</p>}
            {error && <p className="error-banner">{error}</p>}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Rate/Day</th>
                    <th>Owner</th>
                    <th>Farmer Visibility</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.category}</td>
                      <td>{item.location}</td>
                      <td>${Number(item.daily_rate || 0).toLocaleString()}</td>
                      <td>{item.owner_name || 'Owner'}</td>
                      <td>
                        <span className={`status-badge ${item.is_visible_to_farmers !== false ? 'status-success' : 'status-pending'}`}>
                          {item.is_visible_to_farmers !== false ? 'visible' : 'hidden'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`button sm ${item.is_visible_to_farmers !== false ? 'dark' : 'secondary'}`}
                          onClick={async () => {
                            setMessage('')
                            setError('')
                            try {
                              const nextVisible = item.is_visible_to_farmers === false
                              await adminService.setEquipmentVisibility(item.id, nextVisible)
                              setMessage(nextVisible ? `${item.name} activated on platform.` : `${item.name} hidden from platform.`)
                              await refresh()
                            } catch (err) {
                              setError(getErrorMessage(err, 'Unable to update equipment visibility.'))
                            }
                          }}
                        >
                          {item.is_visible_to_farmers !== false ? 'Hide Listing' : 'Activate Listing'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!visible.length && <p className="subtitle">No equipment records found.</p>}
          </section>
        </div>

        <aside className="page-side">
          <section className="card">
            <h3>Visibility Snapshot</h3>
            <div className="panel-list-premium">
              <div className="insight-stat-row">
                <div className="stat-icon-wrap">📋</div>
                <div className="stat-info-wrap">
                  <strong>{items.length}</strong>
                  <span>Total listings</span>
                </div>
              </div>
              <div className="insight-stat-row">
                <div className="stat-icon-wrap">👁️</div>
                <div className="stat-info-wrap">
                  <strong>{visibleCount}</strong>
                  <span>Visible to farmers</span>
                </div>
              </div>
              <div className="insight-stat-row">
                <div className="stat-icon-wrap">🔒</div>
                <div className="stat-info-wrap">
                  <strong>{hiddenCount}</strong>
                  <span>Hidden from farmers</span>
                </div>
              </div>
            </div>
            <p className="panel-note">Visibility updates take effect immediately.</p>
          </section>

          <section className="card">
            <h3>Moderation Checklist</h3>
            <ul className="feature-list">
              <li><span>Confirm listing details and availability.</span></li>
              <li><span>Hide listings missing specs or pricing.</span></li>
              <li><span>Re-enable listings after owner updates.</span></li>
            </ul>
            <div className="button-row">
              <button type="button" className="button sm secondary pill hover-lift" onClick={refresh}>Refresh List</button>
            </div>
          </section>
        </aside>
      </section>
    </div>
  )
}
