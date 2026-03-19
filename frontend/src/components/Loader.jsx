import React from 'react'

export default function Loader() {
  return (
    <div className="container page-wrap">
      <div className="card loader-card">
        <div className="spinner spinner-lg" />
        <p>Loading data...</p>
      </div>
    </div>
  )
}
