import React, { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, ClipboardList, FileText, Search, Star } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { equipmentService } from '../../services/equipmentService.js'
import EquipmentCard from '../../components/EquipmentCard.jsx'
import Loader from '../../components/Loader.jsx'
import PageHero from '../../components/PageHero.jsx'
import SearchHistoryPanel from '../../components/SearchHistoryPanel.jsx'
import { FAVORITES_STORAGE_EVENT, getFavoriteEquipmentIds } from '../../utils/favorites.js'
import SmartImage from '../../components/SmartImage.jsx'
import { buildComparePath, clearComparedEquipment, getComparedEquipmentIds } from '../../utils/compare.js'
import { buildSearchHistoryParams, hasAdvancedSearchPreset } from '../../utils/searchHistory.js'
import useToast from '@/hooks/useToast'
import useAuth from '../../hooks/useAuth.js'
import { getErrorMessage } from '../../utils/helpers.js'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 12

export default function SearchResults() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [params] = useSearchParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState([])
  const [compareIds, setCompareIds] = useState([])
  const [searchHistory, setSearchHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [savingSearch, setSavingSearch] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const query = params.get('q') || ''
  const category = params.get('category') || ''
  const filtered = favoritesOnly ? items.filter((item) => favoriteIds.includes(String(item.id))) : items
  const compareReady = compareIds.length >= 2
  const comparePath = buildComparePath(compareIds)
  const browsePath = user?.role === 'farmer' ? '/farmer/equipments' : '/browse-equipment'
  const canSaveCurrentSearch = Boolean(user?.id && (query.trim() || category))

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await equipmentService.search({ query, category })
        setItems(data)
        setCurrentPage(1)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    setCompareIds(getComparedEquipmentIds())
  }, [category, query])

  useEffect(() => {
    const syncFavorites = () => {
      setFavoriteIds(getFavoriteEquipmentIds())
    }

    syncFavorites()
    if (typeof window === 'undefined') return undefined

    window.addEventListener(FAVORITES_STORAGE_EVENT, syncFavorites)
    return () => {
      window.removeEventListener(FAVORITES_STORAGE_EVENT, syncFavorites)
    }
  }, [])

  const loadSearchHistory = useCallback(async () => {
    if (!user?.id) {
      setSearchHistory([])
      return
    }

    setHistoryLoading(true)
    try {
      const history = await equipmentService.searchHistory()
      setSearchHistory(history)
    } catch {
      setSearchHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadSearchHistory()
  }, [loadSearchHistory])

  const totalItems = filtered.length
  const totalPages = Math.max(Math.ceil(totalItems / PAGE_SIZE), 1)
  const safePage = Math.min(Math.max(currentPage, 1), totalPages)
  const startIdx = (safePage - 1) * PAGE_SIZE
  const visible = filtered.slice(startIdx, startIdx + PAGE_SIZE)

  const stats = [
    { value: totalItems, label: 'Total matches' },
    { value: `${safePage}/${totalPages}`, label: 'Page' },
    { value: favoriteIds.length, label: 'Saved items' }
  ]

  const saveCurrentSearch = async () => {
    if (!user?.id) {
      addToast('Sign in to save searches across sessions.', 'info')
      return
    }

    const nextQuery = query.trim()
    if (!canSaveCurrentSearch) {
      addToast('Add a keyword or category before saving.', 'info')
      return
    }

    setSavingSearch(true)
    try {
      await equipmentService.saveSearchHistory({
        query: nextQuery,
        category,
        resultsCount: totalItems
      })
      addToast('Search saved to your recent history.', 'success')
      await loadSearchHistory()
    } catch (saveError) {
      addToast(getErrorMessage(saveError, 'Unable to save this search right now.'), 'error')
    } finally {
      setSavingSearch(false)
    }
  }

  const applyHistoryEntry = (entry) => {
    const nextParams = buildSearchHistoryParams(entry)
    const targetPath = hasAdvancedSearchPreset(entry) ? browsePath : '/search'

    setFavoritesOnly(false)
    setCurrentPage(1)
    navigate(`${targetPath}${nextParams.toString() ? `?${nextParams.toString()}` : ''}`)
  }

  if (loading) return <Loader />

  return (
    <div className="container mx-auto space-y-8 py-6 sm:py-8">
      <PageHero
        eyebrow="Marketplace Search"
        title={query ? `Discovering results for "${query}"` : category ? `Discovering ${category} results` : 'Discovering saved results'}
        subtitle="We've analyzed our global inventory to find the perfect machinery for your search criteria."
        className="portal-primary"
        stats={stats}
        aside={(
          <div className="hero-visual-wrapper">
            <SmartImage
              src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1920&auto=format&fit=crop"
              fallbackSrc="/hero.svg"
              alt="Search results"
              className="page-hero-media"
            />
            <div className="hero-floating-card">
              <div className="card-mini-stat">
                <span>{totalItems}</span>
                <small>Found</small>
              </div>
            </div>
          </div>
        )}
        actions={(
          <Link
            to="/browse-equipment"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full')}
          >
            View all listings
          </Link>
        )}
      />

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)] lg:items-start">
        <div className="space-y-6">
          {compareIds.length > 0 && (
            <Card className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Compare shortlist</p>
                  <CardTitle className="text-xl">
                    {compareIds.length} listing{compareIds.length === 1 ? '' : 's'} selected
                  </CardTitle>
                  <p className="text-sm leading-6 text-slate-600">
                    {compareReady
                      ? 'Your comparison board is ready to open.'
                      : 'Select one more listing to unlock side-by-side comparison.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-full"
                    disabled={!compareReady}
                    onClick={() => navigate(comparePath)}
                  >
                    Compare selected
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      clearComparedEquipment()
                      setCompareIds([])
                      addToast('Comparison shortlist cleared.', 'info')
                    }}
                  >
                    Clear compare
                  </Button>
                </div>
              </CardHeader>
            </Card>
          )}

          {visible.length ? (
            <>
              <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((item) => (
                  <EquipmentCard
                    key={item.id}
                    equipment={item}
                    onFavoriteChange={(ids) => setFavoriteIds(ids)}
                    showCompareAction
                    compareActive={compareIds.includes(String(item.id))}
                    onCompareChange={(result) => {
                      setCompareIds(result.ids)
                      if (result.error) {
                        addToast(result.error, 'info')
                      } else {
                        addToast(
                          result.active
                            ? `${item.name || 'Equipment'} added to compare.`
                            : `${item.name || 'Equipment'} removed from compare.`,
                          result.active ? 'success' : 'info'
                        )
                      }
                    }}
                  />
                ))}
              </section>

              {totalPages > 1 && (
                <Card className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-slate-600">
                      Page <strong className="text-slate-950">{safePage}</strong> of {totalPages}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        disabled={safePage <= 1}
                        onClick={() => {
                          setCurrentPage((pageValue) => Math.max(pageValue - 1, 1))
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                      >
                        <ArrowLeft size={14} strokeWidth={2.2} aria-hidden="true" />
                        <span>Prev</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        disabled={safePage >= totalPages}
                        onClick={() => {
                          setCurrentPage((pageValue) => Math.min(pageValue + 1, totalPages))
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                      >
                        <span>Next</span>
                        <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
              <CardContent className="space-y-2 p-6">
                <h3 className="text-lg font-semibold text-slate-950">No matching equipment</h3>
                <p className="text-sm leading-6 text-slate-600">
                  Try a different keyword such as tractor, harvester, or seeder.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">Search insights</CardTitle>
              <p className="text-sm text-slate-600">Quick context about the current results set.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary-700 shadow-sm">
                    <Search size={18} strokeWidth={2.1} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{query || 'All equipment'}</p>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Search query</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary-700 shadow-sm">
                    <ClipboardList size={18} strokeWidth={2.1} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{totalItems}</p>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Total matches</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary-700 shadow-sm">
                    <FileText size={18} strokeWidth={2.1} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{visible.length}</p>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Shown on page</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-accent-600 shadow-sm">
                    <Star size={18} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{favoriteIds.length}</p>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Saved equipment</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-600">Save favorites to compare listings later.</p>
            </CardContent>
          </Card>

          <SearchHistoryPanel
            history={searchHistory}
            loading={historyLoading}
            saving={savingSearch}
            canSave={canSaveCurrentSearch}
            onSave={saveCurrentSearch}
            onApply={applyHistoryEntry}
            showAuthPrompt={!user}
            emptyMessage="Save this search to reopen it quickly from the results view."
          />

          <Card className="border-white/70 bg-white/92 shadow-xl shadow-slate-200/60 backdrop-blur">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">Refine results</CardTitle>
              <p className="text-sm text-slate-600">Toggle favorites-only view, compare saved listings, or return to browse.</p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={favoritesOnly ? 'accent' : 'outline'}
                className="rounded-full"
                onClick={() => {
                  setFavoritesOnly((value) => !value)
                  setCurrentPage(1)
                }}
              >
                {favoritesOnly ? 'Showing saved' : 'Saved only'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={!compareReady}
                onClick={() => navigate(comparePath)}
              >
                Compare saved
              </Button>
              <Link
                to="/browse-equipment"
                className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'rounded-full')}
              >
                Open browse
              </Link>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  )
}
