import React, { useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { equipmentService } from '../../services/equipmentService.js'
import { mediaService } from '../../services/mediaService.js'
import PageHero from '../../components/PageHero.jsx'
import SmartImage from '../../components/SmartImage.jsx'
import { getCategoryImage } from '../../utils/equipmentImages.js'
import { getErrorMessage } from '../../utils/helpers.js'
import DashboardShell from '../../components/DashboardShell.jsx'
import { adminDashboardLinks, ownerDashboardLinks } from '../../utils/dashboardLinks.js'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
  const location = useLocation()
  const isAdminMode = location.pathname.startsWith('/admin')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('tractor')
  const [dailyRate, setDailyRate] = useState('')
  const [locationValue, setLocationValue] = useState('')
  const [description, setDescription] = useState('')
  const [specs, setSpecs] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [imageAssetId, setImageAssetId] = useState('')
  const [imageError, setImageError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [mediaReady, setMediaReady] = useState(true)
  const [message, setMessage] = useState('')
  const [uploadMessage, setUploadMessage] = useState('')
  const [error, setError] = useState('')
  const [pricingInsight, setPricingInsight] = useState(null)
  const [pricingLoading, setPricingLoading] = useState(false)

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

  useEffect(() => {
    let ignore = false

    mediaService.getCapabilities()
      .then((data) => {
        if (ignore) return
        setMediaReady(Boolean(data?.equipment_image_upload_enabled))
      })
      .catch((err) => {
        console.warn('Unable to load media capabilities.', err)
      })

    return () => {
      ignore = true
    }
  }, [])

  const applyTemplate = (template) => {
    setName(template.name)
    setCategory(template.category)
    setDailyRate(String(template.rate))
    setLocationValue(template.location)
    setDescription(template.description)
    setSpecs(template.specs.join(', '))
  }

  const generateAiImage = async () => {
    if (!mediaReady) {
      setImageError('AI image uploads are unavailable right now. Add a public image URL instead.')
      return
    }

    setUploading(true)
    setImageError('')
    setUploadMessage('')
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
      setUploadMessage('AI image generated and uploaded successfully.')
      setTimeout(() => setUploadMessage(''), 3000)
    } catch (err) {
      console.error('AI image generation failed', err)
      setImageError(getErrorMessage(err, 'Unable to generate AI image right now. Add a public image URL or try again later.'))
    } finally {
      setUploading(false)
    }
  }

  const requestPricingInsight = async () => {
    setPricingLoading(true)
    setError('')
    try {
      const insight = await equipmentService.predictPricing({
        category,
        location: locationValue,
        currentRate: dailyRate
      })
      setPricingInsight(insight)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to generate pricing guidance right now.'))
    } finally {
      setPricingLoading(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setMessage('')
    setUploadMessage('')
    setError('')

    const trimmedImageUrl = imageUrl.trim()

    try {
      const result = await equipmentService.create({
        name,
        category,
        daily_rate: Number(dailyRate),
        location: locationValue,
        description,
        specs: parsedSpecs,
        image_url: imageAssetId ? undefined : (trimmedImageUrl || undefined),
        image_asset_id: imageAssetId || undefined
      })
      setMessage(`Equipment created successfully: ${result.id}`)
      setName('')
      setDailyRate('')
      setLocationValue('')
      setDescription('')
      setSpecs('')
      setImageUrl('')
      setImagePreview('')
      setImageAssetId('')
      setImageError('')
      setPricingInsight(null)
    } catch {
      setError('Unable to create equipment. Please check the form and try again.')
    }
  }

  const sidebarLinks = isAdminMode ? adminDashboardLinks : ownerDashboardLinks

  return (
    <div className="container page-wrap">
      <DashboardShell
        title={isAdminMode ? 'Admin Control' : 'Owner Panel'}
        subtitle={isAdminMode ? 'Equipment setup' : 'Inventory center'}
        links={sidebarLinks}
      >
        <PageHero
          eyebrow="Add Listing"
          title="Publish equipment with smarter templates"
          subtitle="Create high-quality listings faster with template presets and a live listing preview."
          className={isAdminMode ? 'portal-admin' : 'portal-secondary'}
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
              <p className="subtitle">{category} | {locationValue || 'Location pending'}</p>
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
              <Alert className="mb-4 border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
                <AlertDescription className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-slate-900">{message}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => setMessage('')}
                    >
                      Dismiss
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={isAdminMode ? '/admin/equipment' : '/owner/equipment'}
                      className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'rounded-full')}
                    >
                      {isAdminMode ? 'Open equipment control' : 'View in listings'}
                    </Link>
                    <Link
                      to={isAdminMode ? '/admin/dashboard' : '/owner/dashboard'}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                    >
                      {isAdminMode ? 'Back to admin dashboard' : 'Back to dashboard'}
                    </Link>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert
                variant="destructive"
                className="mb-4 border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur"
              >
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-slate-900">{error}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setError('')}
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            )}

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
                    <input value={locationValue} onChange={(e) => setLocationValue(e.target.value)} required />
                  </label>
                </div>
                <div className="card listing-preview-mini">
                  <div className="form-section-head">
                    <div>
                      <h4>Predictive pricing</h4>
                      <p className="subtitle">Use current category, location, and recent demand to estimate a competitive daily rate.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={requestPricingInsight}
                      disabled={pricingLoading}
                    >
                      {pricingLoading ? 'Analyzing...' : 'Suggest Rate'}
                    </Button>
                  </div>
                  {pricingInsight ? (
                    <ul className="feature-list">
                      <li><strong>${pricingInsight.suggested_rate}</strong><span>Suggested daily rate</span></li>
                      <li><strong>${pricingInsight.recommended_range?.min} - ${pricingInsight.recommended_range?.max}</strong><span>Recommended range</span></li>
                      <li><strong>{pricingInsight.signals?.demand_label || 'steady'}</strong><span>Current demand signal</span></li>
                      <li><strong>{pricingInsight.comparison_to_current}</strong><span>Compared with the rate in this form</span></li>
                    </ul>
                  ) : (
                    <p className="subtitle">No pricing guidance loaded yet. Generate a suggestion after selecting a category and location.</p>
                  )}
                  {pricingInsight?.reasons?.length ? (
                    <ul className="feature-list">
                      {pricingInsight.reasons.map((reason) => (
                        <li key={reason}><span>{reason}</span></li>
                      ))}
                    </ul>
                  ) : null}
                  {pricingInsight ? (
                    <div className="button-row">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setDailyRate(String(pricingInsight.suggested_rate))}
                      >
                        Use Suggested Rate
                      </Button>
                    </div>
                  ) : null}
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
                      onChange={(e) => {
                        setImageAssetId('')
                        setImageUrl(e.target.value)
                        setImagePreview(e.target.value)
                        setImageError('')
                      }}
                      placeholder="https://..."
                    />
                  </label>

                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-full"
                    onClick={generateAiImage}
                    disabled={uploading || !mediaReady}
                  >
                    {uploading ? 'Generating...' : (
                      <>
                        <Sparkles size={16} strokeWidth={2.1} aria-hidden="true" />
                        <span>{mediaReady ? 'Use AI Generator' : 'AI Upload Unavailable'}</span>
                      </>
                    )}
                  </Button>
                </div>

                {!mediaReady && (
                  <p className="subtitle" style={{ marginTop: '10px' }}>
                    Media storage is not configured yet. You can still publish a listing by pasting a public image URL.
                  </p>
                )}

                {uploadMessage && <p className="success-banner">{uploadMessage}</p>}
                {imageError && <p className="error-banner">{imageError}</p>}
              </section>

              <div className="form-actions-row">
                <Button
                  type="submit"
                  size="lg"
                  variant="primary"
                  className="rounded-full"
                  disabled={uploading}
                >
                  {uploading ? 'Publishing...' : 'Create Listing'}
                </Button>
              </div>
            </form>
          </section>
        </section>
      </DashboardShell>
    </div>
  )
}
