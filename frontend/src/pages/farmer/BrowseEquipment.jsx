import React, { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DashboardShell from '../../components/DashboardShell.jsx'
import PageSkeleton from '../../components/PageSkeleton.jsx'
import useToast from '@/hooks/useToast'
import useAuth from '../../hooks/useAuth.js'
import { resetApiBase } from '../../services/api.js'
import { equipmentService } from '../../services/equipmentService.js'
import { userService } from '../../services/userService.js'
import { buildComparePath, clearComparedEquipment, getComparedEquipmentIds } from '../../utils/compare.js'
import {
  FAVORITES_STORAGE_EVENT,
  clearFavoriteEquipment,
  getFavoriteEquipmentIds
} from '../../utils/favorites.js'
import { getErrorMessage } from '../../utils/helpers.js'
import {
  buildBrowseSearchParams,
  buildSavedSearchFilters,
  parseBrowseSearchParams
} from '../../utils/searchHistory.js'
import BrowseHeroSection from '../../components/browse/BrowseHeroSection.jsx'
import BrowseCommandHub from '../../components/browse/BrowseCommandHub.jsx'
import BrowseCompareToolbar from '../../components/browse/BrowseCompareToolbar.jsx'
import BrowseActiveFilters from '../../components/browse/BrowseActiveFilters.jsx'
import BrowseResultsSection from '../../components/browse/BrowseResultsSection.jsx'
import { farmerDashboardLinks } from '../../utils/dashboardLinks.js'

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'tractor', label: 'Tractors' },
  { value: 'harvester', label: 'Harvesters' },
  { value: 'seeder', label: 'Seeders' },
  { value: 'tillage', label: 'Tillage' },
  { value: 'irrigation', label: 'Irrigation' },
  { value: 'crop_care', label: 'Crop Care' }
]

const LOCATION_PRESETS = [
  { label: 'Des Moines, IA', latitude: 41.5868, longitude: -93.625, radiusKm: 40 },
  { label: 'Ames, IA', latitude: 42.0347, longitude: -93.62, radiusKm: 35 },
  { label: 'Iowa City, IA', latitude: 41.6611, longitude: -91.5302, radiusKm: 35 },
  { label: 'Cedar Rapids, IA', latitude: 41.9779, longitude: -91.6656, radiusKm: 40 }
]

function hasValidCoordinates(latitude, longitude) {
  if (latitude === '' || longitude === '') return false
  return Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
}

export default function BrowseEquipment() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const initial = parseBrowseSearchParams(location.search)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState(initial.query)
  const [category, setCategory] = useState(initial.category)
  const [sort, setSort] = useState(initial.sort)
  const [availableOnly, setAvailableOnly] = useState(initial.availableOnly)
  const [verifiedOnly, setVerifiedOnly] = useState(initial.verifiedOnly)
  const [minRate, setMinRate] = useState(initial.minRate)
  const [maxRate, setMaxRate] = useState(initial.maxRate)
  const [latitude, setLatitude] = useState(initial.latitude)
  const [longitude, setLongitude] = useState(initial.longitude)
  const [radiusKm, setRadiusKm] = useState(initial.radiusKm)
  const [locationLabel, setLocationLabel] = useState(initial.locationLabel)
  const [draftLatitude, setDraftLatitude] = useState(initial.latitude)
  const [draftLongitude, setDraftLongitude] = useState(initial.longitude)
  const [draftRadiusKm, setDraftRadiusKm] = useState(initial.radiusKm || '50')
  const [draftLocationLabel, setDraftLocationLabel] = useState(initial.locationLabel)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState([])
  const [compareIds, setCompareIds] = useState([])
  const [savingSearch, setSavingSearch] = useState(false)

  const locationSearchActive = hasValidCoordinates(latitude, longitude)
  const compareReady = compareIds.length >= 2
  const comparePath = buildComparePath(compareIds)
  const visible = favoritesOnly ? items.filter((item) => favoriteIds.includes(String(item.id))) : items
  const nearbyLabel = locationLabel.trim() || `${latitude}, ${longitude}`
  const averageRate = visible.length ? Math.round(visible.reduce((sum, item) => sum + Number(item.daily_rate || 0), 0) / visible.length) : 0
  const stats = [
    { value: total, label: locationSearchActive ? 'Nearby listings' : 'Total listings' },
    { value: `$${averageRate}`, label: 'Avg daily rate' },
    { value: visible.filter((item) => item.owner_verified).length, label: 'Verified owners' },
    { value: visible.filter((item) => item.is_available !== false).length, label: 'Available now' }
  ]
  const fetchData = useCallback(async ({ asRefresh = false, nextPage = page } = {}) => {
    asRefresh ? setRefreshing(true) : setLoading(true)
    setError('')
    try {
      let result
      if (hasValidCoordinates(latitude, longitude)) {
        const nearby = await equipmentService.locationSearch({
          query: q,
          category,
          latitude,
          longitude,
          radiusKm: radiusKm || 50,
          minPrice: minRate ? Number(minRate) : 0,
          maxPrice: maxRate ? Number(maxRate) : 1000000,
          availableOnly,
          verifiedOnly
        })
        result = { items: nearby.items, total: nearby.count, totalPages: 1 }
      } else {
        result = await equipmentService.browse({
          q,
          category,
          sort,
          available_only: availableOnly,
          owner_verified_only: verifiedOnly,
          min_rate: minRate ? Number(minRate) : 0,
          max_rate: maxRate ? Number(maxRate) : 1000000,
          page: nextPage,
          page_size: 12,
          _ts: Date.now()
        })
      }
      setItems(result.items || [])
      setTotal(Number(result.total || 0))
      setTotalPages(Number(result.totalPages || 1))
    } catch {
      setItems([])
      setTotal(0)
      setTotalPages(1)
      setError('Unable to load equipment right now. Please refresh listings.')
    } finally {
      asRefresh ? setRefreshing(false) : setLoading(false)
    }
  }, [availableOnly, category, latitude, longitude, maxRate, minRate, page, q, radiusKm, sort, verifiedOnly])

  useEffect(() => {
    const next = parseBrowseSearchParams(location.search)
    setQ(next.query)
    setCategory(next.category)
    setSort(next.sort)
    setAvailableOnly(next.availableOnly)
    setVerifiedOnly(next.verifiedOnly)
    setMinRate(next.minRate)
    setMaxRate(next.maxRate)
    setLatitude(next.latitude)
    setLongitude(next.longitude)
    setRadiusKm(next.radiusKm)
    setLocationLabel(next.locationLabel)
    setDraftLatitude(next.latitude)
    setDraftLongitude(next.longitude)
    setDraftRadiusKm(next.radiusKm || '50')
    setDraftLocationLabel(next.locationLabel)
    setPage(1)
  }, [location.search])

  useEffect(() => {
    fetchData()
    setCompareIds(getComparedEquipmentIds())
  }, [fetchData])

  useEffect(() => {
    const syncFavorites = () => setFavoriteIds(getFavoriteEquipmentIds())
    syncFavorites()
    if (typeof window === 'undefined') return undefined
    window.addEventListener(FAVORITES_STORAGE_EVENT, syncFavorites)
    return () => window.removeEventListener(FAVORITES_STORAGE_EVENT, syncFavorites)
  }, [])

  useEffect(() => {
    const nextSearch = buildBrowseSearchParams({
      query: q,
      category,
      sort,
      availableOnly,
      verifiedOnly,
      minRate,
      maxRate,
      latitude,
      longitude,
      radiusKm,
      locationLabel
    }).toString()
    if (nextSearch !== location.search.replace(/^\?/, '')) {
      navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true })
    }
  }, [availableOnly, category, latitude, location.pathname, location.search, locationLabel, longitude, maxRate, minRate, navigate, q, radiusKm, sort, verifiedOnly])
  const saveCurrentSearch = async () => {
    if (!user?.id) {
      addToast('Sign in to save searches across sessions.', 'info')
      return
    }

    const filters = buildSavedSearchFilters({
      sort,
      availableOnly,
      verifiedOnly,
      minRate,
      maxRate,
      latitude,
      longitude,
      radiusKm,
      locationLabel
    })
    if (!q.trim() && category === 'all' && !Object.keys(filters).length) {
      addToast('Add a keyword or filter before saving.', 'info')
      return
    }

    setSavingSearch(true)
    try {
      await equipmentService.saveSearchHistory({
        query: q.trim(),
        category,
        resultsCount: total,
        filters
      })
      addToast('Search saved to your recent history.', 'success')
    } catch (error) {
      addToast(getErrorMessage(error, 'Unable to save this search right now.'), 'error')
    } finally {
      setSavingSearch(false)
    }
  }

  const applyLocationFilters = () => {
    const nextLatitude = draftLatitude.trim()
    const nextLongitude = draftLongitude.trim()
    const nextRadius = draftRadiusKm.trim() || '50'
    const nextLabel = draftLocationLabel.trim()

    if (!nextLatitude && !nextLongitude) {
      setLatitude('')
      setLongitude('')
      setRadiusKm('')
      setLocationLabel('')
      setPage(1)
      return
    }

    if (!hasValidCoordinates(nextLatitude, nextLongitude)) {
      addToast('Enter both latitude and longitude to run nearby search.', 'info')
      return
    }

    setLatitude(nextLatitude)
    setLongitude(nextLongitude)
    setRadiusKm(nextRadius)
    setLocationLabel(nextLabel)
    setPage(1)
  }

  const applyLocationPreset = (preset) => {
    const nextLatitude = String(preset.latitude)
    const nextLongitude = String(preset.longitude)
    const nextRadius = String(preset.radiusKm)
    setDraftLatitude(nextLatitude)
    setDraftLongitude(nextLongitude)
    setDraftRadiusKm(nextRadius)
    setDraftLocationLabel(preset.label)
    setLatitude(nextLatitude)
    setLongitude(nextLongitude)
    setRadiusKm(nextRadius)
    setLocationLabel(preset.label)
    setPage(1)
  }

  const clearLocationFilters = () => {
    setDraftLatitude('')
    setDraftLongitude('')
    setDraftRadiusKm('50')
    setDraftLocationLabel('')
    setLatitude('')
    setLongitude('')
    setRadiusKm('')
    setLocationLabel('')
    setPage(1)
  }

  const clearAllFilters = () => {
    setQ('')
    setCategory('all')
    setSort('newest')
    setAvailableOnly(false)
    setVerifiedOnly(false)
    setMinRate('')
    setMaxRate('')
    setFavoritesOnly(false)
    clearLocationFilters()
  }

  const clearSavedFavorites = async () => {
    try {
      if (user?.id) await userService.replaceFavoriteEquipmentIds([])
      clearFavoriteEquipment()
      setFavoritesOnly(false)
      addToast('Saved equipment cleared.', 'info')
    } catch (error) {
      addToast(getErrorMessage(error, 'Unable to clear saved equipment right now.'), 'error')
    }
  }

  if (loading) return <PageSkeleton variant="dashboard" />

  return (
    <div className="container page-wrap">
      <DashboardShell title="Farmer Panel" subtitle="Discovery center" links={farmerDashboardLinks}>
        <BrowseHeroSection stats={stats} />

        <section className="page-main browse-page-main">
            <BrowseCommandHub
              locationSearchActive={locationSearchActive}
              total={total}
              nearbyLabel={nearbyLabel}
              favoritesOnly={favoritesOnly}
              onToggleFavorites={() => setFavoritesOnly((value) => !value)}
              refreshing={refreshing}
              onRefresh={() => fetchData({ asRefresh: true })}
              categoryOptions={CATEGORY_OPTIONS}
              category={category}
              onCategoryChange={(value) => { setCategory(value); setPage(1) }}
              query={q}
              onQueryChange={(value) => { setQ(value); setPage(1) }}
              sort={sort}
              onSortChange={(value) => { setSort(value); setPage(1) }}
              minRate={minRate}
              maxRate={maxRate}
              onMinRateChange={(value) => { setMinRate(value); setPage(1) }}
              onMaxRateChange={(value) => { setMaxRate(value); setPage(1) }}
              availableOnly={availableOnly}
              verifiedOnly={verifiedOnly}
              onToggleAvailable={() => { setAvailableOnly((value) => !value); setPage(1) }}
              onToggleVerified={() => { setVerifiedOnly((value) => !value); setPage(1) }}
              favoriteIdsCount={favoriteIds.length}
              onClearSavedFavorites={clearSavedFavorites}
              savingSearch={savingSearch}
              canSaveSearch={Boolean(q.trim() || category !== 'all' || sort !== 'newest' || availableOnly || verifiedOnly || minRate || maxRate || locationSearchActive)}
              onSaveSearch={saveCurrentSearch}
              onTrustedTopRated={() => { setVerifiedOnly(true); setSort('rating'); setPage(1) }}
              onAvailableBudgetFirst={() => { setAvailableOnly(true); setSort('price_low'); setPage(1) }}
              draftLatitude={draftLatitude}
              draftLongitude={draftLongitude}
              draftRadiusKm={draftRadiusKm}
              draftLocationLabel={draftLocationLabel}
              onDraftLatitudeChange={setDraftLatitude}
              onDraftLongitudeChange={setDraftLongitude}
              onDraftRadiusKmChange={setDraftRadiusKm}
              onDraftLocationLabelChange={setDraftLocationLabel}
              onApplyLocationFilters={applyLocationFilters}
              onClearLocationFilters={clearLocationFilters}
              locationPresets={LOCATION_PRESETS}
              locationLabel={locationLabel}
              onApplyLocationPreset={applyLocationPreset}
            />

            <BrowseCompareToolbar
              count={compareIds.length}
              compareReady={compareReady}
              onCompare={() => navigate(comparePath)}
              onClear={() => { clearComparedEquipment(); setCompareIds([]); addToast('Comparison shortlist cleared.', 'info') }}
            />

            <BrowseActiveFilters
              query={q}
              category={category}
              locationSearchActive={locationSearchActive}
              nearbyLabel={nearbyLabel}
              availableOnly={availableOnly}
              verifiedOnly={verifiedOnly}
              minRate={minRate}
              maxRate={maxRate}
              favoritesOnly={favoritesOnly}
              onClearQuery={() => setQ('')}
              onClearCategory={() => setCategory('all')}
              onClearLocation={clearLocationFilters}
              onClearAvailable={() => setAvailableOnly(false)}
              onClearVerified={() => setVerifiedOnly(false)}
              onClearRates={() => { setMinRate(''); setMaxRate('') }}
              onClearFavorites={() => setFavoritesOnly(false)}
              onClearAll={clearAllFilters}
            />

            <BrowseResultsSection
              error={error}
              onReconnect={async () => { resetApiBase(); await fetchData({ asRefresh: true }) }}
              visible={visible}
              onResetAll={clearAllFilters}
              compareIds={compareIds}
              onFavoriteChange={(ids) => setFavoriteIds(ids)}
              onCompareChange={(item, result) => {
                setCompareIds(result.ids)
                if (result.error) addToast(result.error, 'info')
                else addToast(result.active ? `${item.name || 'Equipment'} added to compare.` : `${item.name || 'Equipment'} removed from compare.`, result.active ? 'success' : 'info')
              }}
              totalPages={totalPages}
              page={page}
              onPreviousPage={() => { setPage((value) => Math.max(value - 1, 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              onNextPage={() => { setPage((value) => Math.min(value + 1, totalPages)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            />
        </section>
      </DashboardShell>
    </div>
  )
}
