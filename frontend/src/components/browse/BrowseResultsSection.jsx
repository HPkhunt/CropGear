import React from 'react';
import { ArrowLeft, ArrowRight, SearchX } from 'lucide-react';
import EquipmentCard from '../EquipmentCard.jsx';

export default function BrowseResultsSection({
  error,
  onReconnect,
  visible,
  onResetAll,
  compareIds,
  onFavoriteChange,
  onCompareChange,
  totalPages,
  page,
  onPreviousPage,
  onNextPage
}) {
  return (
    <>
      {error && <section className="card"><p className="error-banner">{error}</p><div className="button-row"><button type="button" className="button sm secondary" onClick={onReconnect}>Reconnect API</button></div></section>}
      {!visible.length && <section className="card empty-search-state"><div className="empty-icon"><SearchX size={42} strokeWidth={1.8} aria-hidden="true" /></div><h3>No machines found</h3><p className="subtitle">Try broadening your filters or clearing the nearby radius.</p><button type="button" className="button primary sm pill" onClick={onResetAll}>Reset All Filters</button></section>}

      {visible.length > 0 && (
        <section className="feature-grid">
          {visible.map((item) => (
            <EquipmentCard
              key={item.id}
              equipment={item}
              onFavoriteChange={onFavoriteChange}
              showCompareAction
              compareActive={compareIds.includes(String(item.id))}
              onCompareChange={(result) => onCompareChange(item, result)}
            />
          ))}
        </section>
      )}

      {totalPages > 1 && (
        <section className="pagination-wrapper">
          <div className="pagination-content">
            <span className="page-indicator">Page <strong>{page}</strong> of {totalPages}</span>
            <div className="pagination-btns">
              <button type="button" className="button outline sm pill" disabled={page <= 1} onClick={onPreviousPage}><ArrowLeft size={14} strokeWidth={2.2} aria-hidden="true" /><span>Previous</span></button>
              <button type="button" className="button outline sm pill" disabled={page >= totalPages} onClick={onNextPage}><span>Next</span><ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" /></button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
