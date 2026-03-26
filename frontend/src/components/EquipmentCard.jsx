import React from 'react';
import { Link } from 'react-router-dom';
import { getEquipmentImage } from '../utils/equipmentImages.js';
import { StarRatingDisplay } from './StarRating.jsx';
import { MapPin, Edit } from 'lucide-react';
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
          <StarRatingDisplay rating={rating} size={14} showValue={true} reviewCount={reviewCount} />
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
          <MapPin size={14} className="location-icon" /> {equipment.location || 'Location not specified'}
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

        <div className="equipment-footer" style={{ gap: '8px', flexWrap: 'wrap' }}>
          <div className="equipment-price" style={{ marginRight: 'auto' }}>
            <strong>${Number(rate).toLocaleString()}</strong>
            <span>/day</span>
          </div>
          {user?.role === 'equipment_owner' && String(user?.id) === String(equipment.owner_id) && (
            <Link to={`/owner/equipment/${equipment.id}/edit`} className="button sm outline pill">
              <Edit size={14} /> Edit
            </Link>
          )}
          <Link to={detailsPath} className="button sm gradient pill">
            Details
          </Link>
        </div>
      </div>
    </article>
  );
}
