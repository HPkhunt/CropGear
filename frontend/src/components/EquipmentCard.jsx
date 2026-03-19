import React from 'react';
import { Link } from 'react-router-dom';
import { getEquipmentImage } from '../utils/equipmentImages.js';
import FavoriteButton from './FavoriteButton.jsx';
import SmartImage from './SmartImage.jsx';
import useAuth from '../hooks/useAuth.js';

const placeholderImage = '/tractor.svg';

export default function EquipmentCard({ equipment, onFavoriteChange }) {
  const { user } = useAuth();
  const availability = equipment.is_available !== false;
  const rating = equipment.rating?.toFixed ? equipment.rating.toFixed(1) : equipment.rating || 4.5;
  const reviewCount = equipment.reviews_count || 0;
  const rate = equipment.daily_rate || 0;

  const image = getEquipmentImage(equipment) || placeholderImage;
  const detailsPath = user?.role === 'farmer' ? `/farmer/equipment/${equipment.id}` : `/equipment/${equipment.id}`;

  return (
    <article className="card equipment-card image-card hover-lift">
      <div className="equipment-image-wrap">
        <SmartImage
          src={image}
          fallbackSrc={placeholderImage}
          alt={equipment.name || 'Equipment'}
          labelForFallback={equipment.name || 'CropGear equipment'}
          loading="lazy"
        />

        {equipment.owner_verified && (
          <div className="card-badge badge-verified">✓ Verified Owner</div>
        )}

        {Number(rating) >= 4.8 && (
          <div className="card-badge badge-featured">Top Rated</div>
        )}

        <div className="card-rating-float">
          <span className="star-icon" style={{ color: 'var(--accent)' }}>★</span>
          <span>{rating}</span>
        </div>

        <FavoriteButton equipmentId={equipment.id} onFavoriteChange={onFavoriteChange} />
        {!availability && (
          <div className="availability-overlay">
            <span>Unavailable</span>
          </div>
        )}
      </div>

      <div className="equipment-card-body">
        <div className="equipment-category-row">
          <span className="equipment-category">{equipment.category || 'equipment'}</span>
          <div className={`availability-dot ${availability ? 'active' : ''}`} title={availability ? 'Available' : 'Unavailable'}></div>
        </div>

        <h3>{equipment.name || 'Equipment'}</h3>
        <p className="subtitle">
          <span>📍</span> {equipment.location || 'Location not specified'}
        </p>

        <div className="equipment-meta-premium">
          <div className="meta-item">
            <span className="meta-label">Reviews</span>
            <span className="meta-val">{reviewCount}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Owner</span>
            <span className="meta-val">{equipment.owner_name?.split(' ')[0] || 'Member'}</span>
          </div>
        </div>

        <div className="equipment-footer">
          <div className="equipment-price">
            <strong>${Number(rate).toLocaleString()}</strong>
            <span>/day</span>
          </div>
          <Link to={detailsPath} className="button sm gradient pill">
            Details
          </Link>
        </div>
      </div>
    </article>
  );
}
