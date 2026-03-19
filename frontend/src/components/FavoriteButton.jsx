import React, { useState, useEffect } from 'react';
import { isFavoriteEquipment, toggleFavoriteEquipment } from '../utils/favorites.js';

export default function FavoriteButton({ equipmentId, onFavoriteChange }) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    setIsFavorite(isFavoriteEquipment(equipmentId));
  }, [equipmentId]);

  const handleToggle = () => {
    const result = toggleFavoriteEquipment(equipmentId);
    setIsFavorite(result.active);
    if (onFavoriteChange) {
      onFavoriteChange(result.ids);
    }
  };

  return (
    <button
      type="button"
      className={`favorite-btn ${isFavorite ? 'active' : ''}`}
      onClick={handleToggle}
      aria-pressed={isFavorite}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="favorite-icon"
      >
        <path
          fillRule="evenodd"
          d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.007z"
          clipRule="evenodd"
        />
      </svg>
      <span>{isFavorite ? 'Saved' : 'Save'}</span>
    </button>
  );
}
