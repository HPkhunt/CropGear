import React, { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { equipmentService } from '../services/equipmentService.js'
import { ArrowLeft, CheckCircle, XCircle, SearchX, Columns } from 'lucide-react'
import Loader from '../components/Loader.jsx'
import PageHero from '../components/PageHero.jsx'

export default function Compare() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ids = params.get('ids')?.split(',').filter(Boolean)
    if (!ids || ids.length === 0) {
      setLoading(false)
      return
    }

    const fetchCompareItems = async () => {
      try {
        // Backend compare endpoint takes array of IDs
        const data = await equipmentService.compare(ids)
        setItems(data?.items || [])
      } catch (err) {
        console.error('Compare error', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCompareItems()
  }, [params])

  if (loading) return <Loader />

  if (items.length === 0) {
    return (
      <div className="container page-wrap">
        <PageHero
          eyebrow="Compare"
          title="Equipment Comparison"
          subtitle="Select up to 5 machines from the browse page to compare side by side."
          className="portal-dark"
        />
        <div className="empty-search-state" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <div className="empty-icon"><SearchX size={48} style={{ color: 'var(--muted)' }} /></div>
          <h3>No items selected</h3>
          <p className="subtitle" style={{ margin: '0.5rem 0 1.5rem' }}>Go back to the marketplace and select items to compare.</p>
          <Link to="/browse-equipment" className="button primary sm pill">Browse Equipment</Link>
        </div>
      </div>
    )
  }

  // Define specs to compare
  const specs = [
    { label: 'Name', key: 'name', type: 'text', important: true },
    { label: 'Category', key: 'category', type: 'capitalize' },
    { label: 'Daily Rate', key: 'daily_rate', type: 'currency', important: true },
    { label: 'Availability', key: 'is_available', type: 'boolean' },
    { label: 'Location', key: 'location', type: 'location' },
    { label: 'Owner Verified', key: 'owner_verified', type: 'boolean' },
  ]

  const formatSpec = (item, spec) => {
    const val = item[spec.key]
    
    if (spec.type === 'currency') return `$${Number(val || 0).toLocaleString()}/day`
    if (spec.type === 'boolean') {
      return val ? <CheckCircle size={18} color="#10b981" /> : <XCircle size={18} color="#ef4444" />
    }
    if (spec.type === 'location') {
      // Handle Location objects
      if (typeof val === 'object' && val?.coordinates) {
        return `Location [${val.coordinates[1].toFixed(2)}, ${val.coordinates[0].toFixed(2)}]`
      }
      return val || 'Not specified'
    }
    if (spec.type === 'capitalize') {
      return val ? String(val).charAt(0).toUpperCase() + String(val).slice(1) : '-'
    }
    return val || '-'
  }

  return (
    <div className="container page-wrap">
      <div style={{ marginBottom: '1.5rem' }}>
        <button className="button sm link hover-lift" onClick={() => navigate(-1)} style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={16} /> Back to Browse
        </button>
      </div>
      
      <PageHero
        eyebrow="Marketplace"
        title="Side-by-Side Comparison"
        subtitle={`Comparing ${items.length} machines based on key specifications and pricing.`}
        className="portal-primary"
      />

      <div className="card" style={{ marginTop: '2rem', overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--muted-bg)' }}>
              <th style={{ padding: '16px', width: '150px', position: 'sticky', left: 0, background: 'var(--muted-bg)', borderRight: '1px solid var(--border)', zIndex: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)' }}>
                  <Columns size={16} /> Features
                </span>
              </th>
              {items.map(item => (
                <th key={item.id} style={{ padding: '16px', minWidth: '220px', verticalAlign: 'top', borderRight: '1px solid var(--border)' }}>
                  <img 
                    src={item.image_url || '/placeholder.svg'} 
                    alt={item.name} 
                    style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }} 
                  />
                  <h4 style={{ fontSize: '1.1rem', margin: '0 0 8px' }}>{item.name}</h4>
                  <Link to={`/farmer/equipment/${item.id}`} className="button sm outline block" style={{ textAlign: 'center' }}>View Details</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {specs.map(spec => (
              <tr key={spec.key} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ 
                  padding: '16px', 
                  fontWeight: 600, 
                  color: 'var(--muted)', 
                  background: 'var(--card-bg)',
                  position: 'sticky', 
                  left: 0,
                  borderRight: '1px solid var(--border)',
                  zIndex: 2
                }}>
                  {spec.label}
                </td>
                {items.map(item => (
                  <td key={`${item.id}-${spec.key}`} style={{ 
                    padding: '16px', 
                    fontWeight: spec.important ? 600 : 400,
                    color: spec.important && spec.type !== 'boolean' ? 'var(--text)' : 'var(--muted)',
                    borderRight: '1px solid var(--border)'
                  }}>
                    {formatSpec(item, spec)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
