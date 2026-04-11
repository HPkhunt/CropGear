import React from 'react';
import { X } from 'lucide-react';

export default function BrowseActiveFilters({
  query,
  category,
  locationSearchActive,
  nearbyLabel,
  availableOnly,
  verifiedOnly,
  minRate,
  maxRate,
  favoritesOnly,
  onClearQuery,
  onClearCategory,
  onClearLocation,
  onClearAvailable,
  onClearVerified,
  onClearRates,
  onClearFavorites,
  onClearAll
}) {
  const hasFilters = query || category !== 'all' || availableOnly || verifiedOnly || minRate || maxRate || favoritesOnly || locationSearchActive;
  if (!hasFilters) return null;

  return (
    <div className="active-filters-row">
      {query && <div className="filter-tag">Search: {query} <span className="clear-icon" onClick={onClearQuery}><X size={14} strokeWidth={2.4} aria-hidden="true" /></span></div>}
      {category !== 'all' && <div className="filter-tag">Category: {category} <span className="clear-icon" onClick={onClearCategory}><X size={14} strokeWidth={2.4} aria-hidden="true" /></span></div>}
      {locationSearchActive && <div className="filter-tag">Near: {nearbyLabel} <span className="clear-icon" onClick={onClearLocation}><X size={14} strokeWidth={2.4} aria-hidden="true" /></span></div>}
      {availableOnly && <div className="filter-tag">Available Only <span className="clear-icon" onClick={onClearAvailable}><X size={14} strokeWidth={2.4} aria-hidden="true" /></span></div>}
      {verifiedOnly && <div className="filter-tag">Verified Only <span className="clear-icon" onClick={onClearVerified}><X size={14} strokeWidth={2.4} aria-hidden="true" /></span></div>}
      {(minRate || maxRate) && <div className="filter-tag">Rate: ${minRate || 0} - ${maxRate || 'max'} <span className="clear-icon" onClick={onClearRates}><X size={14} strokeWidth={2.4} aria-hidden="true" /></span></div>}
      {favoritesOnly && <div className="filter-tag">Favorites <span className="clear-icon" onClick={onClearFavorites}><X size={14} strokeWidth={2.4} aria-hidden="true" /></span></div>}
      <button type="button" className="button link sm" onClick={onClearAll}>Clear all</button>
    </div>
  );
}
