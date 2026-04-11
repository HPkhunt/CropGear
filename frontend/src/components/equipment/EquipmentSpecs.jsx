import React from 'react'

export default function EquipmentSpecs({ specs = [] }) {
  return (
    <div>
      <h3>Specifications</h3>
      {specs.length > 0 ? (
        <ul className="feature-list">
          {specs.map((spec, index) => (
            <li key={`${spec}-${index}`}>
              <span>{spec}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="subtitle">No specifications listed for this equipment.</p>
      )}
    </div>
  )
}
