import React, { useEffect, useState } from 'react';
import { BookmarkPlus, ChevronDown, MapPin, RefreshCw, Search, Star } from 'lucide-react';
import { CategoryIcon } from '../AppIcons.jsx';

export default function BrowseCommandHub({
  locationSearchActive,
  total,
  nearbyLabel,
  favoritesOnly,
  onToggleFavorites,
  refreshing,
  onRefresh,
  categoryOptions,
  category,
  onCategoryChange,
  query,
  onQueryChange,
  sort,
  onSortChange,
  minRate,
  maxRate,
  onMinRateChange,
  onMaxRateChange,
  availableOnly,
  verifiedOnly,
  onToggleAvailable,
  onToggleVerified,
  favoriteIdsCount,
  onClearSavedFavorites,
  savingSearch,
  canSaveSearch,
  onSaveSearch,
  onTrustedTopRated,
  onAvailableBudgetFirst,
  draftLatitude,
  draftLongitude,
  draftRadiusKm,
  draftLocationLabel,
  onDraftLatitudeChange,
  onDraftLongitudeChange,
  onDraftRadiusKmChange,
  onDraftLocationLabelChange,
  onApplyLocationFilters,
  onClearLocationFilters,
  locationPresets,
  locationLabel,
  onApplyLocationPreset
}) {
  const [showNearbySearch, setShowNearbySearch] = useState(locationSearchActive)

  useEffect(() => {
    if (locationSearchActive) setShowNearbySearch(true)
  }, [locationSearchActive])

  return (
    <section className="card filter-command-hub filter-command-hub--compact">
      <header className="hub-header">
        <div className="hub-copy">
          <h3>Command Center</h3>
          <p className="summary-text">{locationSearchActive ? `Discover ${total} listings near ${nearbyLabel}` : `Discover ${total} listings matched to your filters`}</p>
        </div>
        <div className="hub-actions">
          <button type="button" className={`button sm pill ${favoritesOnly ? 'accent' : 'outline'}`} onClick={onToggleFavorites}>
            <Star size={14} fill={favoritesOnly ? 'currentColor' : 'none'} strokeWidth={2} aria-hidden="true" />
            <span>{favoritesOnly ? 'Showing Saved' : 'Show Saved'}</span>
          </button>
          <button type="button" className="button sm pill outline" onClick={onSaveSearch} disabled={!canSaveSearch || savingSearch}>
            <BookmarkPlus size={14} strokeWidth={2} aria-hidden="true" />
            <span>{savingSearch ? 'Saving...' : 'Save Search'}</span>
          </button>
          <button type="button" className="button sm pill secondary" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? 'button-icon-spin' : ''} size={14} strokeWidth={2.1} aria-hidden="true" />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      <div className="category-scroller">
        {categoryOptions.map((option) => (
          <button key={option.value} type="button" className={`cat-chip ${category === option.value ? 'active' : ''}`} onClick={() => onCategoryChange(option.value)}>
            <span className="cat-emoji"><CategoryIcon category={option.value} size={16} strokeWidth={2} /></span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      <div className="search-bar-premium">
        <div className="search-input-group">
          <span className="search-icon"><Search size={16} strokeWidth={2.1} aria-hidden="true" /></span>
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search by equipment name or type..." />
        </div>
        <div className="filter-select-group">
          <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
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
            <input type="number" min="0" value={minRate} onChange={(event) => onMinRateChange(event.target.value)} placeholder="Min" />
            <span>-</span>
            <input type="number" min="0" value={maxRate} onChange={(event) => onMaxRateChange(event.target.value)} placeholder="Max" />
          </div>
        </div>
        <div className="toggle-group">
          <button type="button" className={`toggle-btn ${availableOnly ? 'active' : ''}`} onClick={onToggleAvailable}><span className="dot"></span> Available</button>
          <button type="button" className={`toggle-btn ${verifiedOnly ? 'active' : ''}`} onClick={onToggleVerified}><span className="dot"></span> Verified</button>
        </div>
        <div className="hub-quick-actions">
          <button type="button" className="button sm outline pill" onClick={onTrustedTopRated}>Top Rated</button>
          <button type="button" className="button sm outline pill" onClick={onAvailableBudgetFirst}>Budget First</button>
          {favoriteIdsCount > 0 && <button type="button" className="button sm outline pill text-danger" onClick={onClearSavedFavorites}>Clear Saved</button>}
        </div>
      </div>

      <div className={`location-search-shell location-search-shell--compact ${showNearbySearch ? 'is-open' : ''}`}>
        <button type="button" className="location-search-toggle" onClick={() => setShowNearbySearch((value) => !value)}>
          <div className="location-search-toggle-copy">
            <p className="review-section-eyebrow">Nearby Search</p>
            <strong>{locationSearchActive ? `Active near ${nearbyLabel}` : 'Search by coordinates and radius'}</strong>
          </div>
          <span className="location-search-toggle-actions">
            {locationSearchActive && <span className="location-search-status"><MapPin size={14} strokeWidth={2.2} aria-hidden="true" /> <span>{nearbyLabel}</span></span>}
            <span className={`location-search-chevron ${showNearbySearch ? 'open' : ''}`} aria-hidden="true">
              <ChevronDown size={16} strokeWidth={2.1} />
            </span>
          </span>
        </button>

        {showNearbySearch && (
          <>
            <div className="location-search-grid">
              <label className="form-stack"><span>Latitude</span><input type="text" value={draftLatitude} onChange={(event) => onDraftLatitudeChange(event.target.value)} placeholder="41.5868" /></label>
              <label className="form-stack"><span>Longitude</span><input type="text" value={draftLongitude} onChange={(event) => onDraftLongitudeChange(event.target.value)} placeholder="-93.6250" /></label>
              <label className="form-stack"><span>Radius (km)</span><input type="number" min="1" value={draftRadiusKm} onChange={(event) => onDraftRadiusKmChange(event.target.value)} placeholder="50" /></label>
              <label className="form-stack"><span>Label</span><input type="text" value={draftLocationLabel} onChange={(event) => onDraftLocationLabelChange(event.target.value)} placeholder="Des Moines, IA" /></label>
            </div>
            <div className="location-search-actions">
              <button type="button" className="button sm secondary" onClick={onApplyLocationFilters}>Apply nearby</button>
              <button type="button" className="button sm outline" onClick={onClearLocationFilters}>Clear nearby</button>
            </div>
            <div className="location-preset-list">
              {locationPresets.map((preset) => (
                <button key={preset.label} type="button" className={`location-preset-chip ${locationLabel === preset.label ? 'active' : ''}`} onClick={() => onApplyLocationPreset(preset)}>
                  {preset.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
