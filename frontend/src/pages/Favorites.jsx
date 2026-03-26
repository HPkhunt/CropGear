import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Trash2, SearchX } from 'lucide-react'
import { equipmentService } from '../services/equipmentService.js'
import EquipmentCard from '../components/EquipmentCard.jsx'
import PageHero from '../components/PageHero.jsx'
import Loader from '../components/Loader.jsx'
import { getFavoriteEquipmentIds, clearFavoriteEquipment } from '../utils/favorites.js'

export default function Favorites() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [favoriteIds, setFavoriteIds] = useState([])

  useEffect(() => {
    const ids = getFavoriteEquipmentIds()
    setFavoriteIds(ids)

    if (!ids.length) {
      setLoading(false)
      return
    }

    const fetchFavoriteItems = async () => {
      try {
        const { items: allItems } = await equipmentService.browse({ page_size: 100 })
        const favItems = allItems.filter(item => ids.includes(String(item.id)))
        setItems(favItems)
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchFavoriteItems()
  }, [])

  const handleFavoriteChange = (newIds) => {
    setFavoriteIds(newIds)
    setItems(prev => prev.filter(item => newIds.includes(String(item.id))))
  }

  const handleClearAll = () => {
    clearFavoriteEquipment()
    setFavoriteIds([])
    setItems([])
  }

  const stats = [
    { value: favoriteIds.length, label: 'Saved items' },
    { value: items.length, label: 'Loaded' },
  ]

  if (loading) return <Loader />

  return (
    <div className="container page-wrap">
      <PageHero
        eyebrow="My Collection"
        title="Saved Equipment"
        subtitle="Equipment you've saved for quick access. Compare specs, check pricing, and book directly from your wishlist."
        className="portal-primary"
        stats={stats}
        actions={
          favoriteIds.length > 0 && (
            <button className="button sm outline pill" onClick={handleClearAll}>
              <Trash2 size={14} /> Clear All
            </button>
          )
        }
      />

      {items.length > 0 ? (
        <section className="feature-grid" style={{ marginTop: '2rem' }}>
          {items.map(item => (
            <EquipmentCard
              key={item.id}
              equipment={item}
              onFavoriteChange={handleFavoriteChange}
            />
          ))}
        </section>
      ) : (
        <section className="card empty-search-state" style={{ marginTop: '2rem', textAlign: 'center', padding: '4rem 2rem' }}>
          <div className="empty-icon"><Heart size={48} style={{ color: 'var(--muted)' }} /></div>
          <h3>No saved equipment yet</h3>
          <p className="subtitle">Browse our marketplace and tap the heart icon on equipment you'd like to save for later.</p>
          <Link to="/browse-equipment" className="button primary sm pill" style={{ marginTop: '1rem' }}>
            Browse Equipment
          </Link>
        </section>
      )}
    </div>
  )
}
