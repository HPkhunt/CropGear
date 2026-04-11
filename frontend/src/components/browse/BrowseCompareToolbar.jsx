import React from 'react';

export default function BrowseCompareToolbar({ count, compareReady, onCompare, onClear }) {
  if (count <= 0) return null;

  return (
    <section className="card compare-toolbar">
      <div>
        <p className="review-section-eyebrow">Compare Shortlist</p>
        <h3>{count} listing{count === 1 ? '' : 's'} selected</h3>
      </div>
      <div className="button-row">
        <button type="button" className="button sm secondary" disabled={!compareReady} onClick={onCompare}>Compare selected</button>
        <button type="button" className="button sm outline" onClick={onClear}>Clear compare</button>
      </div>
    </section>
  );
}
