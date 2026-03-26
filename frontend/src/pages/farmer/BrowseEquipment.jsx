import React, { useEffect, useState } from 'react'
import { Tractor, Search, Droplets, Sprout, Wheat, FlaskConical, SearchX, DollarSign, ShieldCheck, CheckCircle, ChevronLeft, ChevronRight, RefreshCw, Star, BookmarkCheck } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { equipmentService } from '../../services/equipmentService.js'
import { resetApiBase } from '../../services/api.js'
import EquipmentCard from '../../components/EquipmentCard.jsx'
import PageSkeleton from '../../components/PageSkeleton.jsx'
import PageHero from '../../components/PageHero.jsx'
import DashboardShell from '../../components/DashboardShell.jsx'
import SmartImage from '../../components/SmartImage.jsx'
import { clearFavoriteEquipment, getFavoriteEquipmentIds } from '../../utils/favorites.js'

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories', Icon: Tractor },
  { value: 'tractor', label: 'Tractors', Icon: Tractor },
  { value: 'harvester', label: 'Harvesters', Icon: Wheat },
  { value: 'seeder', label: 'Sowing / Seeders', Icon: Sprout },
  { value: 'tillage', label: 'Tillage', Icon: Tractor },
  { value: 'irrigation', label: 'Irrigation', Icon: Droplets },
  { value: 'crop_care', label: 'Crop Care', Icon: FlaskConical }
]

const browseTips = [
  'Use verified-owner mode when finalizing urgent jobs.',
  'Set min/max rate before opening details to avoid decision noise.',
  'Save shortlists and compare owner quality before sending requests.'
]

export default function BrowseEquipment() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const location = useLocation();
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('newest')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [minRate, setMinRate] = useState('')
  const [maxRate, setMaxRate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      let result = await equipmentService.browse({
        q,
        category,
        sort,
        available_only: availableOnly,
        owner_verified_only: verifiedOnly,
        min_rate: minRate ? Number(minRate) : 0,
        max_rate: maxRate ? Number(maxRate) : 1000000,
        page,
        page_size: 12,
        _ts: Date.now()
      })

      const isDefaultBrowse =
        !q &&
        category === 'all' &&
        !availableOnly &&
        !verifiedOnly &&
        !minRate &&
        !maxRate &&
        page === 1

      if (isDefaultBrowse && (!result.items || result.items.length === 0)) {
        const fallbackItems = await equipmentService.list({ _ts: Date.now() })
        result = {
          items: fallbackItems,
          total: fallbackItems.length,
          totalPages: 1
        }
      }

      setItems(result.items)
      setTotalPages(result.totalPages)
      setTotal(result.total)
    } catch {
      setItems([])
      setTotal(0)
      setTotalPages(1)
      setError('Unable to load equipment right now. Please refresh listings.')
    } finally {
      if (asRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get('category');
    const query = params.get('q');
    if (cat) setCategory(cat);
    if (query) setQ(query);

    fetchData()
    setFavoriteIds(getFavoriteEquipmentIds())
  }, [location.search, sort, availableOnly, verifiedOnly, minRate, maxRate, page])

  // synchronize filters with URL whenever q or category changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (q) params.set('q', q);
    else params.delete('q');
    if (category && category !== 'all') params.set('category', category);
    else params.delete('category');
    const newSearch = params.toString();
    if (newSearch !== location.search.replace(/^\?/, '')) {
      window.history.replaceState(null, '', `${location.pathname}${newSearch ? '?' + newSearch : ''}`);
    }
  }, [q, category, location.pathname, location.search]);

  const visible = items.filter((item) => (favoritesOnly ? favoriteIds.includes(String(item.id)) : true))
  const summary = `${visible.length} shown | ${total} total`
  const averageRate = visible.length
    ? Math.round(visible.reduce((acc, item) => acc + Number(item.daily_rate || 0), 0) / visible.length)
    : 0
  const verifiedCount = visible.filter((item) => item.owner_verified).length
  const availableCount = visible.filter((item) => item.is_available !== false).length
  const stats = [
    { value: total, label: 'Total listings' },
    { value: `$${averageRate}`, label: 'Avg daily rate' },
    { value: verifiedCount, label: 'Verified owners' },
    { value: availableCount, label: 'Available now' }
  ]
  const sidebarLinks = [
    { to: '/farmer/dashboard', label: 'Dashboard' },
    { to: '/farmer/equipments', label: 'Browse Equipment' },
    { to: '/farmer/bookings', label: 'My Bookings' },
    { to: '/', label: 'Home' }
  ]

  if (loading) return <PageSkeleton variant="dashboard" />

  return (
    <div className="container page-wrap">
      <DashboardShell title="Farmer Panel" subtitle="Discovery center" links={sidebarLinks}>
        <PageHero
          eyebrow="Marketplace"
          title="Find the right equipment for your farm"
          subtitle="Explore our verified listings of tractors, harvesters, and more. Use advanced filters to narrow down your search."
          className="portal-primary"
          stats={stats}
          aside={
            <div className="hero-visual-wrapper">
              <SmartImage
                src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1920&auto=format&fit=crop"
                fallbackSrc="/hero.svg"
                alt="Equipment marketplace"
                className="page-hero-media"
              />
              <div className="hero-floating-card">
                <div className="card-mini-stat">
                  <span>98%</span>
                  <small>Success Rate</small>
                </div>
              </div>
            </div>
          }
        />

        <section>
          <div>
            <section className="card filter-command-hub">
              <header className="hub-header">
                <div>
                  <h3>Command Center</h3>
                  <p className="summary-text">Discover {total} premium listings matched to your needs</p>
                </div>
                <div className="hub-actions">
                  <button type="button" className={`button sm pill ${favoritesOnly ? 'accent' : 'outline'}`} onClick={() => setFavoritesOnly((v) => !v)}>
                    {favoritesOnly ? <><BookmarkCheck size={14} /> Showing Saved</> : <><Star size={14} /> Show Saved</>}
                  </button>
                  <button type="button" className="button sm pill secondary" onClick={() => fetchData(true)} disabled={refreshing}>
                    {refreshing ? 'Refreshing...' : <><RefreshCw size={14} /> Refresh</>}
                  </button>
                </div>
              </header>

              <div className="category-scroller">
                {CATEGORY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`cat-chip ${category === option.value ? 'active' : ''}`}
                    onClick={() => {
                      setPage(1)
                      setCategory(option.value)
                    }}
                  >
                    <span className="cat-emoji"><option.Icon size={16} /></span> {option.label}
                  </button>
                ))}
              </div>

              <div className="search-bar-premium">
                <div className="search-input-group">
                  <span className="search-icon"><Search size={16} /></span>
                  <input
                    value={q}
                    onChange={(e) => { setPage(1); setQ(e.target.value) }}
                    placeholder="Search by name, category, or location..."
                  />
                </div>
                <div className="filter-select-group">
                  <select value={sort} onChange={(e) => { setPage(1); setSort(e.target.value) }}>
                    <option value="newest">Newest First</option>
                    <option value="rating">Top Rated</option>
                    <option value="price_low">Price: Low - High</option>
                    <option value="price_high">Price: High - Low</option>
                  </select>
                </div>
              </div>

              <div className="advanced-filter-row">
                <div className="range-group">
                  <label>Daily Rate Range</label>
                  <div className="range-inputs">
                    <input type="number" min="0" value={minRate} onChange={(e) => { setPage(1); setMinRate(e.target.value) }} placeholder="Min" />
                    <span>-</span>
                    <input type="number" min="0" value={maxRate} onChange={(e) => { setPage(1); setMaxRate(e.target.value) }} placeholder="Max" />
                  </div>
                </div>

                <div className="toggle-group">
                  <button type="button" className={`toggle-btn ${availableOnly ? 'active' : ''}`} onClick={() => { setPage(1); setAvailableOnly((v) => !v) }}>
                    <span className="dot"></span> Available
                  </button>
                  <button type="button" className={`toggle-btn ${verifiedOnly ? 'active' : ''}`} onClick={() => { setPage(1); setVerifiedOnly((v) => !v) }}>
                    <span className="dot"></span> Verified
                  </button>
                </div>

                {favoriteIds.length > 0 && (
                  <button
                    type="button"
                    className="button sm outline text-danger"
                    onClick={() => {
                      clearFavoriteEquipment()
                      setFavoriteIds([])
                      setFavoritesOnly(false)
                    }}
                  >
                    Clear Saved
                  </button>
                )}
              </div>
            </section>

            {(q || category !== 'all' || availableOnly || verifiedOnly || minRate || maxRate || favoritesOnly) && (
              <div className="active-filters-row">
                {q && <div className="filter-tag">Search: {q} <span className="clear-icon" onClick={() => { setPage(1); setQ('') }}>×</span></div>}
                {category !== 'all' && <div className="filter-tag">Category: {category} <span className="clear-icon" onClick={() => { setPage(1); setCategory('all') }}>×</span></div>}
                {availableOnly && <div className="filter-tag">Available Only <span className="clear-icon" onClick={() => { setPage(1); setAvailableOnly(false) }}>×</span></div>}
                {verifiedOnly && <div className="filter-tag">Verified Only <span className="clear-icon" onClick={() => { setPage(1); setVerifiedOnly(false) }}>×</span></div>}
                {(minRate || maxRate) && <div className="filter-tag">Rate: ${minRate || 0} - ${maxRate || '∞'} <span className="clear-icon" onClick={() => { setPage(1); setMinRate(''); setMaxRate('') }}>×</span></div>}
                {favoritesOnly && <div className="filter-tag">Favorites <span className="clear-icon" onClick={() => { setPage(1); setFavoritesOnly(false) }}>×</span></div>}

                <button type="button" className="button link sm" onClick={() => {
                  setQ('')
                  setCategory('all')
                  setAvailableOnly(false)
                  setVerifiedOnly(false)
                  setMinRate('')
                  setMaxRate('')
                  setFavoritesOnly(false)
                  setPage(1)
                }}>Clear all</button>
              </div>
            )}

            <div className="grid-container-relative">
              <div className={`grid-refresh-overlay ${refreshing ? 'visible' : ''}`}>
                <div className="refresh-loader"></div>
              </div>
              <section className="feature-grid">
                {visible.map((item) => (
                  <EquipmentCard
                    key={item.id}
                    equipment={item}
                    onFavoriteChange={(ids) => setFavoriteIds(ids)}
                  />
                ))}
              </section>
            </div>

            <section className="pagination-wrapper">
              <div className="pagination-content">
                <span className="page-indicator">Page <strong>{page}</strong> of {totalPages}</span>
                <div className="pagination-btns">
                  <button
                    type="button"
                    className="button outline sm pill"
                    disabled={page <= 1}
                    onClick={() => { setPage((p) => Math.max(p - 1, 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <button
                    type="button"
                    className="button outline sm pill"
                    disabled={page >= totalPages}
                    onClick={() => { setPage((p) => Math.min(p + 1, totalPages)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </section>

            {error && (
              <section className="card">
                <p className="error-banner">{error}</p>
                <div className="button-row">
                  <button
                    type="button"
                    className="button sm secondary"
                    onClick={async () => {
                      resetApiBase()
                      await fetchData(true)
                    }}
                  >
                    Reconnect API
                  </button>
                </div>
              </section>
            )}

            {!visible.length && (
              <section className="card empty-search-state">
                <div className="empty-icon"><SearchX size={48} /></div>
                <h3>No machines found</h3>
                <p className="subtitle">We couldn't find any equipment matching your current filters. Try broadening your search or resetting categories.</p>
                <button
                  type="button"
                  className="button primary sm pill"
                  onClick={() => {
                    setQ('')
                    setCategory('all')
                    setMinRate('')
                    setMaxRate('')
                    setAvailableOnly(false)
                    setVerifiedOnly(false)
                  }}
                >
                  Reset All Filters
                </button>
              </section>
            )}
          </div>
        </section>
      </DashboardShell>
    </div>
  )
}
