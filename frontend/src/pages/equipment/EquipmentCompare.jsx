import React, { useEffect, useMemo, useState } from 'react'
import { Columns2, MapPin, ShieldCheck, Trash2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHero from '../../components/PageHero.jsx'
import Loader from '../../components/Loader.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import SmartImage from '../../components/SmartImage.jsx'
import useAuth from '../../hooks/useAuth.js'
import useToast from '@/hooks/useToast'
import { equipmentService } from '../../services/equipmentService.js'
import { getErrorMessage } from '../../utils/helpers.js'
import { getEquipmentImage } from '../../utils/equipmentImages.js'
import {
  clearComparedEquipment,
  getComparedEquipmentIds,
  parseComparedEquipmentIds,
  setComparedEquipmentIds,
  toggleComparedEquipment
} from '../../utils/compare.js'
import { Button, buttonVariants } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function getBrowsePath(role) {
  return role === 'farmer' ? '/farmer/equipments' : '/browse-equipment'
}

function getDetailsPath(role, equipmentId) {
  return role === 'farmer' ? `/farmer/equipment/${equipmentId}` : `/equipment/${equipmentId}`
}

export default function EquipmentCompare() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const idsParam = searchParams.get('ids') || ''
  const [compareIds, setCompareIds] = useState(() => {
    const queryIds = parseComparedEquipmentIds(idsParam)
    return queryIds.length ? queryIds : getComparedEquipmentIds()
  })
  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const nextIds = idsParam ? parseComparedEquipmentIds(idsParam) : getComparedEquipmentIds()
    const normalizedIds = setComparedEquipmentIds(nextIds)
    setCompareIds(normalizedIds)

    const normalizedParam = normalizedIds.join(',')
    if (normalizedIds.length && idsParam !== normalizedParam) {
      setSearchParams({ ids: normalizedParam }, { replace: true })
    } else if (!normalizedIds.length && idsParam) {
      setSearchParams({}, { replace: true })
    }
  }, [idsParam, setSearchParams])

  useEffect(() => {
    let ignore = false

    if (compareIds.length < 2) {
      setComparison(null)
      setError('')
      setLoading(false)
      return undefined
    }

    const loadComparison = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await equipmentService.compare(compareIds)
        if (ignore) return

        const normalizedIds = setComparedEquipmentIds(
          Array.isArray(data?.items) ? data.items.map((item) => item.id) : compareIds
        )
        const normalizedKey = normalizedIds.join(',')

        if (normalizedKey !== compareIds.join(',')) {
          setCompareIds(normalizedIds)
        }

        if (normalizedIds.length && idsParam !== normalizedKey) {
          setSearchParams({ ids: normalizedKey }, { replace: true })
        }
        setComparison(data)
      } catch (loadError) {
        if (!ignore) {
          setComparison(null)
          setError(getErrorMessage(loadError, 'Unable to load the equipment comparison right now.'))
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadComparison()
    return () => {
      ignore = true
    }
  }, [compareIds, idsParam, setSearchParams])

  const browsePath = getBrowsePath(user?.role)
  const items = useMemo(
    () => (Array.isArray(comparison?.items) ? comparison.items : []),
    [comparison]
  )
  const verifiedCount = items.filter((item) => item.owner_verified).length
  const availableCount = items.filter((item) => item.is_available !== false).length
  const cheapestItem = useMemo(() => {
    if (!items.length) return null
    return [...items].sort((left, right) => Number(left.daily_rate || 0) - Number(right.daily_rate || 0))[0]
  }, [items])
  const comparisonRows = [
    {
      label: 'Daily rate',
      render: (item) => `$${Number(item.daily_rate || 0).toLocaleString()} / day`
    },
    {
      label: 'Category',
      render: (item) => item.category || 'Not specified'
    },
    {
      label: 'Condition',
      render: (item) => item.condition || 'Not specified'
    },
    {
      label: 'Location',
      render: (item) => item.location || 'Not specified'
    },
    {
      label: 'Availability',
      render: (item) => item.is_available !== false ? 'Available now' : 'Unavailable'
    },
    {
      label: 'Owner',
      render: (item) => item.owner_name || 'Member'
    },
    {
      label: 'Verified owner',
      render: (item) => item.owner_verified ? 'Yes' : 'No'
    },
    {
      label: 'Specs',
      render: (item) => {
        const specs = Array.isArray(item.specs) ? item.specs : []
        if (!specs.length) {
          return <span className="subtitle">No specs listed</span>
        }

        return (
          <ul className="compare-spec-list">
            {specs.slice(0, 6).map((spec) => <li key={`${item.id}-${spec}`}>{spec}</li>)}
          </ul>
        )
      }
    }
  ]
  const stats = [
    { value: compareIds.length, label: 'Selected listings' },
    { value: cheapestItem ? `$${Number(cheapestItem.daily_rate || 0).toLocaleString()}` : '--', label: 'Lowest daily rate' },
    { value: availableCount, label: 'Available now' },
    { value: verifiedCount, label: 'Verified owners' }
  ]

  const handleRemove = (equipmentId) => {
    const target = items.find((item) => item.id === equipmentId)
    const result = toggleComparedEquipment(equipmentId)
    setCompareIds(result.ids)

    if (result.ids.length) {
      setSearchParams({ ids: result.ids.join(',') }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }

    addToast(`${target?.name || 'Equipment'} removed from compare.`, 'info')
  }

  const handleClear = () => {
    clearComparedEquipment()
    setComparison(null)
    setCompareIds([])
    setSearchParams({}, { replace: true })
    addToast('Comparison shortlist cleared.', 'info')
  }

  if (loading && !comparison) return <Loader />

  return (
    <div className="container mx-auto space-y-8 py-6 sm:py-8">
      <PageHero
        eyebrow="Equipment Compare"
        title="Compare listings side by side"
        subtitle="Check price, condition, owner trust, and specs before you send the next booking request."
        className="portal-primary"
        stats={stats}
        aside={(
          <SmartImage
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1280&auto=format&fit=crop"
            fallbackSrc="/hero.svg"
            alt="Equipment comparison"
            className="page-hero-media"
          />
        )}
        actions={(
          <Link
            to={browsePath}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
          >
            Back to browse
          </Link>
        )}
      />

      <section className="space-y-6">
        <Card className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Comparison snapshot</p>
              <CardTitle className="text-xl">Shortlist confidence check</CardTitle>
            </div>
            <Columns2 size={20} strokeWidth={2.1} aria-hidden="true" className="text-slate-600" />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary-700 shadow-sm">
                <ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-950">{verifiedCount}</p>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Verified owners</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary-700 shadow-sm">
                <MapPin size={18} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-950">{availableCount}</p>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Available now</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary-700 shadow-sm">
                <Columns2 size={18} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-950">{items.length}</p>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Listings on board</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-slate-900">{error}</span>
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setError('')}>
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {compareIds.length < 2 ? (
          <EmptyState
            eyebrow="Not enough listings selected"
            title="Choose at least two listings"
            message="Add equipment from browse or search pages to compare price, availability, and owner trust side by side."
            actions={[
              { to: browsePath, label: 'Open Browse', className: 'button gradient' }
            ]}
          />
        ) : (
          <>
            <Card className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Active board</p>
                  <CardTitle className="text-xl">
                    {compareIds.length} listing{compareIds.length === 1 ? '' : 's'} ready
                  </CardTitle>
                  <p className="text-sm leading-6 text-slate-600">
                    Keep the board focused by comparing only the strongest options for this rental decision.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={handleClear}>
                    Clear shortlist
                  </Button>
                  <Link
                    to={browsePath}
                    className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'rounded-full')}
                  >
                    Add more listings
                  </Link>
                </div>
              </CardHeader>
            </Card>

            <Card className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
              <CardContent className="overflow-x-auto p-0">
                <table className="min-w-[820px] w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/60">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Field
                      </th>
                      {items.map((item) => (
                        <th key={item.id} className="px-4 py-3 text-left align-top">
                          <div className="grid gap-3">
                            <SmartImage
                              src={getEquipmentImage(item)}
                              fallbackSrc="/tractor.svg"
                              alt={item.name || 'Equipment'}
                              className="h-28 w-full rounded-2xl border border-white/70 object-cover shadow-md shadow-slate-200/60"
                              labelForFallback={item.name || 'Equipment'}
                            />
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                {item.category || 'Equipment'}
                              </p>
                              <p className="text-base font-semibold text-slate-950">{item.name}</p>
                              <p className="text-sm text-slate-600">{item.owner_name || 'Member'}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Link
                                to={getDetailsPath(user?.role, item.id)}
                                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
                              >
                                Details
                              </Link>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="rounded-full"
                                onClick={() => handleRemove(item.id)}
                              >
                                <Trash2 size={14} strokeWidth={2.1} aria-hidden="true" />
                                <span>Remove</span>
                              </Button>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr key={row.label} className="border-b border-slate-100 last:border-0">
                        <th
                          scope="row"
                          className="w-[220px] px-4 py-3 align-top text-sm font-semibold text-slate-950"
                        >
                          {row.label}
                        </th>
                        {items.map((item) => (
                          <td key={`${item.id}-${row.label}`} className="px-4 py-3 align-top text-sm text-slate-700">
                            {row.render(item)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </div>
  )
}
