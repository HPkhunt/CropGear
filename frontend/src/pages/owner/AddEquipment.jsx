import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { equipmentService } from '../../services/equipmentService.js'
import PageHero from '../../components/PageHero.jsx'
import SmartImage from '../../components/SmartImage.jsx'
import { getCategoryImage } from '../../utils/equipmentImages.js'
import DashboardShell from '../../components/DashboardShell.jsx'

const TEMPLATE_LIBRARY = [
  {
    title: 'Utility Tractor Starter',
    category: 'tractor',
    name: 'Utility Tractor',
    rate: 210,
    location: 'Des Moines, IA',
    description: 'Reliable tractor for daily field operations and haul support.',
    specs: ['95 HP', '4WD', 'Hydraulic Lift']
  },
  {
    title: 'Harvest Heavy Kit',
    category: 'harvester',
    name: 'Combine Harvester',
    rate: 420,
    location: 'Ames, IA',
    description: 'High throughput harvester tuned for peak season windows.',
    specs: ['Yield Monitor', 'Auto Header Control', 'Operator Cabin AC']
  },
  {
    title: 'Irrigation Fast Setup',
    category: 'irrigation',
    name: 'Sprinkler System',
    rate: 120,
    location: 'Lincoln, NE',
    description: 'Field-ready irrigation setup for medium and large plots.',
    specs: ['Pressure Control', 'Wide Coverage', 'Quick Connect']
  }
]

export default function AddEquipment() {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('tractor')
  const [dailyRate, setDailyRate] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [specs, setSpecs] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [imageAssetId, setImageAssetId] = useState('')
  const [imageError, setImageError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const parsedSpecs = useMemo(
    () => specs.split(',').map((item) => item.trim()).filter(Boolean),
    [specs]
  )

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const applyTemplate = (template) => {
    setName(template.name)
    setCategory(template.category)
    setDailyRate(String(template.rate))
    setLocation(template.location)
    setDescription(template.description)
    setSpecs(template.specs.join(', '))
  }

  const generateAiImage = async () => {
    setUploading(true)
    setImageError('')
    setMessage('')
    try {
      const sourceUrl = getCategoryImage(category)
      const resp = await fetch(sourceUrl)
      const blob = await resp.blob()
      const file = new File([blob], `${category}-ai.png`, { type: blob.type || 'image/png' })
      const upload = await equipmentService.uploadImage(file)
      const finalUrl = upload?.publicUrl
      const assetId = upload?.asset?.id
      if (!finalUrl) {
        throw new Error('Upload failed')
      }
      setImageAssetId(assetId || '')
      setImageUrl(finalUrl)
      setImagePreview(finalUrl)
      setMessage('✨ AI image generated & uploaded successfully.')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('AI image generation failed', err)
      setImageError('Unable to generate AI image right now. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    try {
      const result = await equipmentService.create({
        name,
        category,
        daily_rate: Number(dailyRate),
        location,
        description,
        specs: parsedSpecs,
        image_asset_id: imageAssetId || undefined
      })
      setMessage(`Equipment created successfully: ${result.id}`)
      setName('')
      setDailyRate('')
      setLocation('')
      setDescription('')
      setSpecs('')
      setImageUrl('')
      setImagePreview('')
      setImageAssetId('')
      setImageError('')
    } catch {
      setError('Unable to create equipment. Please check the form and try again.')
    }
  }

  const sidebarLinks = [
    { to: '/owner/dashboard', label: 'Dashboard' },
    { to: '/owner/add-equipment', label: 'Add Equipment' },
    { to: '/owner/equipment', label: 'My Listings' },
    { to: '/owner/requests', label: 'Rental Requests' },
    { to: '/', label: 'Home' }
  ]

  return (
    <div className="container page-wrap">
      <DashboardShell title="Owner Panel" subtitle="Inventory center" links={sidebarLinks}>
        <PageHero
          eyebrow="Add Listing"
          title="Publish equipment with smarter templates"
          subtitle="Create high-quality listings faster with template presets and a live listing preview."
          className="portal-secondary"
          aside={
            <SmartImage
              src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1280&auto=format&fit=crop"
              fallbackSrc="/tractor.svg"
              alt="Listing preview"
              className="page-hero-media"
            />
          }
        />

        <section className="form-layout-grid">
          <aside className="card listing-ideas-card">
            <h3>Template Library</h3>
            <p className="subtitle">Start with a proven listing pattern and edit details as needed.</p>

            <div className="template-list">
              {TEMPLATE_LIBRARY.map((template) => (
                <button
                  key={template.title}
                  type="button"
                  className="template-item"
                  onClick={() => applyTemplate(template)}
                >
                  <strong>{template.title}</strong>
                  <span>{template.category} | ${template.rate}/day</span>
                </button>
              ))}
            </div>

            <div className="card listing-preview-mini">
              <h4>Live Preview</h4>
              <SmartImage
                src={imagePreview || imageUrl}
                fallbackSrc="/tractor.svg"
                alt={name || 'Listing preview'}
                className="listing-preview-image"
              />
              <p><strong>{name || 'Equipment Name'}</strong></p>
              <p className="subtitle">{category} | {location || 'Location pending'}</p>
              <p className="subtitle">${dailyRate || '0'} per day</p>
              <ul className="feature-list">
                {(parsedSpecs.length ? parsedSpecs : ['Add specs to preview']).slice(0, 3).map((spec) => (
                  <li key={spec}><span>{spec}</span></li>
                ))}
              </ul>
            </div>
          </aside>

          <section className="card form-card form-card-premium">
            {message && (
              <div className="success-banner-box" style={{ marginBottom: '20px', padding: '15px', background: 'rgba(22, 163, 74, 0.1)', borderRadius: '8px', border: '1px solid rgba(22, 163, 74, 0.2)' }}>
                <p className="success-banner" style={{ margin: 0, fontWeight: 'bold', color: '#16a34a' }}>{message}</p>
                <p className="subtitle" style={{ margin: '5px 0 10px 0' }}>Listing is now live for farmers.</p>
                <div className="button-row">
                  <Link to="/owner/equipment" className="button sm secondary">View in Listings</Link>
                  <Link to="/owner/dashboard" className="button sm outline">Back to Dashboard</Link>
                </div>
              </div>
            )}
            {error && <p className="error-banner">{error}</p>}

            <form className="form-stack form-shell" onSubmit={submit}>
              <section className="form-section">
                <div className="form-section-head">
                  <h4>Equipment basics</h4>
                  <p className="subtitle">Name, category, rate, and location shown publicly.</p>
                </div>
                <div className="form-grid two-col">
                  <label>
                    Equipment Name
                    <input value={name} onChange={(e) => setName(e.target.value)} required />
                  </label>

                  <label>
                    Category
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="tractor">Tractor</option>
                      <option value="harvester">Harvester</option>
                      <option value="seeder">Seeder</option>
                      <option value="tillage">Tillage</option>
                      <option value="irrigation">Irrigation</option>
                      <option value="crop_care">Crop Care</option>
                    </select>
                  </label>

                  <label>
                    Daily Rate (USD)
                    <input value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} type="number" min="1" required />
                  </label>

                  <label>
                    Location
                    <input value={location} onChange={(e) => setLocation(e.target.value)} required />
                  </label>
                </div>
              </section>

              <section className="form-section">
                <div className="form-section-head">
                  <h4>Listing details</h4>
                  <p className="subtitle">Specs help farmers choose the right machine.</p>
                </div>
                <div className="form-grid">
                  <label>
                    Description
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                  </label>

                  <label>
                    Specs (comma separated)
                    <input value={specs} onChange={(e) => setSpecs(e.target.value)} placeholder="120 HP, 4WD, GPS" />
                  </label>
                </div>
              </section>

              <section className="form-section">
                <div className="form-section-head">
                  <h4>Equipment Image</h4>
                  <p className="subtitle">Add a URL or use our AI Generator for a category-matched image.</p>
                </div>
                <div className="form-grid two-col" style={{ alignItems: 'end' }}>
                  <label>
                    Image URL
                    <input
                      value={imageUrl}
                      onChange={(e) => { setImageUrl(e.target.value); setImagePreview(e.target.value) }}
                      placeholder="https://..."
                    />
                  </label>

                  <button
                    type="button"
                    className="button secondary"
                    onClick={generateAiImage}
                    disabled={uploading}
                  >
                    {uploading ? 'Generating...' : '✨ Use AI Generator'}
                  </button>
                </div>

                {imageError && <p className="error-banner">{imageError}</p>}
              </section>

              <div className="form-actions-row">
                <button className="button lg gradient" type="submit" disabled={uploading}>
                  {uploading ? 'Publishing...' : 'Create Listing'}
                </button>
              </div>
            </form>
          </section>
        </section>
      </DashboardShell>
    </div>
  )
}
