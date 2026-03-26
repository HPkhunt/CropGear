import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import PageHero from '../../components/PageHero.jsx'
import DashboardShell from '../../components/DashboardShell.jsx'
import Loader from '../../components/Loader.jsx'
import { equipmentService } from '../../services/equipmentService.js'
import { useToast } from '../../context/ToastContext.jsx'
import { Save, Settings, Tag, ArrowLeft } from 'lucide-react'

export default function EditEquipment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    daily_rate: '',
    location: '',
  })

  useEffect(() => {
    const fetchEq = async () => {
      try {
        const item = await equipmentService.get(id)
        setFormData({
          name: item.name || '',
          category: item.category || '',
          description: item.description || '',
          daily_rate: item.daily_rate || '',
          location: item.location || '',
        })
      } catch (err) {
        addToast('Failed to load equipment data.', 'error')
        navigate('/owner/equipment')
      } finally {
        setLoading(false)
      }
    }
    fetchEq()
  }, [id, navigate, addToast])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await equipmentService.update(id, {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        daily_rate: Number(formData.daily_rate),
        location: formData.location,
      })
      addToast('Equipment updated successfully!', 'success')
      navigate('/owner/equipment')
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to save changes'
      addToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const sidebarLinks = [
    { to: '/owner/dashboard', label: 'Overview' },
    { to: '/owner/equipment', label: 'My Equipment' },
    { to: '/owner/requests', label: 'Booking Requests' },
  ]

  if (loading) return <Loader />

  return (
    <div className="container page-wrap">
      <DashboardShell title="Owner Panel" subtitle="Manage listings" links={sidebarLinks}>
        <div style={{ marginBottom: '1.5rem' }}>
          <button className="button sm link hover-lift" onClick={() => navigate(-1)} style={{ color: 'var(--muted)' }}>
            <ArrowLeft size={16} /> Back to Listings
          </button>
        </div>

        <PageHero
          eyebrow="Edit Listing"
          title={`Editing: ${formData.name}`}
          subtitle="Update pricing, description, and specifications."
          className="portal-dark"
        />

        <div className="card" style={{ maxWidth: '800px', padding: '2.5rem' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Equipment Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="review-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Category</label>
                <select name="category" value={formData.category} onChange={handleChange} className="review-input" required>
                  <option value="tractor">Tractor</option>
                  <option value="harvester">Harvester</option>
                  <option value="seeder">Seeder</option>
                  <option value="tillage">Tillage</option>
                  <option value="irrigation">Irrigation</option>
                  <option value="crop_care">Crop Care</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Daily Rate ($)</label>
                <input
                  type="number"
                  name="daily_rate"
                  value={formData.daily_rate}
                  onChange={handleChange}
                  required
                  min="0"
                  className="review-input"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Location (Region/City)</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                className="review-input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '2.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={6}
                className="review-textarea"
                placeholder="Detail the condition, model year, and capabilities."
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
              <button type="submit" className="button lg gradient pill" disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
                {saving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
              </button>
              <button type="button" className="button lg outline pill" onClick={() => navigate(-1)} style={{ padding: '0 2rem' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </DashboardShell>
    </div>
  )
}
