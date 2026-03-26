import React from 'react'

export default function RatingBreakdown({ breakdown = {}, total = 0 }) {
  const maxCount = Math.max(...Object.values(breakdown).map(Number), 1)

  return (
    <div className="rating-breakdown">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = Number(breakdown[String(star)] || 0)
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={star} className="rating-breakdown-row">
            <span className="rating-breakdown-label">{star}★</span>
            <div className="rating-breakdown-bar-bg">
              <div
                className="rating-breakdown-bar-fill"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="rating-breakdown-count">{count}</span>
          </div>
        )
      })}
    </div>
  )
}
