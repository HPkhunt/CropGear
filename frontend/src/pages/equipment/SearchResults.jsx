import React, { useEffect, useState } from 'react'
import { ClipboardList, Search, FileText, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { equipmentService } from '../../services/equipmentService.js'
import EquipmentCard from '../../components/EquipmentCard.jsx'
import Loader from '../../components/Loader.jsx'
import PageHero from '../../components/PageHero.jsx'
import { getFavoriteEquipmentIds } from '../../utils/favorites.js'
import SmartImage from '../../components/SmartImage.jsx'

const PAGE_SIZE = 12

export default function SearchResults() {
  const [params] = useSearchParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState([])
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const query = params.get('q') || ''

    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await equipmentService.search(query)
        setItems(data)
        setCurrentPage(1) // reset to page 1 on new search
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    setFavoriteIds(getFavoriteEquipmentIds())
  }, [params])

  const query = params.get('q') || ''
  const filtered = favoritesOnly ? items.filter((item) => favoriteIds.includes(String(item.id))) : items

  // Pagination logic
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

  if (loading) return <Loader />

  return (
    <div className="container page-wrap">
      <PageHero
        eyebrow="Marketplace Search"
        title={`Discovering results for "${query}"`}
        subtitle="We've analyzed our global inventory to find the perfect machinery for your search criteria."
        className="portal-primary"
        stats={stats}
        aside={
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
        }
        actions={<Link className="button outline pill" to="/browse-equipment">View All Listings</Link>}
      />

      <section className="page-split">
        <div className="page-main">
          {visible.length ? (
            <>
              <section className="feature-grid">
                {visible.map((item) => (
                  <EquipmentCard
                    key={item.id}
                    equipment={item}
                    onFavoriteChange={(ids) => setFavoriteIds(ids)}
                  />
                ))}
              </section>

              {totalPages > 1 && (
                <section className="pagination-wrapper">
                  <div className="pagination-content">
                    <span className="page-indicator">Page <strong>{safePage}</strong> of {totalPages}</span>
                    <div className="pagination-btns">
                      <button
                        type="button"
                        className="button outline sm pill"
                        disabled={safePage <= 1}
                        onClick={() => { setCurrentPage((p) => Math.max(p - 1, 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      >
                        <ChevronLeft size={16} /> Prev
                      </button>
                      <button
                        type="button"
                        className="button outline sm pill"
                        disabled={safePage >= totalPages}
                        onClick={() => { setCurrentPage((p) => Math.min(p + 1, totalPages)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </>
          ) : (
            <section className="card empty-state">
              <h3>No matching equipment</h3>
              <p className="subtitle">Try a different keyword such as tractor, harvester, or seeder.</p>
            </section>
          )}
        </div>

        <aside className="page-side">
          <section className="card">
            <h3>Search Insights</h3>
            <div className="panel-list-premium">
              <div className="insight-stat-row">
                <div className="stat-icon-wrap"><Search size={18} /></div>
                <div className="stat-info-wrap">
                  <strong>{query || 'All'}</strong>
                  <span>Search query</span>
                </div>
              </div>
              <div className="insight-stat-row">
                <div className="stat-icon-wrap"><ClipboardList size={18} /></div>
                <div className="stat-info-wrap">
                  <strong>{totalItems}</strong>
                  <span>Total matches</span>
                </div>
              </div>
              <div className="insight-stat-row">
                <div className="stat-icon-wrap"><FileText size={18} /></div>
                <div className="stat-info-wrap">
                  <strong>{visible.length}</strong>
                  <span>Shown on page</span>
                </div>
              </div>
              <div className="insight-stat-row">
                <div className="stat-icon-wrap"><Star size={18} /></div>
                <div className="stat-info-wrap">
                  <strong>{favoriteIds.length}</strong>
                  <span>Saved equipment</span>
                </div>
              </div>
            </div>
            <p className="panel-note">Save favorites to compare listings later.</p>
          </section>

          <section className="card">
            <h3>Refine Results</h3>
            <p className="subtitle">Toggle favorites-only view or return to browse.</p>
            <div className="button-row">
              <button className={`button sm pill hover-lift ${favoritesOnly ? 'accent' : 'outline'}`} onClick={() => { setFavoritesOnly((v) => !v); setCurrentPage(1) }}>
                {favoritesOnly ? 'Showing Saved' : 'Saved Only'}
              </button>
              <Link className="button sm secondary pill hover-lift" to="/browse-equipment">Open Browse</Link>
            </div>
          </section>
        </aside>
      </section>
    </div>
  )
}
