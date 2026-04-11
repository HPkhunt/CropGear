import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { equipmentService } from '../../services/equipmentService.js'
import { bookingService } from '../../services/bookingService.js'
import Loader from '../../components/Loader.jsx'
import PageHero from '../../components/PageHero.jsx'
import { getEquipmentImage } from '../../utils/equipmentImages.js'
import useAuth from '../../hooks/useAuth.js'
import { getErrorMessage } from '../../utils/helpers.js'
import SmartImage from '../../components/SmartImage.jsx'
import useToast from '@/hooks/useToast'
import EquipmentGallery from '../../components/equipment/EquipmentGallery.jsx'
import EquipmentSpecs from '../../components/equipment/EquipmentSpecs.jsx'
import EquipmentBookingPanel from '../../components/equipment/EquipmentBookingPanel.jsx'
import EquipmentDetailsSidebar from '../../components/equipment/EquipmentDetailsSidebar.jsx'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const CATEGORY_GALLERY = {
  tractor: [
    'https://images.unsplash.com/photo-1530267981375-f0de937f5f13?q=80&w=1280&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1592805144716-feeccccef5ac?q=80&w=1280&auto=format&fit=crop'
  ],
  harvester: [
    'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1280&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1574943320219-553eb213f72d?q=80&w=1280&auto=format&fit=crop'
  ],
  seeder: [
    'https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=1280&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?q=80&w=1280&auto=format&fit=crop'
  ],
  tillage: [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1280&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=1280&auto=format&fit=crop'
  ],
  irrigation: [
    'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?q=80&w=1280&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1586771107445-b3f7e4c1b25a?q=80&w=1280&auto=format&fit=crop'
  ],
  crop_care: [
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=1280&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?q=80&w=1280&auto=format&fit=crop'
  ],
  default: [
    'https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1280&auto=format&fit=crop'
  ]
}

export default function EquipmentDetails() {
  const { id } = useParams()
  const { isAuthenticated, user } = useAuth()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [requesting, setRequesting] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    let ignore = false

    const fetchData = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const equipmentData = await equipmentService.get(id)
        if (ignore) return
        setItem(equipmentData)
      } catch (error) {
        if (!ignore) {
          setItem(null)
          setLoadError(getErrorMessage(error, 'Unable to load equipment details right now.'))
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      ignore = true
    }
  }, [id])

  const image = useMemo(() => getEquipmentImage(item || {}), [item])
  const galleryImages = useMemo(
    () => CATEGORY_GALLERY[item?.category] || CATEGORY_GALLERY.default,
    [item?.category]
  )
  const stats = [
    { value: `$${Number(item?.daily_rate || 0).toLocaleString()}`, label: 'Daily rate' },
    { value: Array.isArray(item?.specs) ? item.specs.length : 0, label: 'Specs listed' },
    { value: item?.is_available === false ? 'Unavailable' : 'Available', label: 'Status' }
  ]
  const ownerName = item?.owner_name || 'Equipment Owner'
  const specCount = item?.specs?.length || 0
  const browsePath = user?.role === 'farmer' ? '/farmer/equipments' : '/browse-equipment'
  const showBookingPanel = !isAuthenticated || user?.role === 'farmer' || user?.role === 'admin'

  const bookingPreview = useMemo(() => {
    if (!startDate || !endDate) return null;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s) || isNaN(e) || e < s) return null;
    const diffTime = Math.abs(e - s);
    const durationDays = Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1, 1);

    const baseRate = Number(item?.daily_rate || 0);
    const subtotal = baseRate * durationDays;
    const platformFee = subtotal * 0.10;
    const finalTotal = subtotal + platformFee;

    return { durationDays, subtotal, platformFee, finalTotal };
  }, [startDate, endDate, item]);

  const onRequestBooking = async (event) => {
    event.preventDefault()

    if (!isAuthenticated) {
      addToast('Please sign in first to send booking requests.', 'error')
      return
    }
    if (user?.role !== 'farmer' && user?.role !== 'admin') {
      addToast('Only farmer accounts can create booking requests.', 'error')
      return
    }
    if (!bookingPreview) {
      addToast('Please provide valid start and end dates.', 'error')
      return
    }

    setRequesting(true)
    try {
      const booking = await bookingService.create({
        equipment_id: item.id,
        start_date: startDate,
        end_date: endDate
      })
      addToast(`Booking request ${booking.id} created successfully.`, 'success')
      setStartDate('')
      setEndDate('')
    } catch (error) {
      addToast(getErrorMessage(error, 'Unable to create booking request.'), 'error')
    } finally {
      setRequesting(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      addToast('Page link copied to clipboard.', 'success')
    } catch {
      addToast('Could not copy link.', 'error')
    }
  }

  if (loading) return <Loader />
  if (!item) {
    return (
      <div className="container mx-auto py-6 sm:py-8">
        <Card className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
          <CardContent className="space-y-2 p-6">
            <h3 className="text-lg font-semibold text-slate-950">
              {loadError ? 'Equipment unavailable' : 'Equipment not found'}
            </h3>
            <p className="text-sm leading-6 text-slate-600">
              {loadError || 'The requested equipment entry is unavailable.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-8 py-6 sm:py-8">
      <PageHero
        eyebrow="Equipment Details"
        title={item.name}
        subtitle={`${item.category} in ${item.location} | ${ownerName}`}
        className="portal-primary"
        stats={stats}
        aside={
          <SmartImage
            src={image}
            fallbackSrc="/tractor.svg"
            alt={item.name}
            className="page-hero-media"
          />
        }
        actions={(
          <Link
            to={browsePath}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
          >
            Back to browse
          </Link>
        )}
      />

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)] lg:items-start">
        <div className="space-y-6">
          <Card className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
            <CardContent className="space-y-5 p-6">
            <EquipmentGallery
              image={image}
              itemName={item.name}
              galleryImages={[
                galleryImages[0],
                galleryImages[1],
                'https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1280&auto=format&fit=crop'
              ]}
            />

            <p className="text-sm leading-7 text-slate-600">{item.description}</p>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
              <EquipmentSpecs specs={item.specs || []} />

              {showBookingPanel && (
                <EquipmentBookingPanel
                  dailyRate={item.daily_rate}
                  isAuthenticated={isAuthenticated}
                  startDate={startDate}
                  endDate={endDate}
                  bookingPreview={bookingPreview}
                  requesting={requesting}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                  onSubmit={onRequestBooking}
                />
              )}
            </div>
            </CardContent>
          </Card>

        </div>

        <aside className="space-y-6">
          <EquipmentDetailsSidebar
            ownerName={ownerName}
            location={item.location}
            category={item.category}
            specCount={specCount}
            browsePath={browsePath}
            onCopyLink={copyLink}
          />
        </aside>
      </section>
    </div>
  )
}
